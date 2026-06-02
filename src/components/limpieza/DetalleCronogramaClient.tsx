"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { marcarEnviado } from "@/lib/actions/limpieza";
import type { ContactoConfig } from "@/lib/limpieza-config";

interface Props {
  cronogramaId: string;
  enviado:      boolean;
  fechaEnvio:   string | null;
  preview:      string;
  contactos:    ContactoConfig[];
}

function abrirWhatsApp(numero: string, preview: string) {
  const n = numero.replace(/\D/g, "");
  if (!n) return;
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(preview)}`, "_blank");
}

export function DetalleCronogramaClient({
  cronogramaId,
  enviado,
  fechaEnvio,
  preview,
  contactos,
}: Props) {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  const configurados = contactos.filter((c) => c.numero.replace(/\D/g, "").length > 0);

  // Open all configured contacts in sequence, then mark as sent
  const handleEnviarTodos = async () => {
    if (configurados.length === 0) {
      toast.warning("No hay contactos con número configurado.");
      return;
    }

    // Open windows while still in synchronous user-gesture context
    configurados.forEach((c) => abrirWhatsApp(c.numero, preview));

    setLoading(true);
    try {
      const result = await marcarEnviado(cronogramaId);
      if (result.success) {
        toast.success(`Cronograma enviado a ${configurados.length} contacto${configurados.length !== 1 ? "s" : ""}`);
        router.refresh();
      } else {
        toast.error("Error al registrar el envío");
      }
    } catch {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  // Send to a single contact without marking the whole cronograma as sent
  const handleEnviarUno = (contacto: ContactoConfig) => {
    abrirWhatsApp(contacto.numero, preview);
    toast.success(`Abriendo WhatsApp de ${contacto.nombre}`);
  };

  const fmtEnvio = fechaEnvio
    ? format(parseISO(fechaEnvio), "d/MM/yyyy HH:mm", { locale: es })
    : null;

  return (
    <div className="space-y-4">
      {/* Botón principal: Enviar a todos */}
      <div className="flex justify-end">
        <button
          onClick={handleEnviarTodos}
          disabled={loading || configurados.length === 0}
          className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800 transition disabled:opacity-60"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Users className="h-4 w-4" />}
          {enviado ? "Reenviar a todos" : "Enviar a todos"}
          {configurados.length > 0 && (
            <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-xs font-semibold">
              {configurados.length}
            </span>
          )}
        </button>
      </div>

      {/* Botones individuales por contacto */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Enviar por contacto</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {contactos.map((c) => {
            const tieneNumero = c.numero.replace(/\D/g, "").length > 0;
            return (
              <div
                key={c.key}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                  {tieneNumero ? (
                    <p className="text-xs text-gray-400">{c.numero}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Sin número configurado</p>
                  )}
                  {tieneNumero && enviado && fmtEnvio && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Enviado el {fmtEnvio}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleEnviarUno(c)}
                  disabled={!tieneNumero}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar
                </button>
              </div>
            );
          })}
        </div>
        {configurados.length === 0 && (
          <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
            <p className="text-xs text-gray-500">
              Configurá los números en la lista de cronogramas para poder enviar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
