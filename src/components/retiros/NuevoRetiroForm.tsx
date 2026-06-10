"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { crearRetiro } from "@/lib/actions/retiros";
import { retiroSchema, type RetiroFormValues } from "@/lib/schemas/retiros";
import { cn } from "@/lib/utils";

interface QuintaOpt { id: string; nombre: string }

const RETIRADORES = [
  { value: "GRACIELA", label: "Graciela" },
  { value: "MATIAS",   label: "Matías" },
  { value: "ROCIO",    label: "Rocío" },
] as const;

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function NuevoRetiroForm({ quintas }: { quintas: QuintaOpt[] }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RetiroFormValues>({
    resolver: zodResolver(retiroSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = async (data: RetiroFormValues) => {
    const result = await crearRetiro(data);
    if (result && !result.success) {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <Field label="Quinta" required error={errors.quintaId?.message}>
        <select {...register("quintaId")} className={inputCls(errors.quintaId?.message)}>
          <option value="">Seleccioná...</option>
          {quintas.map((q) => <option key={q.id} value={q.id}>{q.nombre}</option>)}
        </select>
      </Field>

      <Field label="¿Quién retira?" required error={errors.realizadoPor?.message}>
        <div className="flex gap-2 flex-wrap">
          {RETIRADORES.map((r) => (
            <label
              key={r.value}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition",
                watch("realizadoPor") === r.value
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-400",
              )}
            >
              <input type="radio" value={r.value} {...register("realizadoPor")} className="sr-only" />
              {r.label}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto" required error={errors.monto?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input
              type="number" min={0} step="0.01"
              {...register("monto", { valueAsNumber: true })}
              placeholder="0"
              className={cn(inputCls(errors.monto?.message), "pl-6")}
            />
          </div>
        </Field>
        <Field label="Fecha" required error={errors.fecha?.message}>
          <input type="date" {...register("fecha")} className={inputCls(errors.fecha?.message)} />
        </Field>
      </div>

      <Field label="Notas" error={errors.notas?.message}>
        <textarea
          {...register("notas")} rows={2}
          placeholder="Motivo u observaciones..."
          className={cn(inputCls(), "resize-none")}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition disabled:opacity-60 min-h-[44px]"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar Retiro
        </button>
      </div>
    </form>
  );
}
