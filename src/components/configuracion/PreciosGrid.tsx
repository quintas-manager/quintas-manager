"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { upsertPrecio } from "@/lib/actions/configuracion";
import { cn } from "@/lib/utils";

export interface PrecioGridData {
  quintaId:     string;
  quintaNombre: string;
  temporadas: {
    id:      string;
    nombre:  string;
    tipo:    "ALTA" | "BAJA";
    precios: Record<string, number>;
  }[];
}

const TIPOS = [
  { key: "DIA",           label: "Día" },
  { key: "FIN_DE_SEMANA", label: "Fin de semana" },
  { key: "SEMANA",        label: "Semana" },
  { key: "QUINCENA",      label: "Quincena" },
  { key: "MES",           label: "Mes" },
] as const;

const tipoBadge = {
  ALTA: "bg-orange-100 text-orange-700",
  BAJA: "bg-blue-100 text-blue-700",
};

function PrecioCell({
  quintaId,
  temporadaId,
  tipoAlquiler,
  initialValue,
}: {
  quintaId:     string;
  temporadaId:  string;
  tipoAlquiler: string;
  initialValue: number;
}) {
  const [value, setValue]       = useState(initialValue);
  const [saved, setSaved]       = useState(false);
  const [pending, startTransition] = useTransition();

  const handleBlur = () => {
    if (value === initialValue) return;
    startTransition(async () => {
      const result = await upsertPrecio(quintaId, temporadaId, tipoAlquiler, value);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } else {
        toast.error(result.error);
        setValue(initialValue);
      }
    });
  };

  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onBlur={handleBlur}
        className={cn(
          "w-full rounded-lg border px-2 py-1.5 text-sm text-right outline-none transition focus:ring-2 focus:ring-offset-0",
          pending
            ? "border-gray-300 bg-gray-50 focus:ring-gray-200"
            : saved
              ? "border-green-300 bg-green-50 focus:ring-green-200"
              : "border-gray-200 focus:border-gray-400 focus:ring-gray-200",
        )}
      />
      {pending && (
        <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-gray-400" />
      )}
      {saved && !pending && (
        <CheckCircle2 className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-green-500" />
      )}
    </div>
  );
}

export function PreciosGrid({ quintas }: { quintas: PrecioGridData[] }) {
  if (quintas.every((q) => q.temporadas.length === 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
        Primero creá temporadas y asocialas a las quintas en la pestaña Temporadas.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {quintas.map((q) => {
        if (q.temporadas.length === 0) return null;
        return (
          <div key={q.quintaId} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3.5 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">{q.quintaNombre}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Editá los precios directamente en la tabla. Se guardan al salir del campo.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-48">
                      Temporada
                    </th>
                    {TIPOS.map((t) => (
                      <th
                        key={t.key}
                        className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 min-w-[120px]"
                      >
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {q.temporadas.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${tipoBadge[t.tipo]}`}
                          >
                            {t.tipo === "ALTA" ? "Alta" : "Baja"}
                          </span>
                          <span className="text-sm text-gray-700 truncate">{t.nombre}</span>
                        </div>
                      </td>
                      {TIPOS.map((tipo) => (
                        <td key={tipo.key} className="px-3 py-2">
                          <PrecioCell
                            quintaId={q.quintaId}
                            temporadaId={t.id}
                            tipoAlquiler={tipo.key}
                            initialValue={t.precios[tipo.key] ?? 0}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
