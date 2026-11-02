require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt"); // Para encriptar contraseñas
const jwt = require("jsonwebtoken"); // Para crear los tokens

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET_KEY = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ==========================================
// RUTAS DE AUTENTICACIÓN (LOGIN Y REGISTRO)
// ==========================================

// 1. Endpoint de Registro
app.post("/api/registro", async (req, res) => {
  const { nombre, usuario, password } = req.body;

  try {
    // Encriptar la contraseña (el 10 es la "fuerza" del algoritmo)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Guardar en la base de datos
    await pool.execute(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, 'trabajador')",
      [nombre, usuario, hashedPassword]
    );

    res.status(201).json({ mensaje: "Usuario creado exitosamente" });
  } catch (error) {
    console.error("Error al registrar:", error);
    // Error 1062 es cuando el usuario ya existe (UNIQUE en MySQL)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ detail: "El nombre de usuario ya está en uso" });
    }
    res.status(400).json({ detail: "Hubo un error al crear la cuenta" });
  }
});

// 2. Endpoint de Login
app.post("/api/login", async (req, res) => {
  const { usuario, password } = req.body;

  try {
    // Buscar al usuario en la base de datos
    const [rows] = await pool.execute(
      "SELECT id_usuario, nombre, usuario, password_hash, rol FROM usuarios WHERE usuario = ?",
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ detail: "Usuario incorrecto" });
    }

    const dbUser = rows[0];

    // Verificar si la contraseña escrita coincide con la encriptada
    const passwordValida = await bcrypt.compare(password, dbUser.password_hash);
    
    if (!passwordValida) {
      return res.status(401).json({ detail: "Contraseña incorrecta" });
    }

    // Si todo está bien, generar el Token JWT
    const token = jwt.sign(
      { sub: dbUser.usuario, rol: dbUser.rol },
      SECRET_KEY,
      { expiresIn: "8h" } // El token dura 8 horas
    );

    // Mandar la credencial a React
    res.json({ 
      access_token: token, 
      token_type: "bearer", 
      nombre: dbUser.nombre 
    });

  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ detail: "Error del servidor al iniciar sesión" });
  }
});


// ==========================================
// TUS RUTAS ORIGINALES DEL PROYECTO
// ==========================================

// ==========================================
// MIDDLEWARE DE SEGURIDAD (Validar JWT)
// ==========================================
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(403).json({ mensaje: "Acceso denegado. Token requerido." });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ mensaje: "Token inválido o expirado." });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ mensaje: "Token inválido o expirado." });
    }

    req.usuario = decoded;
    next();
  });
};

// ==========================================
// MIDDLEWARE DE ROLES (Admin)
// ==========================================
const verificarRolAdmin = (req, res, next) => {
  if (req.usuario?.rol !== "admin") {
    return res.status(403).json({
      mensaje: "Acceso denegado. Se requieren permisos de Administrador.",
    });
  }
  next();
};

app.post("/api/cosechas", verificarToken, async (req, res) => {
  const { id_empleado, kilos_recolectados, fecha_recoleccion } = req.body;

  try {
    const [result] = await pool.execute(
      "INSERT INTO cosechas (id_cortador, kilos_recolectados, fecha_recoleccion) VALUES (?, ?, ?)",
      [id_empleado, kilos_recolectados, fecha_recoleccion]
    );

    res.status(201).json({
      mensaje: "Cosecha registrada correctamente",
      insertId: result.insertId,
    });
  } catch (error) {
    console.error("Error al registrar la cosecha:", error);
    res.status(500).json({
      mensaje: "Error al registrar la cosecha",
      error: error.message,
    });
  }
});

// GET: Historial de cosechas para la tabla y la actividad reciente
app.get("/api/cosechas", verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT c.id_cosecha, c.fecha_recoleccion, c.kilos_recolectados, emp.nombre_completo
      FROM cosechas c
      JOIN cortadores emp ON c.id_cortador = emp.id_cortador
      ORDER BY c.fecha_recoleccion DESC, c.id_cosecha DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener historial de cosechas:", error);
    res.status(500).json({
      mensaje: "Error al obtener historial",
      error: error.message,
    });
  }
});

// ==========================================
// MÓDULO DE NÓMINA (Transaccional)
// ==========================================
app.post("/api/nomina", verificarToken, verificarRolAdmin, async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.body;
  const esFechaValida = (fecha) => {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return false;
    }

    const fechaParseada = new Date(`${fecha}T00:00:00.000Z`);
    return !Number.isNaN(fechaParseada.getTime()) &&
      fechaParseada.toISOString().slice(0, 10) === fecha;
  };

  if (!esFechaValida(fecha_inicio) || !esFechaValida(fecha_fin) || fecha_inicio > fecha_fin) {
    return res.status(400).json({
      mensaje: "Proporciona un rango válido con fecha_inicio y fecha_fin en formato AAAA-MM-DD.",
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [configRow] = await connection.execute(
      "SELECT tarifa_kilo FROM configuracion LIMIT 1"
    );
    const tarifa = configRow.length > 0
      ? parseFloat(configRow[0].tarifa_kilo)
      : 4.50;

    const [cosechas] = await connection.execute(
      `SELECT id_cortador, SUM(kilos_recolectados) AS kilos_totales
       FROM cosechas
       WHERE fecha_recoleccion BETWEEN ? AND ?
       GROUP BY id_cortador`,
      [fecha_inicio, fecha_fin]
    );

    if (cosechas.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({
        mensaje: "No hay cosechas registradas en estas fechas.",
      });
    }

    const recibos_generados = [];

    for (const cosecha of cosechas) {
      const idCortador = cosecha.id_cortador;
      const kilos = parseFloat(cosecha.kilos_totales);
      const total_bruto = kilos * tarifa;
      let total_descuentos = 0;

      const [pagosPrevios] = await connection.execute(
        "SELECT id_pago FROM pagos WHERE id_cortador = ? AND fecha_inicio_semana = ? AND fecha_fin_semana = ?",
        [idCortador, fecha_inicio, fecha_fin]
      );

      if (pagosPrevios.length > 0) {
        continue;
      }

      const [prestamos] = await connection.execute(
        "SELECT id_prestamo, saldo_pendiente FROM prestamos WHERE id_cortador = ? AND saldo_pendiente > 0",
        [idCortador]
      );

      let bruto_restante = total_bruto;

      for (const prestamo of prestamos) {
        if (bruto_restante <= 0) {
          break;
        }

        const descuento_aplicar = Math.min(
          parseFloat(prestamo.saldo_pendiente),
          bruto_restante
        );

        await connection.execute(
          "UPDATE prestamos SET saldo_pendiente = saldo_pendiente - ? WHERE id_prestamo = ?",
          [descuento_aplicar, prestamo.id_prestamo]
        );

        total_descuentos += descuento_aplicar;
        bruto_restante -= descuento_aplicar;
      }

      const total_neto = total_bruto - total_descuentos;

      await connection.execute(
        "INSERT INTO pagos (id_cortador, fecha_inicio_semana, fecha_fin_semana, fecha_pago, total_bruto, descuentos, total_neto) VALUES (?, ?, ?, CURDATE(), ?, ?, ?)",
        [idCortador, fecha_inicio, fecha_fin, total_bruto, total_descuentos, total_neto]
      );

      recibos_generados.push({
        id_cortador: idCortador,
        kilos_totales: kilos,
        bruto: total_bruto,
        descuentos: total_descuentos,
        neto: total_neto,
      });
    }

    await connection.commit();
    transactionStarted = false;
    res.status(201).json({
      mensaje: "Nómina calculada y guardada con éxito",
      recibos: recibos_generados,
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error al revertir la transacción de nómina:", rollbackError);
      }
    }

    console.error("Error al procesar la nómina:", error);
    res.status(500).json({
      mensaje: "Error interno al calcular la nómina",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ==========================================
// MÓDULO CRUD: CUADRILLAS
// ==========================================

app.get("/api/cuadrillas", verificarToken, verificarRolAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id_cuadrilla, nombre_cuadrilla, zona_asignada FROM cuadrillas"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener las cuadrillas:", error);
    res.status(500).json({
      mensaje: "Error al obtener las cuadrillas",
      error: error.message,
    });
  }
});

app.post("/api/cuadrillas", verificarToken, verificarRolAdmin, async (req, res) => {
  const { nombre_cuadrilla, zona_asignada } = req.body;

  if (typeof nombre_cuadrilla !== "string" || !nombre_cuadrilla.trim()) {
    return res.status(400).json({ mensaje: "El nombre de la cuadrilla es obligatorio." });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO cuadrillas (nombre_cuadrilla, zona_asignada) VALUES (?, ?)",
      [nombre_cuadrilla.trim(), zona_asignada ?? null]
    );
    res.status(201).json({
      mensaje: "Cuadrilla creada con éxito",
      id_cuadrilla: result.insertId,
    });
  } catch (error) {
    console.error("Error al crear la cuadrilla:", error);
    res.status(500).json({
      mensaje: "Error al crear la cuadrilla",
      error: error.message,
    });
  }
});

app.put("/api/cuadrillas/:id", verificarToken, verificarRolAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_cuadrilla, zona_asignada } = req.body;

  if (!/^\d+$/.test(id) || typeof nombre_cuadrilla !== "string" || !nombre_cuadrilla.trim()) {
    return res.status(400).json({ mensaje: "El ID y el nombre de la cuadrilla deben ser válidos." });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE cuadrillas SET nombre_cuadrilla = ?, zona_asignada = ? WHERE id_cuadrilla = ?",
      [nombre_cuadrilla.trim(), zona_asignada ?? null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Cuadrilla no encontrada" });
    }
    res.json({ mensaje: "Cuadrilla actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar la cuadrilla:", error);
    res.status(500).json({
      mensaje: "Error al actualizar la cuadrilla",
      error: error.message,
    });
  }
});

app.delete("/api/cuadrillas/:id", verificarToken, verificarRolAdmin, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ mensaje: "El ID de la cuadrilla debe ser válido." });
  }

  try {
    const [cortadores] = await pool.execute(
      "SELECT id_cortador FROM cortadores WHERE id_cuadrilla = ? LIMIT 1",
      [id]
    );

    if (cortadores.length > 0) {
      return res.status(409).json({
        mensaje: "Error: No se puede borrar la cuadrilla porque tiene cortadores asignados.",
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM cuadrillas WHERE id_cuadrilla = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Cuadrilla no encontrada" });
    }

    res.json({ mensaje: "Cuadrilla eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar la cuadrilla:", error);
    res.status(500).json({
      mensaje: "Error al eliminar la cuadrilla",
      error: error.message,
    });
  }
});

// ==========================================
// MÓDULO CRUD: CORTADORES
// ==========================================

app.get("/api/cortadores", verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT c.id_cortador, c.nombre_completo, c.fecha_ingreso, c.id_cuadrilla, cu.nombre_cuadrilla
      FROM cortadores c
      JOIN cuadrillas cu ON c.id_cuadrilla = cu.id_cuadrilla
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener los cortadores:", error);
    res.status(500).json({
      mensaje: "Error al obtener los cortadores",
      error: error.message,
    });
  }
});

app.post("/api/cortadores", verificarToken, verificarRolAdmin, async (req, res) => {
  const { nombre_completo, id_cuadrilla, fecha_ingreso } = req.body;

  if (
    typeof nombre_completo !== "string" ||
    !nombre_completo.trim() ||
    !Number.isInteger(Number(id_cuadrilla)) ||
    Number(id_cuadrilla) <= 0 ||
    (fecha_ingreso !== undefined &&
      (typeof fecha_ingreso !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha_ingreso)))
  ) {
    return res.status(400).json({ mensaje: "Los datos del cortador no son válidos." });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO cortadores (nombre_completo, id_cuadrilla, fecha_ingreso) VALUES (?, ?, ?)",
      [nombre_completo.trim(), Number(id_cuadrilla), fecha_ingreso ?? null]
    );
    res.status(201).json({
      mensaje: "Cortador registrado con éxito",
      id_cortador: result.insertId,
    });
  } catch (error) {
    console.error("Error al registrar el cortador:", error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ mensaje: "Error: La cuadrilla asignada no existe." });
    }
    res.status(500).json({
      mensaje: "Error al registrar el cortador",
      error: error.message,
    });
  }
});

app.put("/api/cortadores/:id", verificarToken, verificarRolAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, id_cuadrilla } = req.body;

  if (
    !/^[1-9]\d*$/.test(id) ||
    typeof nombre_completo !== "string" ||
    !nombre_completo.trim() ||
    !Number.isInteger(Number(id_cuadrilla)) ||
    Number(id_cuadrilla) <= 0
  ) {
    return res.status(400).json({ mensaje: "Los datos del cortador no son válidos." });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE cortadores SET nombre_completo = ?, id_cuadrilla = ? WHERE id_cortador = ?",
      [nombre_completo.trim(), Number(id_cuadrilla), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Cortador no encontrado" });
    }
    res.json({ mensaje: "Cortador actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el cortador:", error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ mensaje: "Error: La cuadrilla asignada no existe." });
    }
    res.status(500).json({
      mensaje: "Error al actualizar",
      error: error.message,
    });
  }
});

app.delete("/api/cortadores/:id", verificarToken, verificarRolAdmin, async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ mensaje: "El ID del cortador debe ser válido." });
  }

  try {
    const [result] = await pool.execute(
      "DELETE FROM cortadores WHERE id_cortador = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Cortador no encontrado" });
    }
    res.json({ mensaje: "Cortador eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar el cortador:", error);
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        mensaje: "No se puede borrar este cortador porque tiene cosechas o pagos registrados en el sistema.",
      });
    }
    res.status(500).json({
      mensaje: "Error al eliminar",
      error: error.message,
    });
  }
});

// ==========================================
// MÓDULO CRUD: PRÉSTAMOS
// ==========================================

app.get("/api/prestamos", verificarToken, verificarRolAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.id_prestamo, p.fecha_prestamo, p.monto, p.saldo_pendiente, p.estatus, p.id_cortador, c.nombre_completo
      FROM prestamos p
      JOIN cortadores c ON p.id_cortador = c.id_cortador
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener los préstamos:", error);
    res.status(500).json({
      mensaje: "Error al obtener préstamos",
      error: error.message,
    });
  }
});

app.post("/api/prestamos", verificarToken, verificarRolAdmin, async (req, res) => {
  const { id_cortador, monto, fecha_prestamo } = req.body;
  const idCortador = Number(id_cortador);
  const montoPrestamo = Number(monto);
  const fechaPrestamoValida =
    typeof fecha_prestamo === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha_prestamo) &&
    !Number.isNaN(new Date(`${fecha_prestamo}T00:00:00.000Z`).getTime()) &&
    new Date(`${fecha_prestamo}T00:00:00.000Z`).toISOString().slice(0, 10) === fecha_prestamo;

  if (
    !Number.isInteger(idCortador) ||
    idCortador <= 0 ||
    !Number.isFinite(montoPrestamo) ||
    montoPrestamo <= 0 ||
    !fechaPrestamoValida
  ) {
    return res.status(400).json({ mensaje: "Los datos del préstamo no son válidos." });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO prestamos (id_cortador, monto, saldo_pendiente, fecha_prestamo, estatus) VALUES (?, ?, ?, ?, 'Pendiente')",
      [idCortador, montoPrestamo, montoPrestamo, fecha_prestamo]
    );
    res.status(201).json({
      mensaje: "Préstamo registrado con éxito",
      id_prestamo: result.insertId,
    });
  } catch (error) {
    console.error("Error al registrar el préstamo:", error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ mensaje: "Error: El cortador asignado no existe." });
    }
    res.status(500).json({
      mensaje: "Error al registrar el préstamo",
      error: error.message,
    });
  }
});

app.put("/api/prestamos/:id", verificarToken, verificarRolAdmin, async (req, res) => {
  const { id } = req.params;
  const { monto, saldo_pendiente, estatus } = req.body;
  const montoPrestamo = Number(monto);
  const saldoPendiente = Number(saldo_pendiente);

  if (
    !/^[1-9]\d*$/.test(id) ||
    !Number.isFinite(montoPrestamo) ||
    montoPrestamo <= 0 ||
    !Number.isFinite(saldoPendiente) ||
    saldoPendiente < 0 ||
    saldoPendiente > montoPrestamo ||
    typeof estatus !== "string" ||
    !estatus.trim()
  ) {
    return res.status(400).json({ mensaje: "Los datos del préstamo no son válidos." });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE prestamos SET monto = ?, saldo_pendiente = ?, estatus = ? WHERE id_prestamo = ?",
      [montoPrestamo, saldoPendiente, estatus.trim(), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Préstamo no encontrado" });
    }
    res.json({ mensaje: "Préstamo actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el préstamo:", error);
    res.status(500).json({
      mensaje: "Error al actualizar",
      error: error.message,
    });
  }
});

app.delete("/api/prestamos/:id", verificarToken, verificarRolAdmin, async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ mensaje: "El ID del préstamo debe ser válido." });
  }

  try {
    const [result] = await pool.execute(
      "DELETE FROM prestamos WHERE id_prestamo = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Préstamo no encontrado" });
    }
    res.json({ mensaje: "Préstamo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar el préstamo:", error);
    res.status(500).json({
      mensaje: "Error al eliminar el préstamo",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});