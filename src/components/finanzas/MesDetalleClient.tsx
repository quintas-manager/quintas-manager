"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Lock, CheckCircle2, X, Pencil, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import { MontoDisplay } from "@/components/ui/MontoDisplay";
import { CerrarMesButton } from "@/components/finanzas/CerrarMesButton";
import { actualizarGasto } from "@/lib/actions/gastos";
import { gastoSchema, type GastoFormValues } from "@/lib/schemas/gastos";
import type { MesCalculado, PagoDetalle, GastoDetalle, RetiroDetalle } from "@/lib/actions/finanzas";

export interface CategoriaOpt { id: string; nombre: string }

// ── Formatters ────────────────────────────────────────────────────────────────

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta", MERCADOPAGO: "MercadoPago",
};
const PAGADOR_LABELS: Record<string, string> = {
  CAJA: "Caja", GRACIELA: "Graciela", MATIAS: "Matías", ROCIO: "Rocío",
};
const RETIRADOR_LABELS: Record<string, string> = {
  GRACIELA: "Graciela", MATIAS: "Matías", ROCIO: "Rocío",
};
const RETIRADOR_COLORS: Record<string, string> = {
  GRACIELA: "bg-purple-100 text-purple-700",
  MATIAS:   "bg-blue-100 text-blue-700",
  ROCIO:    "bg-pink-100 text-pink-700",
};

const PAGADOR_COLORS: Record<string, string> = {
  GRACIELA: "bg-purple-100 text-purple-700",
  MATIAS:   "bg-blue-100 text-blue-700",
  ROCIO:    "bg-pink-100 text-pink-700",
  CAJA:     "bg-gray-100 text-gray-600",
};

const fmt = formatUSD;

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

// ── Bottom sheet component ────────────────────────────────────────────────────

function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  quintaId: string;
  mes: number;
  anio: number;
  mesNombre: string;
  esCerrado: boolean;
  data: MesCalculado;
  categorias: CategoriaOpt[];
  totalIngresos: number;
  totalGastos: number;
  resultado: number;
  parteGraciela: number;
  parteMatias: number;
  reintegrosGraciela: number;
  reintegrosMatias: number;
  retirosGraciela: number;
  retirosMatias: number;
  retirosRocio: number;
  cobrarGraciela: number;
  cobrarMatias: number;
}

// ── Main component ────────────────────────────────────────────────────────────

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

function EditGastoForm({
  gasto,
  categorias,
  onCancel,
  onSaved,
}: {
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
    if (result.success) {
      toast.success("Gasto actualizado");
      onSaved();
    } else {
      toast.error(result.error);
    }
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
            <input
              type="number" min={0} step="0.01"
              {...register("monto", { valueAsNumber: true })}
              className={cn(inputCls(errors.monto?.message), "pl-6")}
            />
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
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {errors.categoriaId && <p className="mt-1 text-xs text-red-500">{errors.categoriaId.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Pagado por <span className="text-red-500">*</span></label>
        <div className="flex gap-2 flex-wrap">
          {PAGADORES.map((p) => (
            <label
              key={p.value}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition",
                watch("pagadoPor") === p.value
                  ? p.value === "CAJA"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-400",
              )}
            >
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
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  );
}

export function MesDetalleClient({
  quintaId, mes, anio, mesNombre, esCerrado, data, categorias,
  totalIngresos, totalGastos, resultado,
  parteGraciela, parteMatias,
  reintegrosGraciela, reintegrosMatias,
  retirosGraciela, retirosMatias, retirosRocio,
  cobrarGraciela, cobrarMatias,
}: Props) {
  const router = useRouter();
  const [selectedPago,   setSelectedPago]   = useState<PagoDetalle | null>(null);
  const [selectedGasto,  setSelectedGasto]  = useState<GastoDetalle | null>(null);
  const [selectedRetiro, setSelectedRetiro] = useState<RetiroDetalle | null>(null);
  const [editingGasto,   setEditingGasto]   = useState(false);

  const cerrarMesProps = {
    quintaId, mes, anio, mesNombre,
    cobrarGraciela, cobrarMatias,
    parteGraciela, parteMatias,
    reintegrosGraciela, reintegrosMatias,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-4 pb-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/finanzas/${quintaId}`}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
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
        {/* Desktop CerrarMes */}
        {!esCerrado && (
          <div className="hidden sm:block shrink-0">
            <CerrarMesButton {...cerrarMesProps} />
          </div>
        )}
      </div>

      {/* ── Cierre badge ────────────────────────────────────────────── */}
      {esCerrado && (
        <div className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
          <CheckCircle2 className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
          <span>
            Cerrado el {fmtFull(data.cierre!.fechaCierre)} por {data.cierre!.cerradoPorNombre}.
            Los valores son el snapshot al momento del cierre.
          </span>
        </div>
      )}

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
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors"
                  onClick={() => setSelectedPago(p)}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtShort(p.fecha)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[120px] truncate">{p.clienteNombre}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <MontoDisplay
                      montoUSD={p.monto}
                      moneda={p.moneda}
                      montoARS={p.montoARS}
                      tipoCambio={p.tipoCambio}
                      size="sm"
                      className="items-end"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-900">Total ingresos</span>
          <span className="text-sm font-bold text-green-600">{fmt(totalIngresos)}</span>
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
                <tr
                  key={g.id}
                  className="hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors"
                  onClick={() => setSelectedGasto(g)}
                >
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
          <span className="text-sm font-bold text-red-600">{fmt(totalGastos)}</span>
        </div>
      </section>

      {/* ── Retiros ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-orange-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-orange-100">
          <SectionTitle>Retiros del mes</SectionTitle>
        </div>
        {data.retiros.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400">Sin retiros registrados este mes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-orange-50 border-b border-orange-100">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quién retiró</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-50">
              {data.retiros.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-orange-50 cursor-pointer active:bg-orange-100 transition-colors"
                  onClick={() => setSelectedRetiro(r)}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtShort(r.fecha)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", RETIRADOR_COLORS[r.realizadoPor] ?? "bg-gray-100 text-gray-600")}>
                      {RETIRADOR_LABELS[r.realizadoPor] ?? r.realizadoPor}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(r.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-orange-100 bg-orange-50">
          <span className="text-sm font-semibold text-gray-900">Total retiros</span>
          <span className="text-sm font-bold text-orange-600">
            {fmt(data.retiros.reduce((s, r) => s + r.monto, 0))}
          </span>
        </div>
      </section>

      {/* ── Resultado ───────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Resultado</SectionTitle>
        <div className="space-y-3">
          {/* Card 1: resumen */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Ingresos</span>
              <span className="text-sm font-semibold text-green-600">{fmt(totalIngresos)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Gastos</span>
              <span className="text-sm font-semibold text-red-600">{fmt(totalGastos)}</span>
            </div>
            {retirosRocio > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Retiros Rocío</span>
                <span className="text-sm font-semibold text-orange-600">- {fmt(retirosRocio)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Resultado neto</span>
              <span className={cn("text-base font-bold", resultado >= 0 ? "text-green-600" : "text-red-600")}>
                {fmt(resultado)}
              </span>
            </div>
          </div>

          {/* Card 2: división */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Parte Graciela</span>
              <span className="text-sm font-semibold text-gray-900">{fmt(parteGraciela)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Parte Matías</span>
              <span className="text-sm font-semibold text-gray-900">{fmt(parteMatias)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reintegros pendientes (solo si abierto) ─────────────────── */}
      {!esCerrado && (data.reintegrosGraciela.length > 0 || data.reintegrosMatias.length > 0) && (
        <section>
          <SectionTitle>Reintegros pendientes</SectionTitle>
          <div className="space-y-3">
            {[
              { nombre: "Graciela", items: data.reintegrosGraciela, total: data.totalReintegrosGraciela },
              { nombre: "Matías",   items: data.reintegrosMatias,   total: data.totalReintegrosMatias },
            ].map(({ nombre, items, total }) =>
              items.length > 0 ? (
                <div key={nombre} className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-100">
                    <p className="text-sm font-semibold text-amber-900">💰 Reintegros {nombre}</p>
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

      {/* ── Cobro final ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Cobro final</SectionTitle>
        <div className="space-y-3">
          {[
            { nombre: "Graciela", parte: parteGraciela, reintegros: reintegrosGraciela, retiros: retirosGraciela, total: cobrarGraciela },
            { nombre: "Matías",   parte: parteMatias,   reintegros: reintegrosMatias,   retiros: retirosMatias,   total: cobrarMatias },
          ].map(({ nombre, parte, reintegros, retiros, total }) => (
            <div key={nombre} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500 mb-1">👤 {nombre} cobra</p>
              <p className={cn("text-3xl font-bold mb-4", total >= 0 ? "text-green-600" : "text-red-600")}>
                {fmt(total)}
              </p>
              <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Parte del resultado</span>
                  <span className="font-medium text-gray-700">{fmt(parte)}</span>
                </div>
                {reintegros > 0 && (
                  <div className="flex justify-between">
                    <span>+ Reintegros pendientes</span>
                    <span className="font-medium text-gray-700">{fmt(reintegros)}</span>
                  </div>
                )}
                {retiros > 0 && (
                  <div className="flex justify-between">
                    <span>- Retiros realizados</span>
                    <span className="font-medium text-orange-600">{fmt(retiros)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-gray-100">
                  <span className="font-semibold text-gray-700">Total a cobrar</span>
                  <span className={cn("font-bold", total >= 0 ? "text-green-600" : "text-red-600")}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cerrar Mes — mobile full-width button ───────────────────── */}
      {!esCerrado && (
        <div className="sm:hidden">
          <CerrarMesButton
            {...cerrarMesProps}
            triggerClassName="w-full min-h-[56px] text-base bg-green-600 hover:bg-green-700 justify-center"
          />
        </div>
      )}

      {/* ── Pago bottom sheet ────────────────────────────────────────── */}
      <BottomSheet open={!!selectedPago} onClose={() => setSelectedPago(null)}>
        <div className="px-5 pb-8 pt-5 space-y-1">
          <p className="text-base font-semibold text-gray-900 pr-12 mb-3">Detalle del ingreso</p>
          {selectedPago && (
            <>
              <DetailRow label="Fecha"   value={fmtFull(selectedPago.fecha)} />
              <DetailRow label="Cliente" value={selectedPago.clienteNombre} />
              <DetailRow
                label="Estadía"
                value={`${fmtFull(selectedPago.reservaFechaInicio)} → ${fmtFull(selectedPago.reservaFechaFin)}`}
              />
              <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 shrink-0 pt-0.5">Pago</span>
                <div className="text-right">
                  {selectedPago.moneda === "ARS" && selectedPago.montoARS && selectedPago.tipoCambio ? (
                    <>
                      <p className="text-base font-bold text-green-600">
                        ARS {selectedPago.montoARS.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{" "}
                        en {METODO_LABELS[selectedPago.metodoPago] ?? selectedPago.metodoPago}
                      </p>
                      <p className="text-xs text-gray-500">
                        Equivalente a USD {selectedPago.monto.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
                        al TC ${selectedPago.tipoCambio.toLocaleString("es-AR")}
                      </p>
                    </>
                  ) : (
                    <p className="text-base font-bold text-green-600">
                      USD {selectedPago.monto.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
                      en {METODO_LABELS[selectedPago.metodoPago] ?? selectedPago.metodoPago}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </BottomSheet>

      {/* ── Retiro bottom sheet ─────────────────────────────────────── */}
      <BottomSheet open={!!selectedRetiro} onClose={() => setSelectedRetiro(null)}>
        <div className="px-5 pb-8 pt-5 space-y-1">
          <p className="text-base font-semibold text-gray-900 pr-12 mb-3">Detalle del retiro</p>
          {selectedRetiro && (
            <>
              <DetailRow label="Fecha"       value={fmtFull(selectedRetiro.fecha)} />
              <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 shrink-0 pt-0.5">Quién retiró</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", RETIRADOR_COLORS[selectedRetiro.realizadoPor] ?? "bg-gray-100 text-gray-600")}>
                  {RETIRADOR_LABELS[selectedRetiro.realizadoPor] ?? selectedRetiro.realizadoPor}
                </span>
              </div>
              {selectedRetiro.notas && <DetailRow label="Notas" value={selectedRetiro.notas} />}
              <DetailRow label="Monto" value={fmt(selectedRetiro.monto)} highlight />
            </>
          )}
        </div>
      </BottomSheet>

      {/* ── Gasto bottom sheet ───────────────────────────────────────── */}
      <BottomSheet
        open={!!selectedGasto}
        onClose={() => { setSelectedGasto(null); setEditingGasto(false); }}
      >
        {selectedGasto && editingGasto ? (
          <EditGastoForm
            gasto={selectedGasto}
            categorias={categorias}
            onCancel={() => setEditingGasto(false)}
            onSaved={() => {
              setSelectedGasto(null);
              setEditingGasto(false);
              router.refresh();
            }}
          />
        ) : selectedGasto ? (
          <div className="px-5 pb-8 pt-5 space-y-1">
            <div className="flex items-center justify-between pr-12 mb-3">
              <p className="text-base font-semibold text-gray-900">Detalle del gasto</p>
              {!esCerrado && (
                <button
                  type="button"
                  onClick={() => setEditingGasto(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
            </div>
            <DetailRow label="Fecha"       value={fmtFull(selectedGasto.fecha)} />
            <DetailRow label="Categoría"   value={selectedGasto.categoriaNombre} />
            <DetailRow label="Descripción" value={selectedGasto.descripcion} />
            <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500 shrink-0 pt-0.5">Pagado por</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  PAGADOR_COLORS[selectedGasto.pagadoPor] ?? "bg-gray-100 text-gray-600"
                )}
              >
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
