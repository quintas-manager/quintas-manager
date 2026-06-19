"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { marcarCargoMascotaPagado } from "@/lib/actions/reservas";

export function MarcarMascotaPagadoButton({ reservaId }: { reservaId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await marcarCargoMascotaPagado(reservaId);
      if (result.success) {
        toast.success("Cargo de mascota marcado como pagado");
      } else {
        toast.error("error" in result ? result.error : "Error al actualizar");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="flex items-center gap-2 rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 transition disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Marcar como pagado
    </button>
  );
}
