import { useState } from "react";
import { Calculator, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Recibo {
  id_cortador: number;
  kilos_totales: number;
  bruto: number;
  descuentos: number;
  neto: number;
}

const moneda = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function Nomina() {
  const [registros, setRegistros] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const calcularNomina = async () => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("No hay sesión activa. Inicia sesión de nuevo.");
      setLoading(false);
      return;
    }

    try {
      // Usamos el rango de fechas que probaste en Thunder Client para la demo
      const response = await fetch("http://localhost:3000/api/nomina", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fecha_inicio: "2026-09-20",
          fecha_fin: "2026-09-26",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || "Error al calcular la nómina");
      }

      if (data.recibos && data.recibos.length > 0) {
        setRegistros(data.recibos);
        setSuccessMsg(data.mensaje);
      } else {
        setSuccessMsg("Operación exitosa, pero no se generaron pagos (probablemente ya se liquidó esta semana).");
        setRegistros([]);
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Nómina semanal</h1>
          <p className="mt-2 text-base text-stone-300">
            Revisa los kilos recolectados y el pago de cada empleado.
          </p>
        </div>

        <button
          type="button"
          onClick={calcularNomina}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-base font-medium text-stone-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Calcular Nómina Semanal
            </>
          )}
        </button>
      </div>

      {successMsg && (
        <div role="status" className="mt-5 flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/20 px-3 py-2.5 text-base text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="mt-5 flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-2.5 text-base text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="mt-6 w-full overflow-x-auto rounded-xl border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md">
        <table className="w-full text-left text-base">
          <thead className="border-b border-white/15 bg-black/30 text-stone-300">
            <tr>
              <th className="px-6 py-4 font-medium">ID Empleado</th>
              <th className="px-6 py-4 text-right font-medium">Kilos (semana)</th>
              <th className="px-6 py-4 text-right font-medium">Pago Bruto</th>
              <th className="px-6 py-4 text-right font-medium">Descuentos</th>
              <th className="px-6 py-4 text-right font-medium">Pago Neto</th>
              <th className="px-6 py-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {registros.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-stone-400">
                  Haz clic en "Calcular Nómina Semanal" para procesar los pagos.
                </td>
              </tr>
            ) : (
              registros.map((r) => (
                <tr key={r.id_cortador} className="text-stone-100 hover:bg-white/5">
                  <td className="px-6 py-4 text-stone-400">{r.id_cortador}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{r.kilos_totales} kg</td>
                  <td className="px-6 py-4 text-right tabular-nums">{moneda(r.bruto)}</td>
                  <td className="px-6 py-4 text-right tabular-nums text-red-400">
                    {r.descuentos > 0 ? `- ${moneda(r.descuentos)}` : "$0.00"}
                  </td>
                  <td className="px-6 py-4 text-right font-bold tabular-nums text-green-400">
                    {moneda(r.neto)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-300">
                      Liquidado
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}