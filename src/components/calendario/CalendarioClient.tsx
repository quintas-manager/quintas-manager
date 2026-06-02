"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarPlus,
  Clock,
  X,
  Calendar,
  Users,
  PawPrint,
  Banknote,
  FileText,
  ChevronRight,
} from "lucide-react";
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

// Timezone-safe date comparison (UTC-X servers like Argentina)
function coversDia(r: ReservaEvento, iso: string): boolean {
  return iso >= r.fechaInicio.substring(0, 10) && iso <= r.fechaFin.substring(0, 10);
}

// Format "vie 4 jul" using local date to avoid UTC shift
function fmtDateShort(isoStr: string) {
  const [y, m, d] = isoStr.substring(0, 10).split("-").map(Number);
  return format(new Date(y, m - 1, d), "EEE d MMM", { locale: es });
}

function fmtPeso(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPO_LABELS: Record<string, string> = {
  DIA:           "Por día",
  FIN_DE_SEMANA: "Fin de semana",
  SEMANA:        "Semana",
  QUINCENA:      "Quincena",
  MES:           "Mes completo",
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
  reserva:         ReservaEvento;
}

const MAX_LANES = 3;

function computeWeekBars(week: Cell[], reservas: ReservaEvento[]): EventBar[] {
  const candidates: Omit<EventBar, "lane">[] = [];

  for (const r of reservas) {
    const rStart = r.fechaInicio.substring(0, 10);
    const rEnd   = r.fechaFin.substring(0, 10);

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
      startsHere:      week[startCol].iso === rStart,
      endsHere:        week[endCol].iso   === rEnd,
      reserva:         r,
    });
  }

  candidates.sort(
    (a, b) =>
      a.startCol - b.startCol ||
      (b.endCol - b.startCol) - (a.endCol - a.startCol),
  );

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

// ── BottomSheet ───────────────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  children,
}: {
  open:     boolean;
  onClose:  () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      {/* Sheet — full width on mobile, centred max-w on desktop */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-xl rounded-t-2xl bg-white shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{ maxHeight: "85dvh", overflowY: "auto" }}
        // Prevent taps inside the sheet from closing it
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

// ── ReservationSheet ──────────────────────────────────────────────────────────

function ReservationSheet({
  reserva,
  onClose,
}: {
  reserva: ReservaEvento;
  onClose: () => void;
}) {
  const router = useRouter();
  const estado = ESTADO_CONFIG[reserva.estado] ?? ESTADO_CONFIG.PENDIENTE;

  return (
    <div className="px-4 pb-10 pt-3">
      {/* Drag handle */}
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-200" />

      {/* Name + close */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-semibold text-gray-900">
            {reserva.clienteNombre} {reserva.clienteApellido}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: reserva.quintaColor }}
            >
              {reserva.quintaNombre}
            </span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", estado.cls)}>
              {estado.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Detail rows */}
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        {/* Dates */}
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
          <p className="text-sm text-gray-700">
            <span className="font-medium capitalize">
              {fmtDateShort(reserva.fechaInicio.substring(0, 10))}
            </span>
            {" → "}
            <span className="font-medium capitalize">
              {fmtDateShort(reserva.fechaFin.substring(0, 10))}
            </span>
            <span className="ml-2 text-gray-400">
              · {TIPO_LABELS[reserva.tipoAlquiler] ?? reserva.tipoAlquiler}
            </span>
          </p>
        </div>

        {/* Personas + mascota */}
        {(reserva.cantidadPersonas || reserva.tieneMascota) && (
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 shrink-0 text-gray-400" />
            <p className="flex items-center gap-2 text-sm text-gray-700">
              {reserva.cantidadPersonas
                ? `${reserva.cantidadPersonas} persona${reserva.cantidadPersonas !== 1 ? "s" : ""}`
                : null}
              {reserva.tieneMascota && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <PawPrint className="h-3.5 w-3.5" />
                  Con mascota
                </span>
              )}
            </p>
          </div>
        )}

        {/* Monto */}
        {reserva.montoTotal > 0 && (
          <div className="flex items-center gap-3">
            <Banknote className="h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-700">
              <span className="font-medium">{fmtPeso(reserva.montoTotal)}</span>
              {reserva.sena != null && reserva.sena > 0 && (
                <span className="ml-2 text-gray-400">
                  · seña {fmtPeso(reserva.sena)}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Notas */}
        {reserva.notas && (
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-600">{reserva.notas}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => { router.push(`/reservas/${reserva.id}`); onClose(); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Ver reserva completa
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => { router.push(`/reservas/${reserva.id}/editar`); onClose(); }}
          className="flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

// ── DaySheet ──────────────────────────────────────────────────────────────────

function DaySheet({
  dateIso,
  reservas,
  onClose,
  onReservaTap,
}: {
  dateIso:      string;
  reservas:     ReservaEvento[];
  onClose:      () => void;
  onReservaTap: (r: ReservaEvento) => void;
}) {
  const router = useRouter();

  const dayReservas = useMemo(
    () => reservas.filter((r) => coversDia(r, dateIso)),
    [reservas, dateIso],
  );

  const [y, m, d] = dateIso.split("-").map(Number);
  const label = format(new Date(y, m - 1, d), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="px-4 pb-10 pt-3">
      {/* Drag handle */}
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-200" />

      {/* Date label */}
      <p className="mb-4 capitalize text-base font-semibold text-gray-900">{label}</p>

      {/* Create options */}
      <div className="mb-4 space-y-2">
        <button
          onClick={() => { onClose(); router.push(`/reservas/nueva?fecha=${dateIso}`); }}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:bg-gray-50 active:bg-gray-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <CalendarPlus className="h-5 w-5 text-green-700" />
          </span>
          <span>
            <p className="text-sm font-medium text-gray-900">Nueva Reserva</p>
            <p className="text-xs text-gray-400">Se creará como confirmada</p>
          </span>
        </button>

        <button
          onClick={() => { onClose(); router.push(`/reservas/pendiente?fecha=${dateIso}`); }}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:bg-gray-50 active:bg-gray-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </span>
          <span>
            <p className="text-sm font-medium text-gray-900">Reserva Pendiente</p>
            <p className="text-xs text-gray-400">Se confirmará después</p>
          </span>
        </button>
      </div>

      {/* Existing reservations for this day */}
      {dayReservas.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Reservas activas · {dayReservas.length}
          </p>
          <div className="space-y-2">
            {dayReservas.map((r) => {
              const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.PENDIENTE;
              return (
                <button
                  key={r.id}
                  onClick={() => onReservaTap(r)}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:bg-gray-50 active:bg-gray-50"
                >
                  <div
                    className="h-9 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.quintaColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {r.clienteNombre} {r.clienteApellido}
                    </p>
                    <p className="text-xs text-gray-500">{r.quintaNombre}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", estado.cls)}>
                    {estado.label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </button>
              );
            })}
          </div>
        </>
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
  onDayTap:     (iso: string) => void;
  onBarTap:     (reserva: ReservaEvento) => void;
  onRef:        (el: HTMLDivElement | null) => void;
}

function MonthBlock({
  year,
  month,
  reservas,
  selectedDate,
  onDayTap,
  onBarTap,
  onRef,
}: MonthBlockProps) {
  const today   = todayStr();
  const firstWd = firstWeekday(year, month);
  const numDays = daysInMonth(year, month);

  // Tap detection: pointer position at pointerdown, cleared on pointerup/cancel
  const tapStart = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    tapStart.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerCancel() {
    tapStart.current = null;
  }
  function isTap(e: React.PointerEvent): boolean {
    if (!tapStart.current) return false;
    const moved = Math.abs(e.clientX - tapStart.current.x) + Math.abs(e.clientY - tapStart.current.y);
    tapStart.current = null;
    return moved < 10;
  }

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

  const weeks = useMemo<Cell[][]>(() => {
    const result: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cells]);

  const weekBars = useMemo<EventBar[][]>(
    () => weeks.map((w) => computeWeekBars(w, reservas)),
    [weeks, reservas],
  );

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
            {/* Day number cells */}
            <div className="grid grid-cols-7">
              {week.map((cell, col) => {
                const isToday    = cell.current && cell.iso === today;
                const isSelected = cell.current && cell.iso === selectedDate;
                return (
                  <div
                    key={col}
                    onPointerDown={cell.current ? onPointerDown : undefined}
                    onPointerUp={cell.current ? (e) => { if (isTap(e)) onDayTap(cell.iso); } : undefined}
                    onPointerCancel={onPointerCancel}
                    className={cn(
                      "flex min-h-[40px] cursor-pointer select-none items-start justify-center pt-1.5",
                      col < 6 && "border-r border-gray-100",
                      !cell.current
                        ? "pointer-events-none bg-gray-50/70"
                        : isSelected
                        ? "bg-blue-50/40"
                        : "bg-white",
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
                  </div>
                );
              })}
            </div>

            {/* Event bars lane */}
            {numLanes > 0 ? (
              <div
                className="relative"
                style={{ height: `${numLanes * 22 + 4}px` }}
              >
                {/* Column dividers */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-full border-r border-gray-100" />
                  ))}
                  <div className="h-full" />
                </div>

                {/* Bars */}
                {bars.map((bar) => (
                  <div
                    key={`${bar.id}-${bar.lane}`}
                    className="absolute flex cursor-pointer select-none items-center overflow-hidden"
                    style={{
                      left:   `calc(${bar.startCol} / 7 * 100% + ${bar.startsHere ? 2 : 0}px)`,
                      right:  `calc(${6 - bar.endCol} / 7 * 100% + ${bar.endsHere  ? 2 : 0}px)`,
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
                    onPointerDown={onPointerDown}
                    onPointerUp={(e) => {
                      if (isTap(e)) onBarTap(bar.reserva);
                    }}
                    onPointerCancel={onPointerCancel}
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

  const [months,      setMonths]      = useState<MonthEntry[]>(() => [
    shiftMonth(cy, cm, -1),
    { year: cy, month: cm },
    shiftMonth(cy, cm, 1),
  ]);
  const [reservas,    setReservas]    = useState(initialReservas);
  const [headerLabel, setHeaderLabel] = useState(`${MONTH_NAMES[cm].toUpperCase()} ${cy}`);

  // Sheet state
  const [activeBar, setActiveBar] = useState<ReservaEvento | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);

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

  // ── Sheet handlers ────────────────────────────────────────────────────────

  const handleDayTap = useCallback((iso: string) => {
    setActiveDay(iso);
  }, []);

  const handleBarTap = useCallback((reserva: ReservaEvento) => {
    setActiveBar(reserva);
  }, []);

  const closeDaySheet = useCallback(() => {
    setActiveDay(null);
  }, []);

  const closeBarSheet = useCallback(() => {
    setActiveBar(null);
  }, []);

  // From day sheet → open reservation detail
  const handleReservaTapFromDay = useCallback((r: ReservaEvento) => {
    setActiveDay(null);
    setActiveBar(r);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="-mx-4 -mt-4 flex flex-col lg:-mx-6 lg:-mt-6"
      style={{ height: "calc(100dvh - 56px)", touchAction: "pan-y" }}
    >
      {/* Fixed month/year label */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-base font-semibold text-gray-900">{headerLabel}</p>
      </div>

      {/* Scrollable month list */}
      <div
        ref={scrollRef}
        className="flex-1 bg-white"
        style={{
          height:                    "100%",
          overflowY:                 "scroll",
          WebkitOverflowScrolling:   "touch",
          overscrollBehavior:        "contain",
          overflowAnchor:            "auto",
        } as React.CSSProperties}
      >
        {months.map(({ year, month }) => (
          <MonthBlock
            key={monthKey(year, month)}
            year={year}
            month={month}
            reservas={reservas}
            selectedDate={activeDay}
            onDayTap={handleDayTap}
            onBarTap={handleBarTap}
            onRef={makeOnRef(monthKey(year, month))}
          />
        ))}
        <div className="h-20" />
      </div>

      {/* Reservation detail bottom sheet */}
      <BottomSheet open={activeBar !== null} onClose={closeBarSheet}>
        {activeBar && (
          <ReservationSheet reserva={activeBar} onClose={closeBarSheet} />
        )}
      </BottomSheet>

      {/* Day options bottom sheet */}
      <BottomSheet open={activeDay !== null} onClose={closeDaySheet}>
        {activeDay && (
          <DaySheet
            dateIso={activeDay}
            reservas={reservas}
            onClose={closeDaySheet}
            onReservaTap={handleReservaTapFromDay}
          />
        )}
      </BottomSheet>
    </div>
  );
}
