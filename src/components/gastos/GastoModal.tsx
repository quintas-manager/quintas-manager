"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { crearGasto, actualizarGasto } from "@/lib/actions/gastos";
import { gastoSchema, type GastoFormValues } from "@/lib/schemas/gastos";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface QuintaOpt    { id: string; nombre: string; colorHex: string }
export interface CategoriaOpt { id: string; nombre: string }

interface GastoExistente {
  id:          string;
  quintaId:    string;
  categoriaId: string;
  descripcion: string;
  monto:       number;
  fecha:       string; // yyyy-MM-dd
  pagadoPor:   string;
  notas:       string | null;
}

interface Props {
  quintas:    QuintaOpt[];
  categorias: CategoriaOpt[];
  gasto?:     GastoExistente;
  onClose:    () => void;
}

const PAGADORES = [
  { value: "CAJA",     label: "Caja" },
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

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function GastoModal({ quintas, categorias, gasto, onClose }: Props) {
  const router = useRouter();
  const isEdit = !!gasto;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GastoFormValues>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      quintaId:    gasto?.quintaId    ?? "",
      categoriaId: gasto?.categoriaId ?? "",
      descripcion: gasto?.descripcion ?? "",
      monto:       gasto?.monto       ?? undefined,
      fecha:       gasto?.fecha       ?? format(new Date(), "yyyy-MM-dd"),
      pagadoPor:   (gasto?.pagadoPor  ?? "CAJA") as GastoFormValues["pagadoPor"],
      notas:       gasto?.notas       ?? "",
    },
  });

  const pagadoPor = watch("pagadoPor");
  const esPersona = pagadoPor !== "CAJA";

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const onSubmit = async (data: GastoFormValues) => {
    const result = isEdit
      ? await actualizarGasto(gasto!.id, data)
      : await crearGasto(data);

    if (result.success) {
      toast.success(isEdit ? "Gasto actualizado" : "Gasto registrado");
      router.refresh();
      onClose();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? "Editar gasto" : "Registrar gasto"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          {/* Quinta + Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quinta" required error={errors.quintaId?.message}>
              <select {...register("quintaId")} className={inputCls(errors.quintaId?.message)}>
                <option value="">Seleccioná...</option>
                {quintas.map((q) => (
                  <option key={q.id} value={q.id}>{q.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Categoría" required error={errors.categoriaId?.message}>
              <select
                {...register("categoriaId")}
                className={inputCls(errors.categoriaId?.message)}
              >
                <option value="">Seleccioná...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Descripción */}
          <Field label="Descripción" required error={errors.descripcion?.message}>
            <input
              {...register("descripcion")}
              placeholder="Ej: Reparación bomba de agua"
              className={inputCls(errors.descripcion?.message)}
            />
          </Field>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto" required error={errors.monto?.message}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register("monto", { valueAsNumber: true })}
                  placeholder="0"
                  className={cn(inputCls(errors.monto?.message), "pl-6")}
                />
              </div>
            </Field>
            <Field label="Fecha" required error={errors.fecha?.message}>
              <input
                type="date"
                {...register("fecha")}
                className={inputCls(errors.fecha?.message)}
              />
            </Field>
          </div>

          {/* Pagador */}
          <Field label="¿Quién pagó?" required error={errors.pagadoPor?.message}>
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
                  <input
                    type="radio"
                    value={p.value}
                    {...register("pagadoPor")}
                    className="sr-only"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </Field>

          {/* Aviso reintegro */}
          {esPersona && (
            <div className="flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <p className="text-sm text-orange-700">
                Este gasto quedará <strong>pendiente de reintegro</strong> para{" "}
                {PAGADORES.find((p) => p.value === pagadoPor)?.label}.
              </p>
            </div>
          )}

          {/* Notas */}
          <Field label="Notas" error={errors.notas?.message}>
            <textarea
              {...register("notas")}
              rows={2}
              placeholder="Información adicional..."
              className={cn(inputCls(), "resize-none")}
            />
          </Field>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Registrar gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
