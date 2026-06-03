"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { marcarReintegrado, marcarTodosReintegrados } from "@/lib/actions/gastos";
import { reintegroSchema, type ReintegroFormValues } from "@/lib/schemas/gastos";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface SingleProps {
  mode:       "single";
  gastoId:    string;
  descripcion: string;
  monto:      number;
  pagadoPor:  string;
  onClose:    () => void;
}

interface BatchProps {
  mode:      "batch";
  pagador:   string;
  total:     number;
  cantidad:  number;
  onClose:   () => void;
}

type Props = SingleProps | BatchProps;

const NOMBRE: Record<string, string> = {
  GRACIELA: "Graciela",
  MATIAS:   "Matías",
  ROCIO:    "Rocío",
};

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
    err ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export function ReintegroModal(props: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReintegroFormValues>({
    resolver: zodResolver(reintegroSchema),
    defaultValues: { fechaReintegro: format(new Date(), "yyyy-MM-dd") },
  });

  const onSubmit = async (data: ReintegroFormValues) => {
    let result;
    if (props.mode === "single") {
      result = await marcarReintegrado(props.gastoId, data);
    } else {
      result = await marcarTodosReintegrados(props.pagador, data);
    }

    if (result.success) {
      toast.success(
        props.mode === "single"
          ? "Gasto marcado como reintegrado"
          : `${props.cantidad} gastos marcados como reintegrados`,
      );
      router.refresh();
      props.onClose();
    } else {
      toast.error(result.error);
    }
  };

  const nombre =
    props.mode === "single" ? NOMBRE[props.pagadoPor] ?? props.pagadoPor : NOMBRE[props.pagador] ?? props.pagador;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={props.onClose} onPointerUp={props.onClose} />

      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Confirmar reintegro</h3>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Summary */}
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                {props.mode === "single"
                  ? `Reintegro a ${nombre}`
                  : `Reintegrar todos a ${nombre}`}
              </span>
            </div>
            {props.mode === "single" ? (
              <p className="text-sm text-green-700">{props.descripcion}</p>
            ) : (
              <p className="text-sm text-green-700">
                {props.cantidad} gasto{props.cantidad !== 1 ? "s" : ""} pendiente
                {props.cantidad !== 1 ? "s" : ""}
              </p>
            )}
            <p className="mt-1 text-lg font-bold text-green-900">
              {props.mode === "single" ? fmtMoney(props.monto) : fmtMoney(props.total)}
            </p>
          </div>

          {/* Date */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha de reintegro <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("fechaReintegro")}
                className={inputCls(errors.fechaReintegro?.message)}
              />
              {errors.fechaReintegro && (
                <p className="mt-1 text-xs text-red-500">{errors.fechaReintegro.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={props.onClose}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
