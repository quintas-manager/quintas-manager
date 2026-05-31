import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMesesConActividad } from "@/lib/actions/finanzas";
import { cn } from "@/lib/utils";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default async function FinanzasQuintaPage({
  params,
}: {
  params: { quintaId: string };
}) {
  const quinta = await prisma.quinta.findUnique({
    where:  { id: params.quintaId },
    select: { id: true, nombre: true, colorHex: true },
  });
  if (!quinta) notFound();

  const meses = await getMesesConActividad(params.quintaId);

  // Group by year
  const byAnio = new Map<number, typeof meses>();
  for (const m of meses) {
    if (!byAnio.has(m.anio)) byAnio.set(m.anio, []);
    byAnio.get(m.anio)!.push(m);
  }
  const anios = Array.from(byAnio.keys()).sort((a, b) => b - a);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/finanzas"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
            style={{ backgroundColor: quinta.colorHex }}
          >
            {quinta.nombre.charAt(0)}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{quinta.nombre}</h1>
            <p className="text-sm text-gray-500">Historial financiero por mes</p>
          </div>
        </div>
      </div>

      {meses.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-400">No hay actividad registrada aún para esta quinta.</p>
        </div>
      )}

      {anios.map((anio) => (
        <div key={anio}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{anio}</h2>
          <div className="space-y-2">
            {byAnio.get(anio)!.map((m) => {
              const esPositivo = m.resultado > 0;
              const esNegativo = m.resultado < 0;
              return (
                <div
                  key={`${m.anio}-${m.mes}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {MESES[m.mes]} {m.anio}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            m.cerrado
                              ? "bg-gray-100 text-gray-600"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          )}
                        >
                          {m.cerrado ? "Cerrado" : "Abierto"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>Ingresos: <span className="text-green-600 font-medium">{fmt(m.totalIngresos)}</span></span>
                        <span>Gastos: <span className="text-red-600 font-medium">{fmt(m.totalGastos)}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {esPositivo && <TrendingUp  className="h-3.5 w-3.5 text-green-500" />}
                        {esNegativo && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                        {!esPositivo && !esNegativo && <Minus className="h-3.5 w-3.5 text-gray-400" />}
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            esPositivo ? "text-green-600" : esNegativo ? "text-red-600" : "text-gray-500"
                          )}
                        >
                          {fmt(m.resultado)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">resultado</span>
                    </div>
                    <Link
                      href={`/finanzas/${params.quintaId}/${m.anio}/${m.mes}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
