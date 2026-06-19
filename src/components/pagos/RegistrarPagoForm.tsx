"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import { pagoSchema, type PagoFormValues } from "@/lib/schemas/pagos";
import {
  crearPagoConDistribucion,
  getGastosPendientesPorQuinta,
  type GastoPendienteItem,
  type DistribucionInput,
} from "@/lib/actions/pagos";
import { MonedaInput } from "@/components/ui/MonedaInput";
import { fetchTipoCambioAction } from "@/lib/actions/dolar";
import { DistribucionStep } from "@/components/pagos/DistribucionStep";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReservaDeuda {
  id: string;
  quintaId: string;
  quintaNombre: string;
  quintaColor: string;
  fechaInicio: Date;
  fechaFin: Date;
  montoTotal: number;
  senaYPagos: number;
  saldoPendiente: number;
}

interface ClienteConDeuda {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  reservasConDeuda: ReservaDeuda[];
}

interface ReservaFlat extends ReservaDeuda {
  clienteId: string;
  clienteNombre: string;
  clienteApellido: string;
}

interface Props {
  clientes: ClienteConDeuda[];
  defaultReservaId?: string;
  defaultClienteId?: string;
  tipoCambio: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMonto = formatUSD;
const formatFecha = (d: Date) => format(new Date(d), "d MMM yy", { locale: es });

const METODO_OPTIONS = [
  { value: "EFECTIVO",      label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA",       label: "Tarjeta" },
  { value: "MERCADOPAGO",   label: "MercadoPago" },
] as const;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-700 mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;
}

const inputBase = "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-offset-0";
const inputCls = (err?: string) =>
  cn(inputBase, err ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-gray-400 focus:ring-gray-200");

// ── PagoFields ────────────────────────────────────────────────────────────────

function PagoFields({ selectedReserva, register, errors, setValue, tc }: {
  selectedReserva: ReservaFlat;
  register: ReturnType<typeof useForm<PagoFormValues>>["register"];
  errors: ReturnType<typeof useForm<PagoFormValues>>["formState"]["errors"];
  setValue: ReturnType<typeof useForm<PagoFormValues>>["setValue"];
  tc: number;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <MonedaInput
            label="Monto"
            required
            tipoCambioInicial={tc}
            error={errors.monto?.message}
            onValueChange={(usd, ars, tcUsado, monedaUsada) => {
              setValue("monto",      usd,            { shouldValidate: true });
              setValue("montoARS",   ars > 0 ? ars : undefined);
              setValue("tipoCambio", tcUsado > 0 ? tcUsado : undefined);
              setValue("moneda",     monedaUsada);
            }}
          />
          <p className="mt-1 text-xs text-gray-400">
            Saldo pendiente: {formatMonto(selectedReserva.saldoPendiente)}
          </p>
        </div>
        <div>
          <Label required>Fecha</Label>
          <input type="date" {...register("fecha")} className={inputCls(errors.fecha?.message)} />
          <FieldError msg={errors.fecha?.message} />
        </div>
      </div>

      <div>
        <Label required>Método de pago</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METODO_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-200 p-3 text-sm transition has-[:checked]:border-gray-900 has-[:checked]:bg-gray-50 hover:border-gray-300"
            >
              <input type="radio" value={opt.value} {...register("metodoPago")} className="sr-only" />
              <span className="font-medium text-gray-900">{opt.label}</span>
            </label>
          ))}
        </div>
        <FieldError msg={errors.metodoPago?.message} />
      </div>

      <div>
        <Label>Notas</Label>
        <textarea
          {...register("notas")}
          rows={2}
          placeholder="Ej: Transferencia bancaria ref. 123..."
          className={cn(inputCls(errors.notas?.message), "resize-none")}
        />
      </div>
    </div>
  );
}

// ── Pago step 1 data snapshot ─────────────────────────────────────────────────

interface PasoUnoCapture {
  formData: PagoFormValues;
  reserva: ReservaFlat;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RegistrarPagoForm({ clientes, defaultReservaId, defaultClienteId, tipoCambio }: Props) {
  const router = useRouter();

  // Step management
  const [paso, setPaso] = useState<1 | 2>(1);
  const [pasoUno, setPasoUno] = useState<PasoUnoCapture | null>(null);
  const [gastosPendientes, setGastosPendientes] = useState<GastoPendienteItem[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);

  // Step 1 UI state
  const [query, setQuery] = useState("");
  const [selectedReserva, setSelectedReserva] = useState<ReservaFlat | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  const [tc, setTc] = useState(tipoCambio);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (showSheet) requestAnimationFrame(() => setSheetVisible(true));
    else setSheetVisible(false);
  }, [showSheet]);

  const {
    register, handleSubmit, setValue,
    formState: { errors, isSubmitting },
  } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      fecha:      new Date().toISOString().split("T")[0],
      metodoPago: "EFECTIVO",
    },
  });

  const todasLasReservas: ReservaFlat[] = clientes.flatMap((c) =>
    c.reservasConDeuda.map((r) => ({
      ...r,
      clienteId:       c.id,
      clienteNombre:   c.nombre,
      clienteApellido: c.apellido,
    }))
  );

  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (didAutoSelect.current || !defaultReservaId) return;
    const target = todasLasReservas.find((r) => r.id === defaultReservaId);
    if (target) {
      didAutoSelect.current = true;
      selectReserva(target);
      if (defaultClienteId) {
        const cliente = clientes.find((c) => c.id === defaultClienteId);
        if (cliente) setQuery(`${cliente.nombre} ${cliente.apellido}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = todasLasReservas.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.clienteNombre.toLowerCase().includes(q) || r.clienteApellido.toLowerCase().includes(q);
  });

  function selectReserva(r: ReservaFlat) {
    setSelectedReserva(r);
    setValue("reservaId", r.id);
    setValue("monto", Math.round(r.saldoPendiente * 100) / 100);
    if (isMobile) setShowSheet(true);
    else setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => setShowSheet(false), 300);
  }

  // Transition to step 2
  const onSubmitPasoUno = async (data: PagoFormValues) => {
    if (!selectedReserva) return;
    setLoadingGastos(true);
    try {
      const gastos = await getGastosPendientesPorQuinta(selectedReserva.quintaId);
      setGastosPendientes(gastos);
    } finally {
      setLoadingGastos(false);
    }
    setPasoUno({ formData: data, reserva: selectedReserva });
    closeSheet();
    setPaso(2);
  };

  // Final submission
  async function confirmarDistribucion(dist: DistribucionInput) {
    if (!pasoUno) return;
    const result = await crearPagoConDistribucion(pasoUno.formData, dist);
    if (result.success) {
      toast.success("Pago y distribución registrados");
      router.push(`/reservas/${result.data.reservaId}`);
    } else {
      toast.error(result.error);
    }
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  if (paso === 2 && pasoUno) {
    return (
      <DistribucionStep
        montoTotalUSD={pasoUno.formData.monto}
        gastosPendientes={gastosPendientes}
        onConfirmar={confirmarDistribucion}
        onVolver={() => setPaso(1)}
      />
    );
  }

  // ── Step 1 ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmitPasoUno)} className="space-y-5">

      {/* Reservas table */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Reservas con saldo pendiente</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre de cliente..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm placeholder-gray-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
            />
          </div>
        </div>

        {todasLasReservas.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">No hay reservas con saldo pendiente.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-gray-400">Sin resultados para &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Cliente", "Quinta", "Fechas", "Total", "Pagado", "Saldo"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((r) => {
                    const selected = selectedReserva?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => selectReserva(r)}
                        className={cn("cursor-pointer transition-colors", selected ? "bg-gray-900 text-white" : "hover:bg-gray-50")}
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{r.clienteNombre} {r.clienteApellido}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.quintaColor }} />
                            <span className={cn(selected ? "text-gray-200" : "text-gray-700")}>{r.quintaNombre}</span>
                          </div>
                        </td>
                        <td className={cn("px-4 py-3 whitespace-nowrap", selected ? "text-gray-300" : "text-gray-600")}>
                          {formatFecha(r.fechaInicio)} → {formatFecha(r.fechaFin)}
                        </td>
                        <td className={cn("px-4 py-3 whitespace-nowrap", selected ? "text-gray-200" : "text-gray-700")}>{formatMonto(r.montoTotal)}</td>
                        <td className={cn("px-4 py-3 whitespace-nowrap", selected ? "text-gray-300" : "text-gray-500")}>{formatMonto(r.senaYPagos)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn("font-semibold", selected ? "text-red-300" : "text-red-600")}>{formatMonto(r.saldoPendiente)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((r) => {
                const selected = selectedReserva?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectReserva(r)}
                    className={cn("w-full text-left px-4 py-4 transition-colors", selected ? "bg-gray-900" : "hover:bg-gray-50")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn("font-medium truncate", selected ? "text-white" : "text-gray-900")}>
                          {r.clienteNombre} {r.clienteApellido}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.quintaColor }} />
                          <span className={cn("text-xs", selected ? "text-gray-300" : "text-gray-500")}>{r.quintaNombre}</span>
                        </div>
                        <p className={cn("text-xs mt-0.5", selected ? "text-gray-400" : "text-gray-500")}>
                          {formatFecha(r.fechaInicio)} → {formatFecha(r.fechaFin)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs", selected ? "text-gray-400" : "text-gray-500")}>{formatMonto(r.montoTotal)} total</p>
                        <p className={cn("font-semibold", selected ? "text-red-300" : "text-red-600")}>{formatMonto(r.saldoPendiente)}</p>
                        <p className={cn("text-[10px]", selected ? "text-gray-500" : "text-gray-400")}>pendiente</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <FieldError msg={errors.reservaId?.message} />
        <input type="hidden" {...register("reservaId")} />
      </section>

      {/* Desktop: datos del pago */}
      {selectedReserva && (
        <section ref={formRef} className="hidden md:block rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: selectedReserva.quintaColor }} />
            <h2 className="text-sm font-semibold text-gray-900">
              Pago — {selectedReserva.clienteNombre} {selectedReserva.clienteApellido} · {selectedReserva.quintaNombre}
            </h2>
          </div>
          <PagoFields selectedReserva={selectedReserva} register={register} errors={errors} setValue={setValue} tc={tc} />
        </section>
      )}

      {/* Desktop: actions */}
      <div className="hidden md:flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || loadingGastos || !selectedReserva}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {(isSubmitting || loadingGastos) && <Loader2 className="h-4 w-4 animate-spin" />}
          Continuar a distribución →
        </button>
      </div>

      {/* Mobile cancel */}
      <div className="md:hidden flex justify-end">
        <button type="button" onClick={() => router.back()} className="min-h-[44px] rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          Cancelar
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {showSheet && selectedReserva && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 transition-opacity duration-300"
            style={{ opacity: sheetVisible ? 1 : 0 }}
            onClick={closeSheet}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col transition-transform duration-300 ease-out"
            style={{ height: "85dvh", transform: sheetVisible ? "translateY(0)" : "translateY(100%)" }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Registrar Pago</h2>
              <button type="button" onClick={closeSheet} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-6">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1">
                <p className="font-medium text-gray-900">{selectedReserva.clienteNombre} {selectedReserva.clienteApellido}</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selectedReserva.quintaColor }} />
                  <span className="text-sm text-gray-600">{selectedReserva.quintaNombre}</span>
                </div>
                <p className="text-sm text-gray-500">{formatFecha(selectedReserva.fechaInicio)} → {formatFecha(selectedReserva.fechaFin)}</p>
                <p className="text-sm font-semibold text-red-600 pt-1">Saldo pendiente: {formatMonto(selectedReserva.saldoPendiente)}</p>
              </div>
              <PagoFields selectedReserva={selectedReserva} register={register} errors={errors} setValue={setValue} tc={tc} />
            </div>
            <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-white">
              <button
                type="submit"
                disabled={isSubmitting || loadingGastos}
                className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {(isSubmitting || loadingGastos) && <Loader2 className="h-4 w-4 animate-spin" />}
                Continuar a distribución →
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );

  function FieldError({ msg }: { msg?: string }) {
    return msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;
  }
}
