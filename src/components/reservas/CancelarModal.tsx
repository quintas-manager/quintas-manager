"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cancelarReserva } from "@/lib/actions/reservas";
import { cancelarSchema, type CancelarFormValues } from "@/lib/schemas/reservas";
import { cn } from "@/lib/utils";

interface Props {
  reservaId: string;
  clienteNombre: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelarModal({ reservaId, clienteNombre, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CancelarFormValues>({ resolver: zodResolver(cancelarSchema) });

  const onSubmit = async (data: CancelarFormValues) => {
    const result = await cancelarReserva(reservaId, data);
    if (result.success) {
      toast.success("Reserva cancelada");
      onSuccess();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} onPointerUp={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Cancelar reserva</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">¿Cancelar la reserva de {clienteNombre}?</p>
              <p className="mt-0.5 text-amber-700">Esta acción no se puede deshacer.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Motivo de cancelación <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register("motivo")}
                rows={3}
                placeholder="Describí el motivo de la cancelación..."
                className={cn(
                  "w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
                  errors.motivo
                    ? "border-red-400 focus:ring-red-200"
                    : "border-gray-300 focus:border-gray-400 focus:ring-gray-200"
                )}
              />
              {errors.motivo && (
                <p className="mt-1 text-xs text-red-500">{errors.motivo.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar cancelación
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
