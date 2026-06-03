"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cerrarMes } from "@/lib/actions/finanzas";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

interface Props {
  quintaId: string;
  mes: number;
  anio: number;
  mesNombre: string;
  cobrarGraciela: number;
  cobrarMatias: number;
  parteGraciela: number;
  parteMatias: number;
  reintegrosGraciela: number;
  reintegrosMatias: number;
}

export function CerrarMesButton({
  quintaId, mes, anio, mesNombre,
  cobrarGraciela, cobrarMatias,
  parteGraciela, parteMatias,
  reintegrosGraciela, reintegrosMatias,
}: Props) {
  const router  = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCerrar() {
    setLoading(true);
    const result = await cerrarMes(quintaId, mes, anio);
    setLoading(false);
    if (result.success) {
      toast.success("Mes cerrado correctamente");
      setOpen(false);
      router.push(`/finanzas/${quintaId}`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition"
      >
        <Lock className="h-4 w-4" />
        Cerrar mes
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} onPointerUp={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-semibold text-gray-900">Cerrar {mesNombre}</h3>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Al cerrar el mes se registrará el snapshot y todos los reintegros pendientes
                de Graciela y Matías para esta quinta quedarán marcados como reintegrados.
              </p>

              <div className="space-y-3">
                {/* Graciela */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Graciela cobra</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Parte del resultado</span>
                      <span>{fmt(parteGraciela)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reintegros pendientes</span>
                      <span>{fmt(reintegrosGraciela)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                      <span>Total</span>
                      <span className="text-green-700">{fmt(cobrarGraciela)}</span>
                    </div>
                  </div>
                </div>

                {/* Matías */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Matías cobra</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Parte del resultado</span>
                      <span>{fmt(parteMatias)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reintegros pendientes</span>
                      <span>{fmt(reintegrosMatias)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                      <span>Total</span>
                      <span className="text-green-700">{fmt(cobrarMatias)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCerrar}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
