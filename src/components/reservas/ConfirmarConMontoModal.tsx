"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { confirmarConMontoSchema, type ConfirmarConMontoValues } from "@/lib/schemas/reservas";
import { confirmarConMonto } from "@/lib/actions/reservas";

interface Props {
  reservaId: string;
  clienteNombre: string;
  onClose: () => void;
  onSuccess: () => void;
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

export function ConfirmarConMontoModal({ reservaId, clienteNombre, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmarConMontoValues>({
    resolver: zodResolver(confirmarConMontoSchema),
    defaultValues: { metodoPagoSeña: "EFECTIVO" },
  });

  const sena = watch("sena");
  const tieneSeña = typeof sena === "number" && sena > 0;

  const onSubmit = async (data: ConfirmarConMontoValues) => {
    const result = await confirmarConMonto(reservaId, data);
    if (result.success) {
      toast.success("Reserva confirmada");
      onSuccess();
    } else {
      toast.error(result.error ?? "Error al confirmar");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} onPointerUp={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Confirmar reserva</h3>
            <p className="text-xs text-gray-500 mt-0.5">{clienteNombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Monto total <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="1"
                {...register("montoTotal", { valueAsNumber: true })}
                className={cn(inputCls(errors.montoTotal?.message), "pl-7")}
                placeholder="0"
              />
            </div>
            {errors.montoTotal && (
              <p className="mt-1 text-xs text-red-500">{errors.montoTotal.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Seña</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="1"
                {...register("sena", { valueAsNumber: true })}
                className={cn(inputCls(errors.sena?.message), "pl-7")}
                placeholder="0"
              />
            </div>
          </div>

          {tieneSeña && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Método de pago de la seña</label>
              <div className="grid grid-cols-2 gap-2">
                {(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "MERCADOPAGO"] as const).map((m) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-200 p-2.5 text-xs transition has-[:checked]:border-gray-900 has-[:checked]:bg-gray-50 hover:border-gray-300"
                  >
                    <input
                      type="radio"
                      value={m}
                      {...register("metodoPagoSeña")}
                      defaultChecked={m === "EFECTIVO"}
                      className="sr-only"
                    />
                    <span className="font-medium text-gray-900">
                      {m === "EFECTIVO" && "Efectivo"}
                      {m === "TRANSFERENCIA" && "Transferencia"}
                      {m === "TARJETA" && "Tarjeta"}
                      {m === "MERCADOPAGO" && "MercadoPago"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
