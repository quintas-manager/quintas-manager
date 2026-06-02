"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { reservaPendienteSchema, type ReservaPendienteFormValues } from "@/lib/schemas/reservas";
import { crearReservaPendiente } from "@/lib/actions/reservas";
import { ClienteSearch, type ClienteOption } from "@/components/clientes/ClienteSearch";

interface QuintaOption {
  id: string;
  nombre: string;
  colorHex: string;
  capacidadAdultos: number;
  capacidadNinos: number;
}

interface ReservaPendienteFormProps {
  quintas: QuintaOption[];
  clientes: ClienteOption[];
  defaultValues?: Partial<ReservaPendienteFormValues>;
}

const TIPO_OPTIONS = [
  { value: "DIA",           label: "Por día" },
  { value: "FIN_DE_SEMANA", label: "Fin de semana" },
  { value: "SEMANA",        label: "Semana" },
  { value: "QUINCENA",      label: "Quincena" },
  { value: "MES",           label: "Mes completo" },
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

const inputBase =
  "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-offset-0";
const inputCls = (err?: string) =>
  cn(
    inputBase,
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200"
  );

export function ReservaPendienteForm({
  quintas,
  clientes: initialClientes,
  defaultValues,
}: ReservaPendienteFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservaPendienteFormValues>({
    resolver: zodResolver(reservaPendienteSchema),
    defaultValues: { tieneMascota: false, ...defaultValues },
  });

  const [disponibilidad, setDisponibilidad] = useState<
    null | "checking" | "disponible" | "ocupado"
  >(null);
  const [conflictoInfo, setConflictoInfo] = useState<string | null>(null);

  const [quintaId, fechaInicio, fechaFin, tipoAlquiler] = watch([
    "quintaId", "fechaInicio", "fechaFin", "tipoAlquiler",
  ]);

  const selectedQuinta = quintas.find((q) => q.id === quintaId);
  const maxPersonas    = selectedQuinta?.capacidadAdultos ?? 10;

  const checkDisponibilidad = useCallback(
    async (qId: string, fi: string, ff: string) => {
      if (!qId || !fi || !ff) { setDisponibilidad(null); return; }
      setDisponibilidad("checking");
      setConflictoInfo(null);
      try {
        const params = new URLSearchParams({ quintaId: qId, desde: fi, hasta: ff });
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
    [],
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

  const onSubmit = async (data: ReservaPendienteFormValues) => {
    if (disponibilidad === "ocupado") {
      toast.error("Las fechas seleccionadas están ocupadas.");
      return;
    }
    const result = await crearReservaPendiente(data);
    if (result.success) {
      toast.success("Reserva pendiente creada");
      router.push(`/reservas/${"data" in result ? result.data.id : ""}`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          Esta reserva bloqueará las fechas seleccionadas hasta que sea confirmada o cancelada.
        </p>
      </div>

      {/* Quinta */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quinta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quintas.map((q) => (
            <label
              key={q.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition",
                quintaId === q.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <input
                type="radio"
                value={q.id}
                {...register("quintaId")}
                className="sr-only"
              />
              <span
                className="mt-0.5 h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: q.colorHex }}
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{q.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {q.capacidadAdultos} adultos
                  {q.capacidadNinos > 0 ? ` · ${q.capacidadNinos} niños` : ""}
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

      {/* Cliente */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Cliente</h2>
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

      {/* Fechas */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Fechas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Fecha de inicio</Label>
            <input
              type="date"
              {...register("fechaInicio")}
              className={inputCls(errors.fechaInicio?.message)}
            />
            <FieldError msg={errors.fechaInicio?.message} />
          </div>
          <div>
            <Label required>Fecha de fin</Label>
            <input
              type="date"
              {...register("fechaFin")}
              className={inputCls(errors.fechaFin?.message)}
            />
            <FieldError msg={errors.fechaFin?.message} />
          </div>
        </div>

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

      {/* Tipo de alquiler */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Tipo de alquiler</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TIPO_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer flex-col rounded-lg border-2 p-3 transition",
                tipoAlquiler === opt.value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <input
                type="radio"
                value={opt.value}
                {...register("tipoAlquiler")}
                className="sr-only"
              />
              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
            </label>
          ))}
        </div>
        <FieldError msg={errors.tipoAlquiler?.message} />
      </section>

      {/* Detalles adicionales */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Detalles adicionales</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label htmlFor="tieneMascota" className="text-sm text-gray-700 cursor-pointer select-none">
                ¿Trae mascota?
              </label>
            </div>
          </div>
          <div>
            <Label>Notas internas</Label>
            <textarea
              {...register("notas")}
              rows={3}
              placeholder="Observaciones, requerimientos especiales..."
              className={cn(inputCls(errors.notas?.message), "resize-none")}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || disponibilidad === "ocupado"}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear reserva pendiente
        </button>
      </div>
    </form>
  );
}
