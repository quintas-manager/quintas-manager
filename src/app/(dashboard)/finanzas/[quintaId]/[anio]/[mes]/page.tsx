import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Lock, CheckCircle2 } from "lucide-react";
import { calcularMes } from "@/lib/actions/finanzas";
import { CerrarMesButton } from "@/components/finanzas/CerrarMesButton";
import { cn } from "@/lib/utils";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta", MERCADOPAGO: "MercadoPago",
};

const PAGADOR_LABELS: Record<string, string> = {
  CAJA: "Caja", GRACIELA: "Graciela", MATIAS: "Matías", ROCIO: "Rocío",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtFecha = (s: string) =>
  format(parseISO(s), "d MMM yyyy", { locale: es });

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-900 mb-3">{children}</h2>;
}

function MontoTotal({ label, value, highlight }: { label: string; value: number; highlight?: "green" | "red" }) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-2">
      <span className="text-sm font-semibold text-gray-900">{label}</span>
      <span className={cn(
        "text-sm font-bold",
        highlight === "green" ? "text-green-600" : highlight === "red" ? "text-red-600" : "text-gray-900"
      )}>
        {fmt(value)}
      </span>
    </div>
  );
}

export default async function MesDetallePage({
  params,
}: {
  params: { quintaId: string; anio: string; mes: string };
}) {
  const mes  = parseInt(params.mes);
  const anio = parseInt(params.anio);

  if (isNaN(mes) || isNaN(anio) || mes < 1 || mes > 12) notFound();

  let data;
  try {
    data = await calcularMes(params.quintaId, mes, anio);
  } catch {
    notFound();
  }

  const mesNombre = `${MESES[mes]} ${anio}`;
  const esCerrado = !!data.cierre;

  // When closed, use snapshot values
  const totalIngresos       = esCerrado ? data.cierre!.totalIngresos       : data.totalIngresos;
  const totalGastos         = esCerrado ? data.cierre!.totalGastos         : data.totalGastos;
  const resultado           = esCerrado ? data.cierre!.resultado           : data.resultado;
  const parteGraciela       = esCerrado ? data.cierre!.parteGraciela       : data.parteGraciela;
  const parteMatias         = esCerrado ? data.cierre!.parteMatias         : data.parteMatias;
  const reintegrosGraciela  = esCerrado ? data.cierre!.reintegrosGraciela  : data.totalReintegrosGraciela;
  const reintegrosMatias    = esCerrado ? data.cierre!.reintegrosMatias    : data.totalReintegrosMatias;
  const cobrarGraciela      = esCerrado ? data.cierre!.cobrarGraciela      : data.cobrarGraciela;
  const cobrarMatias        = esCerrado ? data.cierre!.cobrarMatias        : data.cobrarMatias;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/finanzas/${params.quintaId}`}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{mesNombre}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  esCerrado
                    ? "bg-gray-100 text-gray-700"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                )}
              >
                {esCerrado ? <Lock className="h-3 w-3" /> : null}
                {esCerrado ? "Cerrado" : "Abierto"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{data.quintaNombre}</p>
          </div>
        </div>
        {!esCerrado && (
          <CerrarMesButton
            quintaId={params.quintaId}
            mes={mes}
            anio={anio}
            mesNombre={mesNombre}
            cobrarGraciela={cobrarGraciela}
            cobrarMatias={cobrarMatias}
            parteGraciela={parteGraciela}
            parteMatias={parteMatias}
            reintegrosGraciela={reintegrosGraciela}
            reintegrosMatias={reintegrosMatias}
          />
        )}
      </div>

      {/* Cierre badge */}
      {esCerrado && (
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
          <CheckCircle2 className="h-4 w-4 text-gray-500 shrink-0" />
          Cerrado el {fmtFecha(data.cierre!.fechaCierre)} por {data.cierre!.cerradoPorNombre}.
          Los valores mostrados son el snapshot histórico al momento del cierre.
        </div>
      )}

      {/* ── Ingresos ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <SectionTitle>Ingresos del mes</SectionTitle>
        {data.pagos.length === 0 ? (
          <p className="text-sm text-gray-400">Sin pagos registrados este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Reserva</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Método</th>
                  <th className="text-right text-xs font-medium text-gray-500 pb-2">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.pagos.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{fmtFecha(p.fecha)}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{p.clienteNombre}</td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap text-xs">
                      {fmtFecha(p.reservaFechaInicio)} → {fmtFecha(p.reservaFechaFin)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {METODO_LABELS[p.metodoPago] ?? p.metodoPago}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">{fmt(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <MontoTotal label="Total ingresos" value={totalIngresos} highlight="green" />
      </section>

      {/* ── Gastos ────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <SectionTitle>Gastos del mes</SectionTitle>
        {data.gastos.length === 0 ? (
          <p className="text-sm text-gray-400">Sin gastos registrados este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Categoría</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Descripción</th>
                  <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Pagado por</th>
                  <th className="text-right text-xs font-medium text-gray-500 pb-2">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.gastos.map((g) => (
                  <tr key={g.id}>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                    <td className="py-2 pr-3 text-gray-600">{g.categoriaNombre}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{g.descripcion}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          g.pagadoPor === "GRACIELA" ? "bg-purple-100 text-purple-700" :
                          g.pagadoPor === "MATIAS"   ? "bg-blue-100 text-blue-700" :
                          g.pagadoPor === "ROCIO"    ? "bg-pink-100 text-pink-700" :
                          "bg-gray-100 text-gray-600"
                        )}
                      >
                        {PAGADOR_LABELS[g.pagadoPor] ?? g.pagadoPor}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">{fmt(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <MontoTotal label="Total gastos" value={totalGastos} highlight="red" />
      </section>

      {/* ── Resultado ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <SectionTitle>Resultado</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Total ingresos", value: totalIngresos, color: "text-green-600" },
            { label: "Total gastos",   value: totalGastos,   color: "text-red-600" },
            { label: "Resultado neto", value: resultado,     color: resultado >= 0 ? "text-green-600" : "text-red-600" },
            { label: "Parte Graciela", value: parteGraciela, color: "text-gray-900" },
            { label: "Parte Matías",   value: parteMatias,   color: "text-gray-900" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={cn("text-base font-bold", item.color)}>{fmt(item.value)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reintegros pendientes (solo si abierto) ────────────────── */}
      {!esCerrado && (data.reintegrosGraciela.length > 0 || data.reintegrosMatias.length > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <SectionTitle>Reintegros pendientes acumulados</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { nombre: "Graciela", items: data.reintegrosGraciela, total: data.totalReintegrosGraciela },
              { nombre: "Matías",   items: data.reintegrosMatias,   total: data.totalReintegrosMatias },
            ].map(({ nombre, items, total }) => (
              items.length > 0 && (
                <div key={nombre} className="rounded-xl bg-white border border-amber-100 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">{nombre}</p>
                  <div className="space-y-1">
                    {items.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs text-gray-600">
                        <span className="truncate pr-2">{fmtFecha(r.fecha)} — {r.descripcion}</span>
                        <span className="font-medium shrink-0">{fmt(r.monto)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                    <span>Subtotal</span>
                    <span>{fmt(total)}</span>
                  </div>
                </div>
              )
            ))}
          </div>
        </section>
      )}

      {/* ── Cobro final ───────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <SectionTitle>Cobro final</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { nombre: "Graciela", parte: parteGraciela, reintegros: reintegrosGraciela, total: cobrarGraciela },
            { nombre: "Matías",   parte: parteMatias,   reintegros: reintegrosMatias,   total: cobrarMatias },
          ].map(({ nombre, parte, reintegros, total }) => (
            <div key={nombre} className="rounded-xl border-2 border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">{nombre} cobra</p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Parte del resultado</span>
                  <span>{fmt(parte)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reintegros pendientes</span>
                  <span>{fmt(reintegros)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-green-600">{fmt(total)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
