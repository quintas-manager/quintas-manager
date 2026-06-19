"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { reservaSchema, type ReservaFormValues } from "@/lib/schemas/reservas";
import { crearReserva, actualizarReserva } from "@/lib/actions/reservas";
import { ClienteSearch, type ClienteOption } from "@/components/clientes/ClienteSearch";
import { DateRangePicker, type BlockedRange } from "@/components/reservas/DateRangePicker";
import { MonedaInput } from "@/components/ui/MonedaInput";
import { fetchTipoCambioAction } from "@/lib/actions/dolar";
import { formatARS } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuintaOption {
  id:               string;
  nombre:           string;
  colorHex:         string;
  capacidadAdultos: number;
  capacidadNinos:   number;
}

interface ReservaFormProps {
  quintas:       QuintaOption[];
  clientes:      ClienteOption[];
  defaultValues?: Partial<ReservaFormValues> & { id?: string };
  mode:          "crear" | "editar";
  forceEstado?:  "CONFIRMADA" | "PENDIENTE";
  tipoCambio:    number;
}

const ESTADO_OPTIONS = [
  { value: "PENDIENTE",  label: "Pendiente"  },
  { value: "CONFIRMADA", label: "Confirmada" },
  { value: "CANCELADA",  label: "Cancelada"  },
  { value: "COMPLETADA", label: "Completada" },
] as const;

// ── Field helpers ─────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-gray-700">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;
}

const inputBase =
  "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-offset-0";
const inputCls = (err?: string) =>
  cn(
    inputBase,
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

// ── Component ─────────────────────────────────────────────────────────────────

export function ReservaForm({
  quintas,
  clientes: initialClientes,
  defaultValues,
  mode,
  forceEstado,
  tipoCambio,
}: ReservaFormProps) {
  const router    = useRouter();
  const reservaId = defaultValues?.id;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservaFormValues>({
    resolver:      zodResolver(reservaSchema),
    defaultValues: {
      estado:       "PENDIENTE" as const,
      tieneMascota: false,
      ...defaultValues,
      ...(forceEstado ? { estado: forceEstado } : {}),
    },
  });

  const [disponibilidad, setDisponibilidad] = useState<
    null | "checking" | "disponible" | "ocupado"
  >(null);
  const [conflictoInfo, setConflictoInfo] = useState<string | null>(null);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [tc, setTc] = useState(tipoCambio);
  const [refreshingTC, setRefreshingTC] = useState(false);

  async function refreshTC() {
    setRefreshingTC(true);
    try {
      const nuevoTC = await fetchTipoCambioAction();
      if (nuevoTC > 0) setTc(nuevoTC);
    } finally {
      setRefreshingTC(false);
    }
  }

  const [quintaId, fechaInicio, fechaFin, sena, tieneMascota] = watch([
    "quintaId", "fechaInicio", "fechaFin", "sena", "tieneMascota",
  ]);

  const [cargoMascotaARS, setCargoMascotaARS] = useState(
    defaultValues?.cargoMascotaARS ?? 20000,
  );

  useEffect(() => {
    if (tieneMascota) {
      const usd = tc > 0 ? cargoMascotaARS / tc : 0;
      setValue("cargoMascotaARS", cargoMascotaARS);
      setValue("cargoMascotaUSD", usd > 0 ? usd : undefined);
    } else {
      setValue("cargoMascotaARS", undefined);
      setValue("cargoMascotaUSD", undefined);
      setValue("cargoMascotaPagado", false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieneMascota, cargoMascotaARS, tc]);

  const selectedQuinta = quintas.find((q) => q.id === quintaId);
  const quintaColor    = selectedQuinta?.colorHex ?? "#9ca3af";
  const maxPersonas    = selectedQuinta?.capacidadAdultos ?? 20;
  const tieneSeña      = typeof sena === "number" && sena > 0;

  // ── Fetch blocked ranges when quinta changes ───────────────────────────────

  useEffect(() => {
    if (!quintaId) { setBlockedRanges([]); return; }

    const desde = new Date(Date.now() - 365 * 86400000).toISOString();
    const hasta = new Date(Date.now() + 365 * 86400000).toISOString();
    const params = new URLSearchParams({
      quintaId, desde, hasta,
      ...(reservaId ? { excludeId: reservaId } : {}),
    });

    fetch(`/api/reservas?${params}`)
      .then((r) => r.json())
      .then((data: { fechaInicio: string; fechaFin: string; estado: string }[]) => {
        setBlockedRanges(
          data.map((r) => ({
            start:  r.fechaInicio.substring(0, 10),
            end:    r.fechaFin.substring(0, 10),
            estado: r.estado,
          })),
        );
      })
      .catch(() => setBlockedRanges([]));
  }, [quintaId, reservaId]);

  // ── Disponibilidad check ──────────────────────────────────────────────────

  const checkDisponibilidad = useCallback(
    async (qId: string, fi: string, ff: string) => {
      if (!qId || !fi || !ff) { setDisponibilidad(null); return; }
      setDisponibilidad("checking");
      setConflictoInfo(null);
      try {
        const params = new URLSearchParams({
          quintaId: qId, desde: fi, hasta: ff,
          ...(reservaId ? { excludeId: reservaId } : {}),
        });
        const res  = await fetch(`/api/reservas/disponibilidad?${params}`);
        const data = await res.json();
        if (data.disponible) {
          setDisponibilidad("disponible");
        } else {
          setDisponibilidad("ocupado");
          const c   = data.conflicto;
          const fi2 = format(parseISO(c.fechaInicio), "d/MM/yy", { locale: es });
          const ff2 = format(parseISO(c.fechaFin),    "d/MM/yy", { locale: es });
          setConflictoInfo(`Ocupada por ${c.clienteNombre} (${fi2} – ${ff2})`);
        }
      } catch {
        setDisponibilidad(null);
      }
    },
    [reservaId],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (quintaId && fechaInicio && fechaFin) {
        checkDisponibilidad(quintaId, fechaInicio, fechaFin);
      } else {
        setDisponibilidad(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [quintaId, fechaInicio, fechaFin, checkDisponibilidad]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: ReservaFormValues) => {
    if (disponibilidad === "ocupado") {
      toast.error("Las fechas seleccionadas están ocupadas.");
      return;
    }
    const result =
      mode === "editar" && reservaId
        ? await actualizarReserva(reservaId, data)
        : await crearReserva(data);

    if (result.success) {
      toast.success(mode === "editar" ? "Reserva actualizada" : "Reserva creada");
      router.push(`/reservas/${"data" in result ? result.data.id : reservaId}`);
    } else {
      toast.error(result.error);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24 md:pb-6">

      {/* TC Banner */}
      {tc > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-blue-700">TC Blue: {formatARS(tc)}</span>
          <button
            type="button"
            onClick={refreshTC}
            disabled={refreshingTC}
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 transition disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", refreshingTC && "animate-spin")} />
            Actualizar
          </button>
        </div>
      )}

      {/* ── 1. Quinta ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Quinta</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quintas.map((q) => (
            <label
              key={q.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition",
                quintaId === q.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <input type="radio" value={q.id} {...register("quintaId")} className="sr-only" />
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: q.colorHex }} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{q.nombre}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {q.capacidadAdultos} adultos{q.capacidadNinos > 0 ? ` · ${q.capacidadNinos} niños` : ""}
                </p>
              </div>
              {quintaId === q.id && (
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-gray-900" />
              )}
            </label>
          ))}
        </div>
        <FieldError msg={errors.quintaId?.message} />
      </section>

      {/* ── 2. Cliente ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Cliente</h2>
        <Controller
          name="clienteId"
          control={control}
          render={({ field }) => (
            <ClienteSearch
              value={field.value ?? ""}
              onChange={field.onChange}
              initialClientes={initialClientes}
              error={errors.clienteId?.message}
            />
          )}
        />
      </section>

      {/* ── 3. Fechas (range picker) ────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Fechas</h2>

        {/* Hidden inputs for form validation */}
        <input type="hidden" {...register("fechaInicio")} />
        <input type="hidden" {...register("fechaFin")} />

        <DateRangePicker
          startDate={fechaInicio ?? ""}
          endDate={fechaFin ?? ""}
          onChange={(start, end) => {
            setValue("fechaInicio", start, { shouldValidate: !!start });
            setValue("fechaFin",    end,   { shouldValidate: !!end });
          }}
          quintaColor={quintaColor}
          blockedRanges={blockedRanges}
          error={errors.fechaInicio?.message ?? errors.fechaFin?.message}
        />

        {disponibilidad && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
              disponibilidad === "checking"   && "bg-gray-50 text-gray-500",
              disponibilidad === "disponible" && "bg-green-50 text-green-700",
              disponibilidad === "ocupado"    && "bg-red-50 text-red-700",
            )}
          >
            {disponibilidad === "checking"   && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            {disponibilidad === "disponible" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {disponibilidad === "ocupado"    && <XCircle className="h-4 w-4 shrink-0" />}
            <span>
              {disponibilidad === "checking"   && "Verificando disponibilidad…"}
              {disponibilidad === "disponible" && "Fechas disponibles"}
              {disponibilidad === "ocupado"    && `Fechas ocupadas · ${conflictoInfo}`}
            </span>
          </div>
        )}
      </section>

      {/* ── 4–6. Personas, mascota, motivo ─────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Detalles</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Cantidad de personas</Label>
              <select
                {...register("cantidadPersonas", { valueAsNumber: true })}
                className={inputCls(errors.cantidadPersonas?.message)}
              >
                <option value="">— Seleccioná —</option>
                {Array.from({ length: maxPersonas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} persona{n !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Controller
                name="tieneMascota"
                control={control}
                render={({ field }) => (
                  <input
                    id="tieneMascota"
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                )}
              />
              <label htmlFor="tieneMascota" className="cursor-pointer select-none text-sm text-gray-700">
                ¿Trae mascota?
              </label>
            </div>
          </div>

          {tieneMascota && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🐾</span>
                <span className="text-sm font-medium text-orange-800">Cargo por mascota</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">ARS $</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={cargoMascotaARS}
                    onChange={(e) => setCargoMascotaARS(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-orange-200 bg-white pl-12 pr-2 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                {tc > 0 && cargoMascotaARS > 0 && (
                  <span className="text-xs text-orange-700">
                    = USD {(cargoMascotaARS / tc).toLocaleString("es-AR", { maximumFractionDigits: 2 })} al TC actual
                  </span>
                )}
              </div>
              <Controller
                name="cargoMascotaPagado"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-orange-800">
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                    />
                    Ya abonó el cargo de mascota
                  </label>
                )}
              />
            </div>
          )}

          <div>
            <Label>Motivo del evento</Label>
            <input
              {...register("motivoEvento")}
              placeholder="Ej: Cumpleaños, Vacaciones…"
              className={inputCls(errors.motivoEvento?.message)}
            />
          </div>

          {!forceEstado && (
            <div>
              <Label required>Estado</Label>
              <select {...register("estado")} className={inputCls(errors.estado?.message)}>
                {ESTADO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <FieldError msg={errors.estado?.message} />
            </div>
          )}
        </div>
      </section>

      {/* ── 7–9. Monto, seña, método de pago ───────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Monto</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MonedaInput
            label="Monto total"
            required
            tipoCambioInicial={tc}
            initialValueUSD={defaultValues?.montoTotal as number | undefined}
            initialMoneda={(defaultValues?.monedaIngreso as "USD" | "ARS") ?? "USD"}
            initialARS={defaultValues?.montoTotalARS as number | undefined}
            initialTC={defaultValues?.tipoCambioReserva as number | undefined}
            error={errors.montoTotal?.message}
            onValueChange={(usd, ars, tcUsado, monedaUsada) => {
              setValue("montoTotal", usd, { shouldValidate: true });
              setValue("montoTotalARS", ars > 0 ? ars : undefined);
              setValue("tipoCambioReserva", tcUsado > 0 ? tcUsado : undefined);
              setValue("monedaIngreso", monedaUsada);
            }}
          />
          <MonedaInput
            label="Seña"
            tipoCambioInicial={tc}
            initialValueUSD={defaultValues?.sena as number | null | undefined ?? undefined}
            initialMoneda={defaultValues?.senaARS ? "ARS" : "USD"}
            initialARS={defaultValues?.senaARS as number | undefined}
            initialTC={defaultValues?.tipoCambioSena as number | undefined}
            error={errors.sena?.message}
            onValueChange={(usd, ars, tcUsado) => {
              setValue("sena", usd > 0 ? usd : null);
              setValue("senaARS", ars > 0 ? ars : undefined);
              setValue("tipoCambioSena", tcUsado > 0 ? tcUsado : undefined);
            }}
          />
        </div>

        {tieneSeña && mode === "crear" && (
          <div className="mt-4">
            <Label>Método de pago de la seña</Label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "MERCADOPAGO"] as const).map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-200 p-2.5 text-sm transition has-[:checked]:border-gray-900 has-[:checked]:bg-gray-50 hover:border-gray-300"
                >
                  <input
                    type="radio"
                    value={m}
                    {...register("metodoPagoSeña")}
                    defaultChecked={m === "EFECTIVO"}
                    className="sr-only"
                  />
                  <span className="text-xs font-medium text-gray-900">
                    {m === "EFECTIVO"      && "Efectivo"}
                    {m === "TRANSFERENCIA" && "Transferencia"}
                    {m === "TARJETA"       && "Tarjeta"}
                    {m === "MERCADOPAGO"   && "MercadoPago"}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-blue-600">
              La seña se registrará automáticamente como pago al crear la reserva.
            </p>
          </div>
        )}
      </section>

      {/* ── 10. Notas ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Notas</h2>
        <textarea
          {...register("notas")}
          rows={3}
          placeholder="Observaciones, requerimientos especiales…"
          className={cn(inputCls(errors.notas?.message), "resize-none")}
        />
      </section>

      {/* ── Actions ────────────────────────────────────────────────── */}
      {/* Mobile: full-width stacked buttons */}
      <div className="flex flex-col gap-3 md:hidden">
        <button
          type="submit"
          disabled={isSubmitting || disponibilidad === "ocupado"}
          onPointerDown={(e) => e.preventDefault()}
          onPointerUp={(e) => {
            if (!isSubmitting && disponibilidad !== "ocupado") {
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gray-900 text-base font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 mb-6"
        >
          {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
          {mode === "editar" ? "Guardar cambios" : "Crear reserva"}
        </button>
        <button
          type="button"
          onClick={() => reservaId ? router.push(`/reservas/${reservaId}`) : router.back()}
          className="w-full rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>

      {/* Desktop: inline end-aligned */}
      <div className="hidden md:flex justify-end gap-3">
        <button
          type="button"
          onClick={() => reservaId ? router.push(`/reservas/${reservaId}`) : router.back()}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || disponibilidad === "ocupado"}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "editar" ? "Guardar cambios" : "Crear reserva"}
        </button>
      </div>

      <div className="h-20 md:h-0" />
    </form>
  );
}
