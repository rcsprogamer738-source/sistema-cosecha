import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

interface Cortador {
  id_cortador: number;
  nombre_completo: string;
}

interface Prestamo {
  id_prestamo: number;
  fecha_prestamo: string;
  monto: string;
  saldo_pendiente: string;
  estatus: string;
  nombre_completo: string;
}

const API_URL = "http://localhost:3000";

const moneda = (n: number | string) =>
  Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function Prestamos() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cortadores, setCortadores] = useState<Cortador[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingForm, setLoadingForm] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [form, setForm] = useState({ id_cortador: "", monto: "", fecha_prestamo: "" });

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      
      const [resPrestamos, resCortadores] = await Promise.all([
        fetch(`${API_URL}/api/prestamos`, { headers }),
        fetch(`${API_URL}/api/cortadores`, { headers })
      ]);

      if (resPrestamos.ok && resCortadores.ok) {
        setPrestamos(await resPrestamos.json());
        setCortadores(await resCortadores.json());
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingForm(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const response = await fetch(`${API_URL}/api/prestamos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          id_cortador: Number(form.id_cortador),
          monto: Number(form.monto),
          fecha_prestamo: form.fecha_prestamo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(data.mensaje);
        setForm({ id_cortador: "", monto: "", fecha_prestamo: "" });
        fetchData();
      } else {
        setErrorMsg(data.mensaje);
      }
    } catch (error) {
      setErrorMsg("Error de conexión al servidor.");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleBorrar = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro de préstamo?")) return;
    
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_URL}/api/prestamos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(data.mensaje);
        fetchData();
      } else {
        setErrorMsg(data.mensaje);
      }
    } catch (error) {
      setErrorMsg("Error de red al intentar borrar.");
    }
  };

  const inputClass = "w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-base text-white placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60 [color-scheme:dark]";

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="text-3xl font-semibold text-white">Gestión de Préstamos</h1>
      <p className="mt-2 text-base text-stone-300">
        Registra adelantos de efectivo. El descuento se aplicará en nómina.
      </p>

      {successMsg && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/20 px-3 py-2.5 text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-2.5 text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" /> <span>{errorMsg}</span>
        </div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-3">
        {/* Formulario */}
        <div className="rounded-xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md xl:col-span-1 h-fit">
          <h2 className="mb-4 text-xl font-medium text-white">Nuevo Préstamo</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-200">Cortador</label>
              <select required value={form.id_cortador} onChange={(e) => setForm({ ...form, id_cortador: e.target.value })} className={inputClass} disabled={loadingForm}>
                <option value="" disabled>Selecciona un trabajador...</option>
                {cortadores.map(c => (
                  <option key={c.id_cortador} value={c.id_cortador}>{c.nombre_completo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-200">Monto ($)</label>
              <input type="number" min="1" step="0.5" required value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="Ej. 500.00" className={inputClass} disabled={loadingForm}/>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-200">Fecha del préstamo</label>
              <input type="date" required value={form.fecha_prestamo} onChange={(e) => setForm({ ...form, fecha_prestamo: e.target.value })} className={inputClass} disabled={loadingForm}/>
            </div>
            <button type="submit" disabled={loadingForm} className="mt-2 flex w-full justify-center rounded-lg bg-amber-500 py-2.5 font-medium text-stone-950 transition hover:bg-amber-400 focus:ring-2 focus:ring-amber-300 disabled:opacity-70">
              {loadingForm ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar Préstamo"}
            </button>
          </form>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-md xl:col-span-2 overflow-hidden">
          {loadingList ? (
            <div className="flex h-40 items-center justify-center text-stone-300">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Cargando historial...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/15 bg-black/30 text-stone-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Trabajador</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium text-right">Monto Original</th>
                    <th className="px-4 py-3 font-medium text-right">Saldo Actual</th>
                    <th className="px-4 py-3 font-medium">Estatus</th>
                    <th className="px-4 py-3 font-medium text-right">Borrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {prestamos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-stone-400">No hay préstamos registrados.</td>
                    </tr>
                  ) : (
                    prestamos.map((p) => (
                      <tr key={p.id_prestamo} className="text-stone-100 hover:bg-white/5 transition">
                        <td className="px-4 py-3 font-medium">{p.nombre_completo}</td>
                        <td className="px-4 py-3">{new Date(p.fecha_prestamo).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-300">{moneda(p.monto)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-400">{moneda(p.saldo_pendiente)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${p.estatus === "Pendiente" ? "bg-amber-500/20 text-amber-300" : "bg-green-500/20 text-green-300"}`}>
                            {p.estatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleBorrar(p.id_prestamo)} className="inline-flex rounded p-1.5 text-stone-400 hover:bg-red-500/20 hover:text-red-400 transition" title="Borrar registro">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}