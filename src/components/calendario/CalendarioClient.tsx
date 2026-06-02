"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { QuintaBasic, ReservaEvento } from "@/types/calendario";

// ── Date Utilities ────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  const n = new Date();
  return toIso(n.getFullYear(), n.getMonth(), n.getDate());
}

// Timezone-safe comparison (UTC-X servers like Argentina)
function coversDia(r: ReservaEvento, iso: string): boolean {
  return iso >= r.fechaInicio.substring(0, 10) && iso <= r.fechaFin.substring(0, 10);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPO_LABELS: Record<string, string> = {
  DIA:          "Por día",
  FIN_DE_SEMANA:"Fin de semana",
  SEMANA:       "Semana",
  QUINCENA:     "Quincena",
  MES:          "Mes completo",
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-800" },
  CONFIRMADA: { label: "Confirmada", cls: "bg-green-100 text-green-800" },
  CANCELADA:  { label: "Cancelada",  cls: "bg-red-100 text-red-700"    },
  COMPLETADA: { label: "Completada", cls: "bg-blue-100 text-blue-700"  },
};

// ── Event bar types & computation ─────────────────────────────────────────────

type Cell = { day: number; iso: string; current: boolean };

interface EventBar {
  id:              string;
  startCol:        number;
  endCol:          number;
  lane:            number;
  color:           string;
  clienteNombre:   string;
  clienteApellido: string;
  isPendiente:     boolean;
  startsHere:      boolean;
  endsHere:        boolean;
}

const MAX_LANES = 3;

function computeWeekBars(week: Cell[], reservas: ReservaEvento[]): EventBar[] {
  const candidates: Omit<EventBar, "lane">[] = [];

  for (const r of reservas) {
    const rStart = r.fechaInicio.substring(0, 10);
    const rEnd   = r.fechaFin.substring(0, 10);

    // Only consider current-month cells covered by this reservation
    const coveredCols = week
      .map((cell, col) => ({ cell, col }))
      .filter(({ cell }) => cell.current && cell.iso >= rStart && cell.iso <= rEnd)
      .map(({ col }) => col);

    if (coveredCols.length === 0) continue;

    const startCol = coveredCols[0];
    const endCol   = coveredCols[coveredCols.length - 1];

    candidates.push({
      id:              r.id,
      startCol,
      endCol,
      color:           r.quintaColor,
      clienteNombre:   r.clienteNombre,
      clienteApellido: r.clienteApellido,
      isPendiente:     r.estado === "PENDIENTE",
      // rounded ends only where the reservation actually starts/ends
      startsHere: week[startCol].iso === rStart,
      endsHere:   week[endCol].iso   === rEnd,
    });
  }

  // Sort: earlier start first, then longer span first
  candidates.sort(
    (a, b) =>
      a.startCol - b.startCol ||
      (b.endCol - b.startCol) - (a.endCol - a.startCol),
  );

  // Greedy lane assignment
  const laneEnds: number[] = [];
  const result: EventBar[]  = [];

  for (const bar of candidates) {
    let lane = laneEnds.findIndex((end) => end < bar.startCol);
    if (lane === -1) lane = laneEnds.length;
    if (lane >= MAX_LANES) continue;
    laneEnds[lane] = bar.endCol;
    result.push({ ...bar, lane });
  }

  return result;
}

// ── DayPanel ──────────────────────────────────────────────────────────────────

function DayPanel({
  dateIso,
  reservas,
}: {
  dateIso:  string;
  reservas: ReservaEvento[];
}) {
  const router = useRouter();

  const dayReservas = useMemo(
    () => reservas.filter((r) => coversDia(r, dateIso)),
    [reservas, dateIso],
  );

  const [y, m, d] = dateIso.split("-").map(Number);
  const label = format(new Date(y, m - 1, d), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="border-t border-gray-200 bg-gray-50/80 px-4 pb-4 pt-4">
      <p className="mb-3 capitalize text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>

      {dayReservas.length === 0 ? (
        <p className="py-2 text-sm text-gray-400">Sin reservas para este día</p>
      ) : (
        <div className="space-y-2">
          {dayReservas.map((r) => {
            const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.PENDIENTE;
            return (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {r.clienteNombre} {r.clienteApellido}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {format(parseISO(r.fechaInicio), "d/MM/yy")} →{" "}
                      {format(parseISO(r.fechaFin), "d/MM/yy")} ·{" "}
                      {TIPO_LABELS[r.tipoAlquiler] ?? r.tipoAlquiler}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/reservas/${r.id}`)}
                    className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700"
                  >
                    Ver →
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: r.quintaColor }}
                  >
                    {r.quintaNombre}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      estado.cls,
                    )}
                  >
                    {estado.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MonthBlock ────────────────────────────────────────────────────────────────

interface MonthBlockProps {
  year:         number;
  month:        number;
  reservas:     ReservaEvento[];
  selectedDate: string | null;
  onSelectDate: (iso: string | null) => void;
  onRef:        (el: HTMLDivElement | null) => void;
}

function MonthBlock({
  year,
  month,
  reservas,
  selectedDate,
  onSelectDate,
  onRef,
}: MonthBlockProps) {
  const today   = todayStr();
  const firstWd = firstWeekday(year, month);
  const numDays = daysInMonth(year, month);

  // Build flat cell array (prev-month padding + current month + next-month trailing)
  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    const pm       = shiftMonth(year, month, -1);
    const nm       = shiftMonth(year, month, 1);
    const prevDays = daysInMonth(pm.year, pm.month);

    for (let i = firstWd - 1; i >= 0; i--) {
      const d = prevDays - i;
      out.push({ day: d, iso: toIso(pm.year, pm.month, d), current: false });
    }
    for (let d = 1; d <= numDays; d++) {
      out.push({ day: d, iso: toIso(year, month, d), current: true });
    }
    const trailing = out.length % 7 === 0 ? 0 : 7 - (out.length % 7);
    for (let d = 1; d <= trailing; d++) {
      out.push({ day: d, iso: toIso(nm.year, nm.month, d), current: false });
    }
    return out;
  }, [year, month, firstWd, numDays]);

  // Split into rows of 7
  const weeks = useMemo<Cell[][]>(() => {
    const result: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cells]);

  // Event bars per week
  const weekBars = useMemo<EventBar[][]>(
    () => weeks.map((w) => computeWeekBars(w, reservas)),
    [weeks, reservas],
  );

  const mPrefix      = `${year}-${String(month + 1).padStart(2, "0")}`;
  const selectedHere = selectedDate?.startsWith(mPrefix) ? selectedDate : null;

  return (
    <div ref={onRef}>
      {/* Month heading */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 pb-2.5 pt-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600">
          {MONTH_NAMES[month]} {year}
        </h2>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400",
              i < 6 && "border-r border-gray-100",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => {
        const bars     = weekBars[wi];
        const numLanes = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0;

        return (
          <div key={wi} className="border-b border-gray-100 last:border-b-0">
            {/* Day numbers */}
            <div className="grid grid-cols-7">
              {week.map((cell, col) => {
                const isToday    = cell.current && cell.iso === today;
                const isSelected = cell.current && cell.iso === selectedDate;
                return (
                  <button
                    key={col}
                    type="button"
                    disabled={!cell.current}
                    onClick={() => onSelectDate(isSelected ? null : cell.iso)}
                    className={cn(
                      "flex min-h-[40px] items-start justify-center pt-1.5 transition-colors",
                      col < 6 && "border-r border-gray-100",
                      !cell.current
                        ? "pointer-events-none bg-gray-50/70"
                        : isSelected
                        ? "bg-blue-50/40 hover:bg-blue-50/60"
                        : "bg-white hover:bg-gray-50/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full leading-none transition-colors",
                        isToday && !isSelected && "bg-red-500 text-sm font-bold text-white",
                        isSelected && !isToday  && "bg-gray-800 text-sm font-semibold text-white",
                        isSelected && isToday   && "bg-red-500 text-sm font-bold text-white",
                        !isToday && !isSelected && cell.current  && "text-sm text-gray-900",
                        !cell.current && "text-xs text-gray-300",
                      )}
                    >
                      {cell.day}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Event bars lane */}
            {numLanes > 0 ? (
              <div
                className="relative"
                style={{ height: `${numLanes * 22 + 4}px` }}
              >
                {/* Column dividers continuing through events area */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-full border-r border-gray-100" />
                  ))}
                  <div className="h-full" />
                </div>

                {bars.map((bar) => (
                  <div
                    key={`${bar.id}-${bar.lane}`}
                    className="absolute flex items-center overflow-hidden"
                    style={{
                      // Starts flush with cell edge for continuation bars,
                      // 2 px inset when the reservation actually starts here
                      left:  `calc(${bar.startCol} / 7 * 100% + ${bar.startsHere ? 2 : 0}px)`,
                      right: `calc(${6 - bar.endCol} / 7 * 100% + ${bar.endsHere  ? 2 : 0}px)`,
                      top:    `${bar.lane * 22 + 2}px`,
                      height: "20px",
                      backgroundColor: bar.color,
                      opacity:         bar.isPendiente ? 0.5 : 1,
                      borderRadius: [
                        bar.startsHere ? 3 : 0,
                        bar.endsHere   ? 3 : 0,
                        bar.endsHere   ? 3 : 0,
                        bar.startsHere ? 3 : 0,
                      ].map((v) => `${v}px`).join(" "),
                    }}
                  >
                    <span className="truncate whitespace-nowrap px-1.5 text-[11px] font-medium leading-none text-white">
                      {bar.clienteNombre} {bar.clienteApellido}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-1.5" />
            )}
          </div>
        );
      })}

      {/* Day detail panel */}
      {selectedHere && (
        <DayPanel dateIso={selectedHere} reservas={reservas} />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CalendarioClientProps {
  initialReservas: ReservaEvento[];
  quintas:         QuintaBasic[];
}

type MonthEntry = { year: number; month: number };

export function CalendarioClient({
  initialReservas,
}: CalendarioClientProps) {
  const now = new Date();
  const cy  = now.getFullYear();
  const cm  = now.getMonth();

  const [months, setMonths] = useState<MonthEntry[]>(() => [
    shiftMonth(cy, cm, -1),
    { year: cy, month: cm },
    shiftMonth(cy, cm, 1),
  ]);

  const [reservas,     setReservas]     = useState(initialReservas);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [headerLabel,  setHeaderLabel]  = useState(
    `${MONTH_NAMES[cm].toUpperCase()} ${cy}`,
  );

  const scrollRef        = useRef<HTMLDivElement>(null);
  const blockRefs        = useRef(new Map<string, HTMLDivElement>());
  const fetchedKeys      = useRef(new Set<string>([
    monthKey(shiftMonth(cy, cm, -1).year, shiftMonth(cy, cm, -1).month),
    monthKey(cy, cm),
    monthKey(shiftMonth(cy, cm, 1).year, shiftMonth(cy, cm, 1).month),
  ]));
  const isFetchingFuture = useRef(false);
  const isFetchingPast   = useRef(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchRange = useCallback(async (desde: Date, hasta: Date, keys: string[]) => {
    try {
      const res = await fetch(
        `/api/reservas?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`,
      );
      if (res.ok) {
        const data: ReservaEvento[] = await res.json();
        setReservas((prev) => {
          const ids   = new Set(prev.map((r) => r.id));
          const fresh = data.filter((r) => !ids.has(r.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
    } finally {
      keys.forEach((k) => fetchedKeys.current.add(k));
    }
  }, []);

  // ── Load more months ──────────────────────────────────────────────────────

  const loadFuture = useCallback(() => {
    if (isFetchingFuture.current) return;
    isFetchingFuture.current = true;

    setMonths((prev) => {
      const last = prev[prev.length - 1];
      const n1   = shiftMonth(last.year, last.month, 1);
      const n2   = shiftMonth(last.year, last.month, 2);
      const add  = [n1, n2].filter(
        (m) => !prev.some((p) => p.year === m.year && p.month === m.month),
      );
      if (add.length === 0) { isFetchingFuture.current = false; return prev; }

      const keys      = add.map((m) => monthKey(m.year, m.month));
      const unfetched = keys.filter((k) => !fetchedKeys.current.has(k));
      if (unfetched.length > 0) {
        fetchRange(
          new Date(n1.year, n1.month, 1),
          new Date(n2.year, n2.month + 1, 0),
          keys,
        ).finally(() => { isFetchingFuture.current = false; });
      } else {
        isFetchingFuture.current = false;
      }
      return [...prev, ...add];
    });
  }, [fetchRange]);

  const loadPast = useCallback(() => {
    if (isFetchingPast.current) return;
    isFetchingPast.current = true;

    setMonths((prev) => {
      const first = prev[0];
      const p1    = shiftMonth(first.year, first.month, -2);
      const p2    = shiftMonth(first.year, first.month, -1);
      const add   = [p1, p2].filter(
        (m) => !prev.some((p) => p.year === m.year && p.month === m.month),
      );
      if (add.length === 0) { isFetchingPast.current = false; return prev; }

      const keys      = add.map((m) => monthKey(m.year, m.month));
      const unfetched = keys.filter((k) => !fetchedKeys.current.has(k));
      if (unfetched.length > 0) {
        fetchRange(
          new Date(p1.year, p1.month, 1),
          new Date(p2.year, p2.month + 1, 0),
          keys,
        ).finally(() => { isFetchingPast.current = false; });
      } else {
        isFetchingPast.current = false;
      }
      return [...add, ...prev];
    });
  }, [fetchRange]);

  // ── Scroll: lazy load + sticky header update ──────────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;

      if (scrollHeight - scrollTop - clientHeight < 500) loadFuture();
      if (scrollTop < 300) loadPast();

      let bestOffset = -1;
      let bestKey: string | null = null;
      Array.from(blockRefs.current.entries()).forEach(([key, blockEl]) => {
        const ot = blockEl.offsetTop;
        if (ot <= scrollTop + 80 && ot > bestOffset) {
          bestOffset = ot;
          bestKey = key;
        }
      });
      if (bestKey) {
        const [yr, mo] = (bestKey as string).split("-").map(Number);
        setHeaderLabel(`${MONTH_NAMES[mo - 1].toUpperCase()} ${yr}`);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadFuture, loadPast]);

  // ── Initial scroll to current month ──────────────────────────────────────

  useEffect(() => {
    const key     = monthKey(cy, cm);
    const blockEl = blockRefs.current.get(key);
    if (blockEl && scrollRef.current) {
      scrollRef.current.scrollTop = blockEl.offsetTop;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ref callbacks ─────────────────────────────────────────────────────────

  const makeOnRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) blockRefs.current.set(key, el);
      else blockRefs.current.delete(key);
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="-mx-4 -mt-4 flex flex-col lg:-mx-6 lg:-mt-6"
      style={{ height: "calc(100dvh - 56px)" }}
    >
      {/* Fixed month/year label */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-base font-semibold text-gray-900">{headerLabel}</p>
      </div>

      {/* Scrollable month list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white"
        style={{ overflowAnchor: "auto" } as React.CSSProperties}
      >
        {months.map(({ year, month }) => (
          <MonthBlock
            key={monthKey(year, month)}
            year={year}
            month={month}
            reservas={reservas}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onRef={makeOnRef(monthKey(year, month))}
          />
        ))}
        <div className="h-20" />
      </div>
    </div>
  );
}
