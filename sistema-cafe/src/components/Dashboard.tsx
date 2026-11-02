import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Home, Sprout, Wallet, Coffee, CheckCircle2, AlertCircle, Loader2, Users, User, Banknote, LogOut, UserCircle } from "lucide-react";
import Nomina from "./Nomina";
import Cuadrillas from "./Cuadrillas";
import Cortadores from "./Cortadores";
import Prestamos from "./Prestamos";
import Inicio from "../Inicio";

interface FormData {
  id_empleado: string;
  kilos_recolectados: string;
  fecha_recoleccion: string;
}

interface PostResponse {
  mensaje: string;
  insertId: number;
}

interface Cortador {
  id_cortador: number;
  nombre_completo: string;
}

const initialForm: FormData = {
  id_empleado: "",
  kilos_recolectados: "",
  fecha_recoleccion: "",
};

const API_URL = "http://localhost:3000";

type VistasPermitidas = "inicio" | "cosecha" | "nomina" | "cuadrillas" | "cortadores" | "prestamos";

const menuItems: {
  label: string;
  icon: typeof Home;
  vista?: VistasPermitidas;
}[] = [
  { label: "Inicio", icon: Home, vista: "inicio" },
  { label: "Cosecha", icon: Sprout, vista: "cosecha" },
  { label: "Nómina", icon: Wallet, vista: "nomina" },
  { label: "Cuadrillas", icon: Users, vista: "cuadrillas" },
  { label: "Cortadores", icon: User, vista: "cortadores" },
  { label: "Préstamos", icon: Banknote, vista: "prestamos" },
];

export default function Dashboard() {
  const [vistaActiva, setVistaActiva] = useState<VistasPermitidas>("cosecha");
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [cortadores, setCortadores] = useState<Cortador[]>([]);

  useEffect(() => {
    if (vistaActiva !== "cosecha") {
      return;
    }

    const cargarCortadores = async () => {
      try {
        const response = await fetch(`${API_URL}/api/cortadores`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        if (!response.ok) {
          throw new Error(`Error al cargar cortadores: ${response.status}`);
        }

        setCortadores(await response.json());
      } catch (error) {
        console.error("Error al cargar cortadores:", error);
        setErrorMsg("No se pudieron cargar los trabajadores.");
      }
    };

    cargarCortadores();
  }, [vistaActiva]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const response = await fetch(`${API_URL}/api/cosechas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          id_empleado: form.id_empleado,
          kilos_recolectados: Number(form.kilos_recolectados),
          fecha_recoleccion: form.fecha_recoleccion,
        }),
      });

      const data: PostResponse = await response.json();
      if (response.ok) {
        setSuccessMsg(`✓ ${form.kilos_recolectados} kg registrados correctamente.`);
        setForm((prev) => ({ ...prev, kilos_recolectados: "", id_empleado: "" }));
        document.getElementById("id_empleado")?.focus();
      } else {
        setErrorMsg(`Error: ${data.mensaje}`);
      }
    } catch {
      setErrorMsg("Error al conectar con el servidor local.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-lg text-white placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60 [color-scheme:dark]";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-black/40 text-stone-300 backdrop-blur-md">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <Coffee className="h-6 w-6 text-amber-400" />
          <span className="font-semibold text-white">Gestión de Cosecha</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map(({ label, icon: Icon, vista }) => {
            const active = vista === vistaActiva;
            return (
              <button
                key={label}
                type="button"
                onClick={() => vista && setVistaActiva(vista)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition border-l-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  active
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-transparent text-stone-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Sección de perfil y cerrar sesión */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 p-3 shadow-inner">
            <UserCircle className="h-8 w-8 text-stone-300" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                {localStorage.getItem("nombreUser") || "Admin"}
              </span>
              <span className="text-xs text-amber-500/80">Administrador</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("nombreUser");
              window.location.reload();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-10">
        {vistaActiva === "inicio" ? (
          <Inicio setVistaActiva={setVistaActiva} />
        ) : vistaActiva === "nomina" ? (
          <Nomina />
        ) : vistaActiva === "cuadrillas" ? (
          <Cuadrillas />
        ) : vistaActiva === "cortadores" ? (
          <Cortadores />
        ) : vistaActiva === "prestamos" ? (
          <Prestamos />
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <h1 className="text-3xl font-semibold text-white">Registro de Cosecha</h1>
            <p className="mt-2 text-base text-stone-300">
              Captura los kilos recolectados por empleado en una fecha determinada.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 grid gap-6 rounded-xl border border-white/20 bg-white/10 p-8 text-lg text-white shadow-xl backdrop-blur-md md:grid-cols-3"
            >
              <div>
                <label htmlFor="id_empleado" className="mb-2 block text-base font-medium text-stone-200">
                  Trabajador
                </label>
                <select
                  id="id_empleado"
                  name="id_empleado"
                  value={form.id_empleado}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className={inputClass}
                >
                  <option value="" disabled>Selecciona un trabajador...</option>
                  {cortadores.map((cortador) => (
                    <option key={cortador.id_cortador} value={cortador.id_cortador}>
                      {cortador.nombre_completo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="kilos_recolectados" className="mb-2 block text-base font-medium text-stone-200">
                  Kilos recolectados
                </label>
                <input
                  id="kilos_recolectados"
                  name="kilos_recolectados"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.kilos_recolectados}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="Ej. 45.5"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="fecha_recoleccion" className="mb-2 block text-base font-medium text-stone-200">
                  Fecha de recolección
                </label>
                <input
                  id="fecha_recoleccion"
                  name="fecha_recoleccion"
                  type="date"
                  value={form.fecha_recoleccion}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className={inputClass}
                />
              </div>

              {successMsg && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-green-400/40 bg-green-500/20 px-4 py-3 text-base text-green-300 md:col-span-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/20 px-4 py-3 text-base text-red-300 md:col-span-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 text-lg font-medium text-stone-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  "Registrar cosecha"
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
