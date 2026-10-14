import { useState } from "react";
import type { FormEvent } from "react";
import { Home, Sprout, Wallet, Coffee, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Nomina from "./Nomina";

interface FormData {
  id_empleado: string;
  kilos_recolectados: string;
  fecha_recoleccion: string;
}

interface PostResponse {
  mensaje: string;
  insertId: number;
}

const initialForm: FormData = {
  id_empleado: "",
  kilos_recolectados: "",
  fecha_recoleccion: "",
};

const API_URL = "http://192.168.8.1:3000";

const menuItems: {
  label: string;
  icon: typeof Home;
  vista?: "cosecha" | "nomina";
}[] = [
  { label: "Inicio", icon: Home },
  { label: "Cosecha", icon: Sprout, vista: "cosecha" },
  { label: "Nómina", icon: Wallet, vista: "nomina" },
];

export default function Dashboard() {
  const [vistaActiva, setVistaActiva] = useState<"cosecha" | "nomina">("cosecha");
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setSuccessMsg(`¡Cosecha registrada con éxito! ID asignado: ${data.insertId}`);
        setForm(initialForm);
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  active
                    ? "bg-amber-500/20 text-amber-300"
                    : "text-stone-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-10">
        {vistaActiva === "nomina" ? (
          <Nomina />
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
                  ID de empleado
                </label>
                <input
                  id="id_empleado"
                  name="id_empleado"
                  type="text"
                  inputMode="numeric"
                  value={form.id_empleado}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="Ej. 1024"
                  className={inputClass}
                />
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
