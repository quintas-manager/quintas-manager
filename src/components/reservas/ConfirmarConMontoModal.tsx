"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { confirmarConMontoSchema, type ConfirmarConMontoValues } from "@/lib/schemas/reservas";
import { confirmarConMonto } from "@/lib/actions/reservas";
import { MonedaInput } from "@/components/ui/MonedaInput";
import { fetchTipoCambioAction } from "@/lib/actions/dolar";
import { formatARS } from "@/lib/format";

interface Props {
  reservaId: string;
  clienteNombre: string;
  onClose: () => void;
  onSuccess: () => void;
  tipoCambio: number;
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

export function ConfirmarConMontoModal({ reservaId, clienteNombre, onClose, onSuccess, tipoCambio }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmarConMontoValues>({
    resolver: zodResolver(confirmarConMontoSchema),
    defaultValues: { metodoPagoSeña: "EFECTIVO" },
  });

  const sena = watch("sena");
  const tieneSeña = typeof sena === "number" && sena > 0;

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
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-700 font-medium">TC Blue: {formatARS(tc)}</span>
              <button type="button" onClick={refreshTC} disabled={refreshingTC}
                className="text-xs text-blue-500 hover:text-blue-700 transition disabled:opacity-50 flex items-center gap-1">
                <RefreshCw className={cn("h-3 w-3", refreshingTC && "animate-spin")} />
              </button>
            </div>
            <MonedaInput
              label="Monto total"
              required
              tipoCambioInicial={tc}
              error={errors.montoTotal?.message}
              onValueChange={(usd, ars, tcUsado, monedaUsada) => {
                setValue("montoTotal", usd);
                setValue("montoTotalARS", ars > 0 ? ars : undefined);
                setValue("tipoCambioReserva", tcUsado > 0 ? tcUsado : undefined);
                setValue("monedaIngreso", monedaUsada);
              }}
            />
          </div>

          <MonedaInput
            label="Seña"
            tipoCambioInicial={tc}
            error={errors.sena?.message}
            onValueChange={(usd, ars, tcUsado) => {
              setValue("sena", usd > 0 ? usd : null);
              setValue("senaARS", ars > 0 ? ars : undefined);
              setValue("tipoCambioSena", tcUsado > 0 ? tcUsado : undefined);
            }}
          />

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
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#162d4a] disabled:opacity-60"
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
