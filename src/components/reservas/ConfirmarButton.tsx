"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { confirmarReserva } from "@/lib/actions/reservas";

export function ConfirmarButton({ reservaId }: { reservaId: string }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    const result = await confirmarReserva(reservaId);
    setLoading(false);
    if (result.success) toast.success("Reserva confirmada");
    else toast.error(result.error ?? "Error al confirmar");
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-3 py-2 text-sm font-medium text-white hover:bg-[#162d4a] transition disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Confirmar
    </button>
  );
}
