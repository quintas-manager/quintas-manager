"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { marcarEnviado } from "@/lib/actions/limpieza";

interface Props {
  cronogramaId:  string;
  enviado:       boolean;
  preview:       string;
  numeroSilvana: string;
}

export function DetalleCronogramaClient({ cronogramaId, enviado, preview, numeroSilvana }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEnviar = async () => {
    setLoading(true);
    try {
      const result = await marcarEnviado(cronogramaId);
      if (!result.success) { toast.error("Error al marcar como enviado"); return; }

      const numero = numeroSilvana.replace(/\D/g, "");
      if (!numero) {
        toast.warning("Configurá el número de Silvana para enviar por WhatsApp.");
      } else {
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(preview)}`, "_blank");
      }

      toast.success("Cronograma marcado como enviado");
      router.refresh();
    } catch {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-end">
      <button
        onClick={handleEnviar}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800 transition disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {enviado ? "Reenviar por WhatsApp" : "Enviar por WhatsApp"}
      </button>
    </div>
  );
}
