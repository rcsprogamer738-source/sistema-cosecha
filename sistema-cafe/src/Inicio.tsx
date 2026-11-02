import { useEffect, useState } from "react";
import { Sprout, Users, Banknote, ArrowRight } from "lucide-react";

type VistasPermitidas = "inicio" | "cosecha" | "nomina" | "cuadrillas" | "cortadores" | "prestamos";

interface Cosecha {
  id_cosecha: number;
  fecha_recoleccion: string;
  kilos_recolectados: number | string;
  nombre_completo: string;
}

interface Cortador {
  id_cortador: number;
}

interface Prestamo {
  saldo_pendiente: number | string;
}

const API_URL = "http://localhost:3000";

export default function Inicio({ setVistaActiva }: { setVistaActiva: (vista: VistasPermitidas) => void }) {
  const nombre = localStorage.getItem("nombreUser") || "Administrador";
  const [kilos, setKilos] = useState(0);
  const [empleados, setEmpleados] = useState(0);
  const [prestamos, setPrestamos] = useState(0);
  const [historial, setHistorial] = useState<Cosecha[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

      try {
        const [resCosechas, resCortadores, resPrestamos] = await Promise.all([
          fetch(`${API_URL}/api/cosechas`, { headers }),
          fetch(`${API_URL}/api/cortadores`, { headers }),
          fetch(`${API_URL}/api/prestamos`, { headers }),
        ]);

        if (resCosechas.ok) {
          const dataCosechas: Cosecha[] = await resCosechas.json();
          setHistorial(dataCosechas.slice(0, 5));
          const ahora = new Date();
          const hace7Dias = new Date(ahora);
          hace7Dias.setDate(hace7Dias.getDate() - 7);
          const kilosSemana = dataCosechas
            .filter((cosecha) => {
              const fechaRecoleccion = new Date(cosecha.fecha_recoleccion);
              return fechaRecoleccion >= hace7Dias && fechaRecoleccion <= ahora;
            })
            .reduce((total, cosecha) => total + Number(cosecha.kilos_recolectados), 0);
          setKilos(kilosSemana);
        } else {
          console.error(`Error al cargar cosechas: ${resCosechas.status}`);
        }

        if (resCortadores.ok) {
          const dataCortadores: Cortador[] = await resCortadores.json();
          setEmpleados(dataCortadores.length);
        } else {
          console.error(`Error al cargar cortadores: ${resCortadores.status}`);
        }

        if (resPrestamos.ok) {
          const dataPrestamos: Prestamo[] = await resPrestamos.json();
          setPrestamos(
            dataPrestamos.reduce((total, prestamo) => total + Number(prestamo.saldo_pendiente), 0),
          );
        } else {
          console.error(`Error al cargar préstamos: ${resPrestamos.status}`);
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      }
    };

    cargarDatos();
  }, []);

  const metaSemanal = 1000;
  const porcentajeReal = ((kilos / metaSemanal) * 100).toFixed(0);
  const alturaLiquido = Math.min(Number(porcentajeReal), 100);
  const btn3DClass = "flex items-center justify-between w-full rounded-xl bg-amber-500 px-6 py-4 text-lg font-semibold text-stone-950 shadow-[0_4px_0_0_#b45309] transition-all hover:bg-amber-400 active:translate-y-1 active:shadow-none disabled:opacity-70";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-2 text-4xl font-bold text-white">Buenas noches, {nombre}</h1>
      <p className="text-lg text-stone-300 mb-8">Panel principal de gestión de la finca cafetalera.</p>

      {/* Tarjetas de Resumen (Estilo Glassmorphism) */}
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <button
          type="button"
          onClick={() => setVistaActiva("cosecha")}
          className="group w-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-lg bg-green-500/20 p-3 text-green-400 transition-transform group-hover:scale-110"><Sprout className="h-6 w-6" /></div>
            <h3 className="text-xl font-medium text-stone-200">Cosecha Semanal</h3>
          </div>
          <p className="text-3xl font-bold text-white">{kilos.toFixed(2)} <span className="text-base font-normal text-stone-400">kg</span></p>
        </button>

        <button
          type="button"
          onClick={() => setVistaActiva("cortadores")}
          className="group w-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-lg bg-blue-500/20 p-3 text-blue-400 transition-transform group-hover:scale-110"><Users className="h-6 w-6" /></div>
            <h3 className="text-xl font-medium text-stone-200">Cortadores Activos</h3>
          </div>
          <p className="text-3xl font-bold text-white">{empleados} <span className="text-base font-normal text-stone-400">empleados</span></p>
        </button>

        <button
          type="button"
          onClick={() => setVistaActiva("prestamos")}
          className="group w-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-lg bg-amber-500/20 p-3 text-amber-400 transition-transform group-hover:scale-110"><Banknote className="h-6 w-6" /></div>
            <h3 className="text-xl font-medium text-stone-200">Préstamos Pendientes</h3>
          </div>
          <p className="text-3xl font-bold text-white">{prestamos.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
        </button>
      </div>

      {/* Accesos Rápidos con Efecto 3D */}
      <h2 className="text-2xl font-semibold text-white mb-4">Acciones Rápidas</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => setVistaActiva("cosecha")} className={btn3DClass}>
          <span>Registrar Cosecha</span> <ArrowRight className="h-5 w-5 opacity-70" />
        </button>
        <button onClick={() => setVistaActiva("nomina")} className={btn3DClass}>
          <span>Calcular Nómina</span> <ArrowRight className="h-5 w-5 opacity-70" />
        </button>
        <button onClick={() => setVistaActiva("cortadores")} className={btn3DClass}>
          <span>Alta Cortador</span> <ArrowRight className="h-5 w-5 opacity-70" />
        </button>
        <button onClick={() => setVistaActiva("prestamos")} className={btn3DClass}>
          <span>Nuevo Préstamo</span> <ArrowRight className="h-5 w-5 opacity-70" />
        </button>
      </div>

      {/* Panel inferior: Progreso y Actividad */}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur-md transition-colors hover:border-amber-500/30">
          <div>
            <h2 className="mb-1 text-xl font-semibold text-white">Meta Semanal</h2>
            <p className="mb-6 text-sm text-stone-400">Objetivo: 1,000 kg</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold tracking-tighter text-amber-500">{porcentajeReal}%</span>
              {Number(porcentajeReal) >= 100 && (
                <span className="rounded-full border border-green-500/30 bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-400">
                  ¡Meta superada!
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-stone-300">{kilos.toFixed(2)} kg esta semana</p>
          </div>

          {/* Construcción de la Taza mejorada */}
          <div className="relative mr-6 flex items-center justify-center">
            <div className="absolute -top-8 left-1/2 flex -translate-x-1/2 gap-2 opacity-60">
              <div className="h-8 w-1 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-white/20 blur-[2px]"></div>
              <div className="h-12 w-1.5 animate-[pulse_2.5s_ease-in-out_infinite] rounded-full bg-white/20 blur-[2px]"></div>
              <div className="mt-3 h-6 w-1 animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-white/20 blur-[2px]"></div>
            </div>
            <div className="relative">
              {/* Asa */}
              <div className="absolute -right-6 top-3 h-14 w-8 rounded-r-2xl border-4 border-l-0 border-white/10 transition-colors group-hover:border-white/20"></div>
              {/* Vaso de cristal */}
              <div className="relative z-10 h-32 w-24 overflow-hidden rounded-b-3xl border-4 border-white/20 bg-black/40 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5)]">
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-amber-950 to-amber-600 transition-all duration-1000 ease-out"
                  style={{ height: `${alturaLiquido}%` }}
                >
                  <div className="absolute -top-2 left-0 h-4 w-full rounded-[50%] bg-amber-500/70 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur-md">
          <h2 className="mb-4 text-xl font-semibold text-white">Actividad Reciente</h2>
          <div className="flex flex-1 flex-col gap-3">
            {historial.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-black/20 text-stone-500">
                Sin registros recientes
              </div>
            ) : (
              historial.map((item) => (
                <div key={item.id_cosecha} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-medium text-stone-200">{item.nombre_completo}</p>
                    <p className="text-xs text-stone-400">{new Date(item.fecha_recoleccion).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold text-amber-400">+{item.kilos_recolectados} kg</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}