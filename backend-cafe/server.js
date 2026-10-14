const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt"); // Para encriptar contraseñas
const jwt = require("jsonwebtoken"); // Para crear los tokens

const app = express();
const PORT = 3000;

// Llave secreta para JWT (En la vida real esto va en un archivo .env)
const SECRET_KEY = "tu_clave_secreta_super_segura_para_el_cafe";

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "loquendO12",
  database: "finca_cafetalera",
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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});