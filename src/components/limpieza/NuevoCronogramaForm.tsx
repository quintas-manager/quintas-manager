"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, Send, Save, AlertTriangle } from "lucide-react";
import { crearCronograma } from "@/lib/actions/limpieza";

interface Lugar {
  id:     string;
  nombre: string;
}

interface DiaState {
  lugarPrincipalId:  string;
  lugarSecundarioId: string;
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function getLunes(dateStr: string): Date {
  const d = parseISO(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const selectCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition";

interface Props {
  lugares:       Lugar[];
  numeroSilvana: string;
  // For edit mode
  cronogramaId?:      string;
  defaultFecha?:      string;
  defaultDias?:       DiaState[];
}

export function NuevoCronogramaForm({
  lugares,
  numeroSilvana,
  cronogramaId,
  defaultFecha = "",
  defaultDias,
}: Props) {
  const router = useRouter();
  const emptyDias: DiaState[] = Array.from({ length: 5 }, () => ({
    lugarPrincipalId: "",
    lugarSecundarioId: "",
  }));

  const [fechaStr, setFechaStr]     = useState(defaultFecha);
  const [dias, setDias]             = useState<DiaState[]>(defaultDias ?? emptyDias);
  const [isSubmitting, setSubmitting] = useState(false);

  const lunes   = useMemo(() => (fechaStr ? getLunes(fechaStr) : null), [fechaStr]);
  const viernes = useMemo(() => (lunes ? addDays(lunes, 4) : null), [lunes]);

  const updateDia = (idx: number, field: keyof DiaState, value: string) => {
    setDias((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  // Warn if same lugar used as principal more than once
  const duplicados = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dias) {
      if (d.lugarPrincipalId)
        counts[d.lugarPrincipalId] = (counts[d.lugarPrincipalId] ?? 0) + 1;
    }
    return new Set(Object.entries(counts).filter(([, n]) => n > 1).map(([id]) => id));
  }, [dias]);

  const preview = useMemo(() => {
    if (!lunes || !viernes) return "";
    const fmtD = (d: Date) => format(d, "d 'de' MMMM", { locale: es });
    const lineas = DIAS.map((nombre, i) => {
      const d = dias[i];
      const principal  = lugares.find((l) => l.id === d.lugarPrincipalId)?.nombre ?? "—";
      const secundario = d.lugarSecundarioId
        ? lugares.find((l) => l.id === d.lugarSecundarioId)?.nombre
        : null;
      return `${nombre}: ${principal}${secundario ? ` (+ ${secundario})` : ""}`;
    });
    return `📅 Cronograma semana del ${fmtD(lunes)} al ${fmtD(viernes)}\n\n${lineas.join("\n")}\n\n¡Gracias Silvana! 🙏`;
  }, [lunes, viernes, dias, lugares]);

  const handleSubmit = async (enviar: boolean) => {
    if (!lunes) { toast.error("Seleccioná una semana"); return; }
    if (dias.some((d) => !d.lugarPrincipalId)) {
      toast.error("Completá el lugar principal de cada día");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        semanaInicio: lunes.toISOString(),
        dias: dias.map((d, i) => ({
          diaSemana:         i + 1,
          lugarPrincipalId:  d.lugarPrincipalId,
          lugarSecundarioId: d.lugarSecundarioId || null,
        })),
        enviar,
      };

      const result = cronogramaId
        ? await import("@/lib/actions/limpieza").then((m) =>
            m.actualizarCronograma(cronogramaId, payload)
          )
        : await crearCronograma(payload);

      if (!result.success) { toast.error("Error al guardar"); return; }

      if (enviar) {
        const numero = numeroSilvana.replace(/\D/g, "");
        if (!numero) {
          toast.warning("Guardado. Configurá el número de Silvana para enviar por WhatsApp.");
        } else {
          window.open(
            `https://wa.me/${numero}?text=${encodeURIComponent(preview)}`,
            "_blank"
          );
        }
      }

      toast.success(enviar ? "Cronograma enviado" : "Borrador guardado");
      router.push("/limpieza");
    } catch {
      toast.error("Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Semana picker */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Semana
        </label>
        <input
          type="date"
          value={fechaStr}
          onChange={(e) => setFechaStr(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
        />
        {lunes && viernes && (
          <p className="mt-1.5 text-xs text-gray-500">
            Semana del{" "}
            <strong>{format(lunes, "d 'de' MMMM", { locale: es })}</strong>
            {" "}al{" "}
            <strong>{format(viernes, "d 'de' MMMM yyyy", { locale: es })}</strong>
          </p>
        )}
      </div>

      {/* Tabla de días */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Asignación por día</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {DIAS.map((nombre, i) => {
            const d = dias[i];
            const isDup = d.lugarPrincipalId && duplicados.has(d.lugarPrincipalId);
            return (
              <div key={nombre} className="grid grid-cols-[100px_1fr_1fr] items-center gap-4 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{nombre}</span>
                  {isDup && (
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  )}
                </div>
                <div>
                  <select
                    value={d.lugarPrincipalId}
                    onChange={(e) => updateDia(i, "lugarPrincipalId", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— Principal —</option>
                    {lugares.map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={d.lugarSecundarioId}
                    onChange={(e) => updateDia(i, "lugarSecundarioId", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Ninguno</option>
                    {lugares.map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        {duplicados.size > 0 && (
          <div className="border-t border-orange-100 bg-orange-50 px-5 py-2.5">
            <p className="text-xs text-orange-700 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Hay lugares repetidos como principal en la misma semana.
            </p>
          </div>
        )}
      </div>

      {/* Preview WhatsApp */}
      {preview && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
            Preview del mensaje
          </p>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
            {preview}
          </pre>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar borrador
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800 transition disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Guardar y enviar por WhatsApp
        </button>
      </div>
    </div>
  );
}
