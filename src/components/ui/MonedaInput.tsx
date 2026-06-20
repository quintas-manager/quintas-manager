"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTipoCambioAction } from "@/lib/actions/dolar";
import { formatARS, formatUSD } from "@/lib/format";

interface Props {
  label: string;
  required?: boolean;
  tipoCambioInicial: number;
  onValueChange: (usd: number, ars: number, tc: number, moneda: "USD" | "ARS") => void;
  error?: string;
  placeholder?: string;
  initialValueUSD?: number;
  initialMoneda?: "USD" | "ARS";
  initialARS?: number;
  initialTC?: number;
}

const inputBase =
  "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-offset-0";

export function MonedaInput({
  label,
  required,
  tipoCambioInicial,
  onValueChange,
  error,
  placeholder = "0",
  initialValueUSD,
  initialMoneda,
  initialARS,
  initialTC,
}: Props) {
  const [moneda, setMoneda] = useState<"USD" | "ARS">(initialMoneda ?? "USD");
  const [rawMonto, setRawMonto] = useState(() => {
    if (initialMoneda === "ARS" && initialARS && initialARS > 0) {
      return String(Math.round(initialARS));
    }
    if (initialValueUSD && initialValueUSD > 0) {
      return String(initialValueUSD);
    }
    return "";
  });
  const [tc, setTc] = useState(() => {
    if (initialTC && initialTC > 0) return initialTC;
    return tipoCambioInicial > 0 ? tipoCambioInicial : 1;
  });
  const [refreshing, setRefreshing] = useState(false);

  const montoNum = parseFloat(rawMonto.replace(",", ".")) || 0;
  const usd = moneda === "USD" ? montoNum : montoNum / tc;
  const ars = moneda === "ARS" ? montoNum : montoNum * tc;

  useEffect(() => {
    onValueChange(usd, ars, tc, moneda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMonto, tc, moneda]);

  async function refreshTC() {
    setRefreshing(true);
    try {
      const nuevoTC = await fetchTipoCambioAction();
      if (nuevoTC > 0) setTc(nuevoTC);
    } finally {
      setRefreshing(false);
    }
  }

  const inputCls = cn(
    inputBase,
    error
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Toggle USD / ARS */}
      <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-fit">
        {(["USD", "ARS"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMoneda(m)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-semibold transition",
              moneda === m
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
          {moneda === "USD" ? "USD" : "$"}
        </span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          value={rawMonto}
          onChange={(e) => setRawMonto(e.target.value)}
          placeholder={placeholder}
          className={cn(inputCls, "pl-11")}
        />
      </div>

      {/* TC section (when ARS) */}
      {moneda === "ARS" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">TC blue:</span>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={tc}
              onChange={(e) => setTc(parseFloat(e.target.value) || 1)}
              className="w-full rounded-md border border-gray-200 pl-5 pr-2 py-1 text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <button
            type="button"
            onClick={refreshTC}
            disabled={refreshing}
            title="Actualizar TC blue"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          </button>
          {montoNum > 0 && (
            <span className="text-xs text-gray-500">
              = {formatUSD(usd)}
            </span>
          )}
        </div>
      )}

      {/* Info when USD — show ARS equivalent */}
      {moneda === "USD" && montoNum > 0 && tc > 0 && (
        <p className="text-xs text-gray-400">
          ≈ {formatARS(ars)} al TC {formatARS(tc)}
          <button
            type="button"
            onClick={refreshTC}
            disabled={refreshing}
            className="ml-1.5 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
            title="Actualizar TC blue"
          >
            <RefreshCw className={cn("inline h-2.5 w-2.5", refreshing && "animate-spin")} />
          </button>
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
