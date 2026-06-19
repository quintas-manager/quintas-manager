"use client";

import { useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import type { GastoPendienteItem, DistribucionInput } from "@/lib/actions/pagos";

const fmt = formatUSD;

const PAGADOR_LABELS: Record<string, string> = {
  GRACIELA: "Graciela",
  MATIAS:   "Matías",
};
const PAGADOR_COLORS: Record<string, string> = {
  GRACIELA: "text-purple-700",
  MATIAS:   "text-blue-700",
};

interface Props {
  montoTotalUSD: number;
  gastosPendientes: GastoPendienteItem[];
  onConfirmar: (dist: DistribucionInput) => Promise<void>;
  onVolver: () => void;
}

export function DistribucionStep({ montoTotalUSD, gastosPendientes, onConfirmar, onVolver }: Props) {
  const [gastosSeleccionados, setGastosSeleccionados] = useState<string[]>([]);
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleGasto(id: string) {
    setGastosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  const gastosM = gastosPendientes.filter((g) => g.pagadoPor === "MATIAS" && gastosSeleccionados.includes(g.id));
  const gastosG = gastosPendientes.filter((g) => g.pagadoPor === "GRACIELA" && gastosSeleccionados.includes(g.id));

  const reintegroMatias   = gastosM.reduce((s, g) => s + g.monto, 0);
  const reintegroGraciela = gastosG.reduce((s, g) => s + g.monto, 0);
  const totalReintegros   = reintegroMatias + reintegroGraciela;
  const resto             = montoTotalUSD - totalReintegros;
  const parteMatias       = resto / 2;
  const parteGraciela     = resto / 2;

  async function handleConfirmar() {
    setIsSubmitting(true);
    try {
      await onConfirmar({
        gastosReintegradosIds: gastosSeleccionados,
        reintegroMatias,
        reintegroGraciela,
        parteMatias,
        parteGraciela,
        notas: notas || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">¿Cómo se distribuye este ingreso?</h2>
          <p className="text-sm text-gray-500 mt-0.5">Ingreso total: <span className="font-semibold text-green-600">{fmt(montoTotalUSD)}</span></p>
        </div>
      </div>

      {/* Gastos pendientes */}
      {gastosPendientes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100">
            <p className="text-sm font-semibold text-amber-900">Reintegros pendientes</p>
            <p className="text-xs text-amber-700 mt-0.5">Seleccioná los gastos que se reintegran con este pago</p>
          </div>
          <div className="divide-y divide-amber-100">
            {gastosPendientes.map((g) => {
              const checked = gastosSeleccionados.includes(g.id);
              return (
                <label
                  key={g.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                    checked ? "bg-amber-100" : "hover:bg-amber-50/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGasto(g.id)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-amber-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{g.descripcion}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className={cn("font-medium", PAGADOR_COLORS[g.pagadoPor])}>
                        {PAGADOR_LABELS[g.pagadoPor]}
                      </span>
                      {" · "}{g.fecha}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{fmt(g.monto)}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Cálculo en tiempo real */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Distribución</p>
        </div>
        <div className="px-4 py-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Ingreso total</span>
            <span className="font-semibold text-green-600">{fmt(montoTotalUSD)}</span>
          </div>
          {reintegroMatias > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-700">Reintegro Matías</span>
              <span className="text-blue-700">– {fmt(reintegroMatias)}</span>
            </div>
          )}
          {reintegroGraciela > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-purple-700">Reintegro Graciela</span>
              <span className="text-purple-700">– {fmt(reintegroGraciela)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600">Resto a repartir</span>
            <span className="font-semibold text-gray-900">{fmt(Math.max(0, resto))}</span>
          </div>
          <div className="h-px bg-gray-100 my-1" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-700 font-medium">Parte Matías (50%)</span>
            <span className="font-bold text-blue-700">{fmt(Math.max(0, parteMatias))}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-purple-700 font-medium">Parte Graciela (50%)</span>
            <span className="font-bold text-purple-700">{fmt(Math.max(0, parteGraciela))}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Observaciones sobre esta distribución..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 resize-none"
        />
      </div>

      {/* Botón confirmar */}
      <button
        type="button"
        onClick={handleConfirmar}
        disabled={isSubmitting}
        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirmar distribución
      </button>
    </div>
  );
}
