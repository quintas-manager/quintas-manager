"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, X, Loader2, CheckCircle2, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { setConfiguracion } from "@/lib/actions/limpieza";
import { format, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface CronogramaRow {
  id:           string;
  semanaInicio: string;
  creadoPor:    string;
  enviado:      boolean;
  fechaEnvio:   string | null;
  createdAt:    string;
}

interface Props {
  cronogramas:  CronogramaRow[];
  numeroSilvana: string;
}

function fmtSemana(iso: string) {
  const lunes  = parseISO(iso);
  const viernes = addDays(lunes, 4);
  return `${format(lunes, "d MMM", { locale: es })} — ${format(viernes, "d MMM yyyy", { locale: es })}`;
}

function fmtDate(iso: string) {
  return format(parseISO(iso), "d/MM/yyyy HH:mm", { locale: es });
}

export function LimpiezaListClient({ cronogramas, numeroSilvana }: Props) {
  const [configOpen, setConfigOpen]       = useState(false);
  const [numero, setNumero]               = useState(numeroSilvana);
  const [savingConfig, setSavingConfig]   = useState(false);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await setConfiguracion("whatsapp_silvana", numero.trim());
      toast.success("Número guardado");
      setConfigOpen(false);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <>
      {/* Config button */}
      <div className="flex justify-end">
        <button
          onClick={() => setConfigOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar WhatsApp de Silvana
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {cronogramas.length === 0 ? (
          <div className="py-16 text-center">
            <Send className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay cronogramas todavía.</p>
            <p className="text-xs text-gray-400 mt-1">Creá el primero con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Semana</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Creado por</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Fecha envío</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cronogramas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {fmtSemana(c.semanaInicio)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.creadoPor}</td>
                    <td className="px-5 py-3">
                      {c.enviado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                          <Clock className="h-3 w-3" />
                          Borrador
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {c.fechaEnvio ? fmtDate(c.fechaEnvio) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/limpieza/${c.id}`}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Config modal */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfigOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">WhatsApp de Silvana</h3>
              <button onClick={() => setConfigOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Número de WhatsApp
                </label>
                <input
                  type="tel"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ej: 5491112345678"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Incluí el código de país sin +. Ej: 5491112345678 (Argentina)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfigOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60"
                >
                  {savingConfig && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
