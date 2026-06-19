"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { eliminarReserva } from "@/lib/actions/reservas";

export function EliminarReservaButton({ reservaId }: { reservaId: string }) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);

  async function handleEliminar() {
    setLoading(true);
    try {
      const result = await eliminarReserva(reservaId);
      if (result.success) {
        toast.success("Reserva eliminada");
        router.push("/reservas");
      } else {
        toast.error("error" in result ? result.error : "Error al eliminar");
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar reserva
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </span>
              <h3 className="text-base font-semibold text-gray-900">Eliminar reserva</h3>
            </div>
            <p className="text-sm text-gray-600">
              ¿Eliminar esta reserva permanentemente? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleEliminar}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
