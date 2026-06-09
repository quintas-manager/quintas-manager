"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, X, Loader2, CheckCircle2, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { setContactos } from "@/lib/actions/limpieza";
import type { ContactoConfig } from "@/lib/limpieza-config";
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
  cronogramas: CronogramaRow[];
  contactos:   ContactoConfig[];
}

function fmtSemana(iso: string) {
  const lunes   = parseISO(iso);
  const viernes = addDays(lunes, 4);
  return `${format(lunes, "d MMM", { locale: es })} — ${format(viernes, "d MMM yyyy", { locale: es })}`;
}

function fmtDate(iso: string) {
  return format(parseISO(iso), "d/MM/yyyy HH:mm", { locale: es });
}

export function LimpiezaListClient({ cronogramas, contactos }: Props) {
  const [configOpen, setConfigOpen] = useState(false);
  const [numeros,    setNumeros]    = useState<Record<string, string>>(
    Object.fromEntries(contactos.map((c) => [c.key, c.numero])),
  );
  const [saving, setSaving] = useState(false);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = contactos.map((c) => ({
        key:    c.key,
        numero: (numeros[c.key] ?? "").trim(),
      }));
      const result = await setContactos(payload);
      if (result.success) {
        toast.success("Contactos guardados");
        setConfigOpen(false);
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
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
          Configurar contactos WhatsApp
        </button>
      </div>

      {/* Table / Cards */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {cronogramas.length === 0 ? (
          <div className="py-16 text-center">
            <Send className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay cronogramas todavía.</p>
            <p className="text-xs text-gray-400 mt-1">Creá el primero con el botón de arriba.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {cronogramas.map((c) => (
                <div key={c.id} className="px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-tight">
                        {fmtSemana(c.semanaInicio)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Creado por {c.creadoPor}</p>
                    </div>
                    {c.enviado ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Enviado
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                        <Clock className="h-3 w-3" />
                        Borrador
                      </span>
                    )}
                  </div>
                  {c.fechaEnvio && (
                    <p className="text-xs text-gray-400">Enviado el {fmtDate(c.fechaEnvio)}</p>
                  )}
                  <Link
                    href={`/limpieza/${c.id}`}
                    className="flex w-full items-center justify-center min-h-[44px] rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Ver cronograma
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Config modal */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfigOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Contactos WhatsApp</h3>
              <button
                onClick={() => setConfigOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-gray-500">
                Código de país sin +. Ej: 5491112345678 (Argentina). Dejá vacío para no incluir.
              </p>
              {contactos.map((c) => (
                <div key={c.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {c.nombre}
                  </label>
                  <input
                    type="tel"
                    value={numeros[c.key] ?? ""}
                    onChange={(e) =>
                      setNumeros((prev) => ({ ...prev, [c.key]: e.target.value }))
                    }
                    placeholder="Ej: 5491112345678"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setConfigOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
