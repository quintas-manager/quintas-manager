"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, X, Pencil, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import { MontoDisplay } from "@/components/ui/MontoDisplay";
import { actualizarGasto } from "@/lib/actions/gastos";
import { gastoSchema, type GastoFormValues } from "@/lib/schemas/gastos";
import type { MesCalculado, PagoDetalle, GastoDetalle, DistribucionDetalle } from "@/lib/actions/finanzas";

export interface CategoriaOpt { id: string; nombre: string }

// ── Formatters ────────────────────────────────────────────────────────────────

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta", MERCADOPAGO: "MercadoPago",
};
const PAGADOR_LABELS: Record<string, string> = {
  CAJA: "Caja", GRACIELA: "Graciela", MATIAS: "Matías", ROCIO: "Rocío",
};
const PAGADOR_COLORS: Record<string, string> = {
  GRACIELA: "bg-purple-100 text-purple-700",
  MATIAS:   "bg-blue-100 text-blue-700",
  ROCIO:    "bg-pink-100 text-pink-700",
  CAJA:     "bg-gray-100 text-gray-600",
};

const fmt      = formatUSD;
const fmtShort = (s: string) => format(parseISO(s), "d MMM", { locale: es });
const fmtFull  = (s: string) => format(parseISO(s), "d 'de' MMMM yyyy", { locale: es });

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-700 mb-3">{children}</h2>;
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 pt-0.5">{label}</span>
      <span className={cn("text-sm text-right", highlight ? "font-bold text-green-600 text-base" : "font-medium text-gray-900")}>
        {value}
      </span>
    </div>
  );
}

function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ── Edit gasto inline ─────────────────────────────────────────────────────────

const PAGADORES = [
  { value: "CAJA",     label: "Caja" },
  { value: "GRACIELA", label: "Graciela" },
  { value: "MATIAS",   label: "Matías" },
  { value: "ROCIO",    label: "Rocío" },
] as const;

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
    err ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

function EditGastoForm({ gasto, categorias, onCancel, onSaved }: {
  gasto: GastoDetalle;
  categorias: CategoriaOpt[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<GastoFormValues>({
      resolver: zodResolver(gastoSchema),
      defaultValues: {
        quintaId:    gasto.quintaId,
        categoriaId: gasto.categoriaId,
        descripcion: gasto.descripcion,
        monto:       gasto.monto,
        fecha:       gasto.fecha,
        pagadoPor:   gasto.pagadoPor as GastoFormValues["pagadoPor"],
        notas:       gasto.notas ?? "",
      },
    });

  const onSubmit = async (data: GastoFormValues) => {
    const result = await actualizarGasto(gasto.id, data);
    if (result.success) { toast.success("Gasto actualizado"); onSaved(); }
    else toast.error(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-5 pb-8 pt-5 space-y-4">
      <p className="text-base font-semibold text-gray-900 pr-12">Editar gasto</p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
        <input {...register("descripcion")} className={inputCls(errors.descripcion?.message)} />
        {errors.descripcion && <p className="mt-1 text-xs text-red-500">{errors.descripcion.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Monto <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input type="number" inputMode="decimal" min={0} step="0.01" {...register("monto", { valueAsNumber: true })} className={cn(inputCls(errors.monto?.message), "pl-6")} />
          </div>
          {errors.monto && <p className="mt-1 text-xs text-red-500">{errors.monto.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
          <input type="date" {...register("fecha")} className={inputCls(errors.fecha?.message)} />
          {errors.fecha && <p className="mt-1 text-xs text-red-500">{errors.fecha.message}</p>}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
        <select {...register("categoriaId")} className={inputCls(errors.categoriaId?.message)}>
          <option value="">Seleccioná...</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {errors.categoriaId && <p className="mt-1 text-xs text-red-500">{errors.categoriaId.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Pagado por <span className="text-red-500">*</span></label>
        <div className="flex gap-2 flex-wrap">
          {PAGADORES.map((p) => (
            <label key={p.value} className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition",
              watch("pagadoPor") === p.value
                ? p.value === "CAJA" ? "border-gray-900 bg-gray-900 text-white" : "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-400",
            )}>
              <input type="radio" value={p.value} {...register("pagadoPor")} className="sr-only" />
              {p.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
        <textarea {...register("notas")} rows={2} className={cn(inputCls(), "resize-none")} placeholder="Información adicional..." />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#162d4a] transition disabled:opacity-60">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  quintaId: string;
  mes: number;
  anio: number;
  mesNombre: string;
  data: MesCalculado;
  categorias: CategoriaOpt[];
}

// ── Main component ────────────────────────────────────────────────────────────

export function MesDetalleClient({ quintaId, mes, anio, mesNombre, data, categorias }: Props) {
  const router = useRouter();
  const [selectedPago,         setSelectedPago]         = useState<PagoDetalle | null>(null);
  const [selectedGasto,        setSelectedGasto]        = useState<GastoDetalle | null>(null);
  const [selectedDistribucion, setSelectedDistribucion] = useState<DistribucionDetalle | null>(null);
  const [editingGasto,         setEditingGasto]         = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-4 pb-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/finanzas/${quintaId}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{mesNombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data.quintaNombre}</p>
        </div>
      </div>

      {/* ── Ingresos ────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <SectionTitle>Ingresos del mes</SectionTitle>
        </div>
        {data.pagos.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400">Sin pagos registrados este mes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cliente</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.pagos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedPago(p)}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtShort(p.fecha)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[120px] truncate">{p.clienteNombre}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <MontoDisplay montoUSD={p.monto} moneda={p.moneda} montoARS={p.montoARS} tipoCambio={p.tipoCambio} size="sm" className="items-end" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-900">Total ingresos</span>
          <span className="text-sm font-bold text-green-600">{fmt(data.totalIngresos)}</span>
        </div>
      </section>

      {/* ── Gastos ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <SectionTitle>Gastos del mes</SectionTitle>
        </div>
        {data.gastos.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400">Sin gastos registrados este mes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.gastos.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedGasto(g)}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtShort(g.fecha)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{g.descripcion}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(g.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-900">Total gastos</span>
          <span className="text-sm font-bold text-red-600">{fmt(data.totalGastos)}</span>
        </div>
      </section>

      {/* ── Distribuciones ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <SectionTitle>Distribuciones del mes</SectionTitle>
        </div>
        {data.distribuciones.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400">Sin distribuciones registradas este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Cliente</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Reint. Matías</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Reint. Graciela</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Parte Matías</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Parte Graciela</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.distribuciones.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedDistribucion(d)}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtShort(d.fecha)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[100px] truncate">{d.clienteNombre}</td>
                    <td className="px-4 py-3 text-right text-xs text-blue-700">{d.reintegroMatias > 0 ? fmt(d.reintegroMatias) : "—"}</td>
                    <td className="px-4 py-3 text-right text-xs text-purple-700">{d.reintegroGraciela > 0 ? fmt(d.reintegroGraciela) : "—"}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">{fmt(d.parteMatias)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">{fmt(d.parteGraciela)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Totales */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
          {data.totalReintegroMatias > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-blue-700">Total reintegrado a Matías</span>
              <span className="font-semibold text-blue-700">{fmt(data.totalReintegroMatias)}</span>
            </div>
          )}
          {data.totalReintegroGraciela > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-purple-700">Total reintegrado a Graciela</span>
              <span className="font-semibold text-purple-700">{fmt(data.totalReintegroGraciela)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
            <span className="text-blue-800 font-medium">Total Matías este mes</span>
            <span className="font-bold text-blue-800">{fmt(data.totalParteMatias + data.totalReintegroMatias)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-800 font-medium">Total Graciela este mes</span>
            <span className="font-bold text-purple-800">{fmt(data.totalParteGraciela + data.totalReintegroGraciela)}</span>
          </div>
        </div>
      </section>

      {/* ── Resultado ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <SectionTitle>Resultado del mes</SectionTitle>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Ingresos</span>
          <span className="text-sm font-semibold text-green-600">{fmt(data.totalIngresos)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Gastos</span>
          <span className="text-sm font-semibold text-red-600">{fmt(data.totalGastos)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-900">Resultado neto</span>
          <span className={cn("text-base font-bold", data.resultado >= 0 ? "text-green-600" : "text-red-600")}>
            {fmt(data.resultado)}
          </span>
        </div>
      </section>

      {/* ── Reintegros pendientes ────────────────────────────────────── */}
      {(data.reintegrosGraciela.length > 0 || data.reintegrosMatias.length > 0) && (
        <section>
          <SectionTitle>Reintegros pendientes acumulados</SectionTitle>
          <p className="text-xs text-gray-400 mb-3 -mt-2">
            Gastos pagados por cada persona que aún no fueron reintegrados en ninguna distribución.
          </p>
          <div className="space-y-3">
            {[
              { nombre: "Graciela", items: data.reintegrosGraciela, total: data.totalReintegrosGraciela, color: "amber" },
              { nombre: "Matías",   items: data.reintegrosMatias,   total: data.totalReintegrosMatias,   color: "amber" },
            ].map(({ nombre, items, total }) =>
              items.length > 0 ? (
                <div key={nombre} className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-100">
                    <p className="text-sm font-semibold text-amber-900">💰 Reintegros pendientes — {nombre}</p>
                  </div>
                  <div className="px-4 py-2 space-y-2">
                    {items.map((r) => (
                      <div key={r.id} className="flex justify-between items-start gap-3 py-1.5 border-b border-amber-100 last:border-0">
                        <div className="min-w-0">
                          <span className="text-xs text-gray-500 block">{fmtFull(r.fecha)}</span>
                          <span className="text-sm text-gray-800 break-words">{r.descripcion}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 shrink-0">{fmt(r.monto)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 border-t border-amber-100 bg-amber-100/50">
                    <span className="text-sm font-semibold text-amber-900">Total pendiente</span>
                    <span className="text-sm font-bold text-amber-900">{fmt(total)}</span>
                  </div>
                </div>
              ) : null
            )}
          </div>
        </section>
      )}

      {/* ── Pago bottom sheet ─────────────────────────────────────────── */}
      <BottomSheet open={!!selectedPago} onClose={() => setSelectedPago(null)}>
        <div className="px-5 pb-8 pt-5 space-y-1">
          <p className="text-base font-semibold text-gray-900 pr-12 mb-3">Detalle del ingreso</p>
          {selectedPago && (
            <>
              <DetailRow label="Fecha"   value={fmtFull(selectedPago.fecha)} />
              <DetailRow label="Cliente" value={selectedPago.clienteNombre} />
              <DetailRow label="Estadía" value={`${fmtFull(selectedPago.reservaFechaInicio)} → ${fmtFull(selectedPago.reservaFechaFin)}`} />
              <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 shrink-0 pt-0.5">Pago</span>
                <div className="text-right">
                  {selectedPago.moneda === "ARS" && selectedPago.montoARS && selectedPago.tipoCambio ? (
                    <>
                      <p className="text-base font-bold text-green-600">
                        ARS {selectedPago.montoARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}{" "}
                        en {METODO_LABELS[selectedPago.metodoPago] ?? selectedPago.metodoPago}
                      </p>
                      <p className="text-xs text-gray-500">
                        Equivalente a {fmt(selectedPago.monto)} al TC ${selectedPago.tipoCambio.toLocaleString("es-AR")}
                      </p>
                    </>
                  ) : (
                    <p className="text-base font-bold text-green-600">
                      {fmt(selectedPago.monto)} en {METODO_LABELS[selectedPago.metodoPago] ?? selectedPago.metodoPago}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </BottomSheet>

      {/* ── Distribución bottom sheet ─────────────────────────────────── */}
      <BottomSheet open={!!selectedDistribucion} onClose={() => setSelectedDistribucion(null)}>
        <div className="px-5 pb-8 pt-5 space-y-1">
          <p className="text-base font-semibold text-gray-900 pr-12 mb-3">Detalle de distribución</p>
          {selectedDistribucion && (
            <>
              <DetailRow label="Fecha"   value={fmtFull(selectedDistribucion.fecha)} />
              <DetailRow label="Cliente" value={selectedDistribucion.clienteNombre} />
              <DetailRow label="Ingreso total" value={fmt(selectedDistribucion.montoTotalUSD)} />
              {selectedDistribucion.reintegroMatias > 0 && (
                <DetailRow label="Reintegro Matías" value={fmt(selectedDistribucion.reintegroMatias)} />
              )}
              {selectedDistribucion.reintegroGraciela > 0 && (
                <DetailRow label="Reintegro Graciela" value={fmt(selectedDistribucion.reintegroGraciela)} />
              )}
              <DetailRow label="Parte Matías" value={fmt(selectedDistribucion.parteMatias)} />
              <DetailRow label="Parte Graciela" value={fmt(selectedDistribucion.parteGraciela)} />
              {selectedDistribucion.notas && <DetailRow label="Notas" value={selectedDistribucion.notas} />}
            </>
          )}
        </div>
      </BottomSheet>

      {/* ── Gasto bottom sheet ───────────────────────────────────────── */}
      <BottomSheet open={!!selectedGasto} onClose={() => { setSelectedGasto(null); setEditingGasto(false); }}>
        {selectedGasto && editingGasto ? (
          <EditGastoForm
            gasto={selectedGasto}
            categorias={categorias}
            onCancel={() => setEditingGasto(false)}
            onSaved={() => { setSelectedGasto(null); setEditingGasto(false); router.refresh(); }}
          />
        ) : selectedGasto ? (
          <div className="px-5 pb-8 pt-5 space-y-1">
            <div className="flex items-center justify-between pr-12 mb-3">
              <p className="text-base font-semibold text-gray-900">Detalle del gasto</p>
              <button
                type="button"
                onClick={() => setEditingGasto(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>
            <DetailRow label="Fecha"       value={fmtFull(selectedGasto.fecha)} />
            <DetailRow label="Categoría"   value={selectedGasto.categoriaNombre} />
            <DetailRow label="Descripción" value={selectedGasto.descripcion} />
            <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500 shrink-0 pt-0.5">Pagado por</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", PAGADOR_COLORS[selectedGasto.pagadoPor] ?? "bg-gray-100 text-gray-600")}>
                {PAGADOR_LABELS[selectedGasto.pagadoPor] ?? selectedGasto.pagadoPor}
              </span>
            </div>
            {selectedGasto.notas && <DetailRow label="Notas" value={selectedGasto.notas} />}
            <DetailRow label="Monto" value={fmt(selectedGasto.monto)} highlight />
          </div>
        ) : null}
      </BottomSheet>

    </div>
  );
}
