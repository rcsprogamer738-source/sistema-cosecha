import { useState } from "react";
import { Calculator, CheckCircle2, Loader2 } from "lucide-react";

type Estado = "Pendiente" | "Calculado";

interface Registro {
  id_empleado: number;
  nombre: string;
  kilos_totales: number;
  tarifa_kilo: number;
  estado: Estado;
}

const datosIniciales: Registro[] = [
  { id_empleado: 1001, nombre: "Ivan Ariel Hipolita", kilos_totales: 320.5, tarifa_kilo: 4.5, estado: "Pendiente" },
  { id_empleado: 1002, nombre: "Patricio Mendoza", kilos_totales: 285, tarifa_kilo: 4.5, estado: "Pendiente" },
  { id_empleado: 1003, nombre: "Alexis Julian", kilos_totales: 410.75, tarifa_kilo: 5, estado: "Pendiente" },
  { id_empleado: 1004, nombre: "Rafael Cano", kilos_totales: 198.25, tarifa_kilo: 4.5, estado: "Pendiente" },
];

const moneda = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Nomina() {
  const [registros, setRegistros] = useState<Registro[]>(datosIniciales);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");

  const calcularNomina = () => {
    setLoading(true);
    setSuccessMsg("");

    setTimeout(() => {
      setRegistros((prev) => prev.map((r) => ({ ...r, estado: "Calculado" })));
      setSuccessMsg("Nómina calculada y guardada con éxito");
      setLoading(false);
    }, 1000);
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
        <div
          role="status"
          className="mt-5 flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/20 px-3 py-2.5 text-base text-green-300"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="mt-6 w-full overflow-x-auto rounded-xl border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md">
        <table className="w-full text-left text-base">
          <thead className="border-b border-white/15 bg-black/30 text-stone-300">
            <tr>
              <th className="px-6 py-4 font-medium">ID Empleado</th>
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 text-right font-medium">Kilos Totales (semana)</th>
              <th className="px-6 py-4 text-right font-medium">Tarifa por Kilo ($)</th>
              <th className="px-6 py-4 text-right font-medium">Total a Pagar ($)</th>
              <th className="px-6 py-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {registros.map((r) => (
              <tr key={r.id_empleado} className="text-stone-100 hover:bg-white/5">
                <td className="px-6 py-4 text-stone-400">{r.id_empleado}</td>
                <td className="px-6 py-4 font-medium">{r.nombre}</td>
                <td className="px-6 py-4 text-right tabular-nums">{moneda(r.kilos_totales)}</td>
                <td className="px-6 py-4 text-right tabular-nums">{moneda(r.tarifa_kilo)}</td>
                <td className="px-6 py-4 text-right font-medium tabular-nums">
                  {moneda(r.kilos_totales * r.tarifa_kilo)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                      r.estado === "Calculado"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {r.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
