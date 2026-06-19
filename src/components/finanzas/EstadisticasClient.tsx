"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PagoSer    { fecha: string; montoUSD: number }
interface GastoSer   { fecha: string; montoUSD: number; categoriaId: string; categoriaNombre: string }
interface ReservaSer { fechaInicio: string; fechaFin: string; createdAt: string }

interface Props {
  quintaColor: string;
  pagos: PagoSer[];
  gastos: GastoSer[];
  reservas: ReservaSer[];
}

type Periodo = "1y" | "2y" | "all";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_LARGO  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#6366f1"];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function getLastNMonths(n: number): { year: number; month: number; label: string }[] {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MESES_CORTOS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return months;
}

function getAllMonthsFromData(pagos: PagoSer[], gastos: GastoSer[]) {
  const keys = new Set<string>();
  [...pagos, ...gastos].forEach((item) => {
    const d = new Date(item.fecha);
    keys.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  });
  return Array.from(keys)
    .map((k) => {
      const [y, m] = k.split("-").map(Number);
      return { year: y, month: m, label: `${MESES_CORTOS[m - 1]} ${String(y).slice(2)}` };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function calcOccupancy(reservas: ReservaSer[], year: number, month: number): number {
  const total = daysInMonth(year, month);
  let occupied = 0;
  for (let day = 1; day <= total; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    const iso = d.toISOString().split("T")[0];
    const isOcc = reservas.some((r) => iso >= r.fechaInicio.slice(0, 10) && iso < r.fechaFin.slice(0, 10));
    if (isOcc) occupied++;
  }
  return Math.round((occupied / total) * 100);
}

function occupancyColor(pct: number): string {
  if (pct >= 70) return "#22c55e";
  if (pct >= 30) return "#eab308";
  return "#ef4444";
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-base font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
        <p className="font-semibold text-gray-900">{fmt(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const OccupancyTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
        <p className="font-semibold text-gray-900">{payload[0].value}% ocupación</p>
      </div>
    );
  }
  return null;
};

const MargenTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="font-semibold" style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Main ──────────────────────────────────────────────────────────────────────

export function EstadisticasClient({ quintaColor, pagos, gastos, reservas }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("1y");

  const meses = useMemo(() => {
    if (periodo === "1y")  return getLastNMonths(12);
    if (periodo === "2y")  return getLastNMonths(24);
    return getAllMonthsFromData(pagos, gastos);
  }, [periodo, pagos, gastos]);

  // ── Monthly aggregations ─────────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    return meses.map(({ year, month, label }) => {
      const ingresos = pagos
        .filter((p) => { const d = new Date(p.fecha); return d.getFullYear() === year && d.getMonth() + 1 === month; })
        .reduce((s, p) => s + p.montoUSD, 0);

      const gastosTotal = gastos
        .filter((g) => { const d = new Date(g.fecha); return d.getFullYear() === year && d.getMonth() + 1 === month; })
        .reduce((s, g) => s + g.montoUSD, 0);

      const ocupacion = calcOccupancy(reservas, year, month);

      return { label, year, month, ingresos, gastos: gastosTotal, margen: ingresos - gastosTotal, ocupacion };
    });
  }, [meses, pagos, gastos, reservas]);

  // ── Ingresos stats ───────────────────────────────────────────────────────

  const ingresosStats = useMemo(() => {
    const nonZero = monthlyData.filter((m) => m.ingresos > 0);
    if (nonZero.length === 0) return null;

    const last6  = monthlyData.slice(-6).filter((m) => m.ingresos > 0);
    const last12 = monthlyData.slice(-12).filter((m) => m.ingresos > 0);
    const avg6   = last6.length  ? last6.reduce((s, m) => s + m.ingresos, 0) / last6.length : 0;
    const avg12  = last12.length ? last12.reduce((s, m) => s + m.ingresos, 0) / last12.length : 0;

    const best  = [...nonZero].sort((a, b) => b.ingresos - a.ingresos)[0];
    const worst = [...nonZero].sort((a, b) => a.ingresos - b.ingresos)[0];

    return { avg6, avg12, best, worst };
  }, [monthlyData]);

  // ── Gastos by category (pie) ─────────────────────────────────────────────

  const gastosPorCategoria = useMemo(() => {
    const filteredGastos = gastos.filter((g) => {
      const d = new Date(g.fecha);
      return meses.some((m) => m.year === d.getFullYear() && m.month === d.getMonth() + 1);
    });

    const map = new Map<string, { name: string; value: number }>();
    for (const g of filteredGastos) {
      if (!map.has(g.categoriaId)) map.set(g.categoriaId, { name: g.categoriaNombre, value: 0 });
      map.get(g.categoriaId)!.value += g.montoUSD;
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [gastos, meses]);

  const totalGastosPie = gastosPorCategoria.reduce((s, g) => s + g.value, 0);

  // ── Gastos stats ─────────────────────────────────────────────────────────

  const gastosStats = useMemo(() => {
    const nonZero = monthlyData.filter((m) => m.gastos > 0);
    if (nonZero.length === 0) return null;

    const last6  = monthlyData.slice(-6).filter((m) => m.gastos > 0);
    const last12 = monthlyData.slice(-12).filter((m) => m.gastos > 0);
    const avg6   = last6.length  ? last6.reduce((s, m) => s + m.gastos, 0) / last6.length : 0;
    const avg12  = last12.length ? last12.reduce((s, m) => s + m.gastos, 0) / last12.length : 0;
    const worst  = [...nonZero].sort((a, b) => b.gastos - a.gastos)[0];

    return { avg6, avg12, worst };
  }, [monthlyData]);

  // ── Ocupación: ranking por mes del año ───────────────────────────────────

  const ocupacionPorMesAnio = useMemo(() => {
    const mesMap = new Map<number, { total: number; count: number }>();
    for (const m of monthlyData) {
      if (!mesMap.has(m.month)) mesMap.set(m.month, { total: 0, count: 0 });
      mesMap.get(m.month)!.total += m.ocupacion;
      mesMap.get(m.month)!.count += 1;
    }
    return Array.from(mesMap.entries())
      .map(([month, { total, count }]) => ({
        month,
        nombre: MESES_LARGO[month - 1],
        promedio: Math.round(total / count),
      }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 3);
  }, [monthlyData]);

  // ── Reservas stats ───────────────────────────────────────────────────────

  const reservasStats = useMemo(() => {
    const filtered = reservas.filter((r) => {
      const d = new Date(r.fechaInicio);
      return meses.some((m) => m.year === d.getFullYear() && m.month === d.getMonth() + 1);
    });

    if (filtered.length === 0) return null;

    const leadTimes = filtered.map((r) => {
      const created = new Date(r.createdAt).getTime();
      const start   = new Date(r.fechaInicio).getTime();
      return Math.max(0, Math.round((start - created) / 86400000));
    });

    const avgLeadTime = Math.round(leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length);

    const mesMap = new Map<number, number>();
    for (const r of filtered) {
      const m = new Date(r.fechaInicio).getMonth() + 1;
      mesMap.set(m, (mesMap.get(m) ?? 0) + 1);
    }
    const rankingMeses = Array.from(mesMap.entries())
      .map(([month, count]) => ({ month, nombre: MESES_LARGO[month - 1], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { avgLeadTime, rankingMeses, total: filtered.length };
  }, [reservas, meses]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (pagos.length === 0 && gastos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-sm text-gray-400">No hay datos suficientes para mostrar estadísticas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Periodo selector */}
      <div className="flex gap-2">
        {([["1y","Último año"],["2y","Últimos 2 años"],["all","Todo"]] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setPeriodo(v)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              periodo === v
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-400",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Ingresos ────────────────────────────────────────────────────── */}
      <SectionCard title="Ingresos">
        {ingresosStats && (
          <StatGrid>
            <StatCard label="Promedio mensual (6 meses)" value={fmt(ingresosStats.avg6)} />
            <StatCard label="Promedio mensual (12 meses)" value={fmt(ingresosStats.avg12)} />
            <StatCard
              label="Mejor mes del período"
              value={fmt(ingresosStats.best.ingresos)}
              sub={`${MESES_LARGO[ingresosStats.best.month - 1]} ${ingresosStats.best.year}`}
            />
            <StatCard
              label="Peor mes del período"
              value={fmt(ingresosStats.worst.ingresos)}
              sub={`${MESES_LARGO[ingresosStats.worst.month - 1]} ${ingresosStats.worst.year}`}
            />
          </StatGrid>
        )}

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Evolución de ingresos</p>
          <div className="h-[200px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ingresos" fill={quintaColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      {/* ── Ocupación ───────────────────────────────────────────────────── */}
      <SectionCard title="Ocupación">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Tasa de ocupación mensual</p>
          <div className="h-[200px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} width={36} />
                <Tooltip content={<OccupancyTooltip />} />
                <Bar dataKey="ocupacion" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {monthlyData.map((entry, index) => (
                    <Cell key={index} fill={occupancyColor(entry.ocupacion)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" /> +70%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" /> 30–70%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> -30%</span>
          </div>
        </div>

        {ocupacionPorMesAnio.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Meses con mayor demanda histórica</p>
            <div className="space-y-2">
              {ocupacionPorMesAnio.map((m, i) => (
                <div key={m.month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{i + 1}. {m.nombre}</span>
                  <span className="text-sm font-semibold" style={{ color: occupancyColor(m.promedio) }}>
                    {m.promedio}% promedio
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Gastos ──────────────────────────────────────────────────────── */}
      <SectionCard title="Gastos">
        {gastosStats && (
          <StatGrid>
            <StatCard label="Promedio mensual (6 meses)" value={fmt(gastosStats.avg6)} />
            <StatCard label="Promedio mensual (12 meses)" value={fmt(gastosStats.avg12)} />
            <StatCard
              label="Mes con mayor gasto"
              value={fmt(gastosStats.worst.gastos)}
              sub={`${MESES_LARGO[gastosStats.worst.month - 1]} ${gastosStats.worst.year}`}
            />
          </StatGrid>
        )}

        {gastosPorCategoria.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Gastos por categoría</p>
            <div className="h-[240px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="45%"
                    innerRadius="45%"
                    outerRadius="65%"
                    dataKey="value"
                    label={false}
                  >
                    {gastosPorCategoria.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string, entry) => {
                      const payload = entry.payload as { value?: number } | undefined;
                      const pct = totalGastosPie > 0 ? Math.round(((payload?.value ?? 0) / totalGastosPie) * 100) : 0;
                      return <span className="text-xs text-gray-700">{value} ({pct}%)</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Margen neto mensual</p>
          <div className="h-[200px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={48} />
                <Tooltip content={<MargenTooltip />} />
                <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gastos"   name="Gastos"   stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      {/* ── Operativo ───────────────────────────────────────────────────── */}
      {reservasStats && (
        <SectionCard title="Operativo">
          <StatGrid>
            <StatCard
              label="Anticipación promedio"
              value={`${reservasStats.avgLeadTime} días`}
              sub="Entre reserva y check-in"
            />
            <StatCard
              label="Reservas en el período"
              value={String(reservasStats.total)}
            />
          </StatGrid>

          {reservasStats.rankingMeses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Meses con más reservas históricamente</p>
              <div className="space-y-2">
                {reservasStats.rankingMeses.map((m, i) => (
                  <div key={m.month} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{i + 1}. {m.nombre}</span>
                    <span className="text-sm font-semibold text-gray-900">{m.count} reservas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
