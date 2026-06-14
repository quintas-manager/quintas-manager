"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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

function nextDayIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

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

const WEEKDAYS_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

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
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        onPointerUp={onClose}
      />
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-xl rounded-t-2xl bg-white shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{ maxHeight: "85dvh", overflowY: "auto" }}
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
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-200" />

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
          type="button"
          onClick={onClose}
          className="shrink-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
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

        {reserva.montoTotal > 0 && (
          <div className="flex items-center gap-3">
            <Banknote className="h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-700">
              <span className="font-medium">{fmtPeso(reserva.montoTotal)}</span>
              {reserva.sena != null && reserva.sena > 0 && (
                <span className="ml-2 text-gray-400">· seña {fmtPeso(reserva.sena)}</span>
              )}
            </p>
          </div>
        )}

        {reserva.notas && (
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-600">{reserva.notas}</p>
          </div>
        )}
      </div>

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
    () => reservas.filter((r) => {
      const rStart = r.fechaInicio.substring(0, 10);
      const rEnd   = r.fechaFin.substring(0, 10);
      return dateIso >= rStart && dateIso <= rEnd;
    }),
    [reservas, dateIso],
  );

  const [y, m, d] = dateIso.split("-").map(Number);
  const label = format(new Date(y, m - 1, d), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="px-4 pb-10 pt-3">
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-200" />

      <p className="mb-4 capitalize text-base font-semibold text-gray-900">{label}</p>

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

type Cell = { day: number; iso: string; current: boolean };

interface MonthBlockProps {
  year:         number;
  month:        number;
  reservas:     ReservaEvento[];
  selectedDate: string | null;
  onDayTap:     (iso: string) => void;
  onPillTap:    (reserva: ReservaEvento) => void;
  onRef:        (el: HTMLDivElement | null) => void;
}

function MonthBlock({ year, month, reservas, selectedDate, onDayTap, onPillTap, onRef }: MonthBlockProps) {
  const today    = todayStr();
  const firstWd  = firstWeekday(year, month);
  const numDays  = daysInMonth(year, month);
  const tapStart = useRef<{ x: number; y: number } | null>(null);

  // Build flat cell array (leading prev-month + current days + trailing next-month)
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

  // Precompute iso → reservas[] for every day in this month
  const dayMap = useMemo(() => {
    const map        = new Map<string, ReservaEvento[]>();
    const monthStart = toIso(year, month, 1);
    const monthEnd   = toIso(year, month, numDays);

    for (const r of reservas) {
      const rStart = r.fechaInicio.substring(0, 10);
      const rEnd   = r.fechaFin.substring(0, 10);
      const from   = rStart < monthStart ? monthStart : rStart;
      const to     = rEnd   > monthEnd   ? monthEnd   : rEnd;
      if (from > to) continue;

      let cur = from;
      while (cur <= to) {
        if (!map.has(cur)) map.set(cur, []);
        map.get(cur)!.push(r);
        cur = nextDayIso(cur);
      }
    }
    return map;
  }, [year, month, numDays, reservas]);

  function onPointerDown(e: React.PointerEvent) {
    tapStart.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerCancel() { tapStart.current = null; }
  function isTap(e: React.PointerEvent): boolean {
    if (!tapStart.current) return false;
    const moved = Math.abs(e.clientX - tapStart.current.x) + Math.abs(e.clientY - tapStart.current.y);
    tapStart.current = null;
    return moved < 10;
  }

  return (
    <div ref={onRef} className="mx-3 mb-8 rounded-2xl bg-white shadow-sm p-4">
      {/* Month heading */}
      <h2 className="font-bold text-xl mb-4 tracking-wide text-gray-900">
        {MONTH_NAMES[month].toUpperCase()} {year}
      </h2>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isToday    = cell.current && cell.iso === today;
          const isSelected = cell.current && cell.iso === selectedDate;
          const dayReservas = cell.current ? (dayMap.get(cell.iso) ?? []) : [];
          const pills = dayReservas.slice(0, 2);

          return (
            <div
              key={i}
              onPointerDown={cell.current ? onPointerDown : undefined}
              onPointerUp={cell.current ? (e) => { if (isTap(e)) onDayTap(cell.iso); } : undefined}
              onPointerCancel={onPointerCancel}
              className={cn(
                "min-h-[52px] overflow-hidden border border-gray-100 p-1 select-none",
                cell.current ? "cursor-pointer" : "pointer-events-none",
                isSelected && !isToday ? "bg-gray-50" : "",
              )}
            >
              {/* Day number */}
              <div className="mb-0.5 flex justify-center">
                {isToday ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-sm font-medium text-white">
                    {cell.day}
                  </span>
                ) : (
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center text-sm font-medium",
                    cell.current ? "text-gray-900" : "text-gray-300",
                  )}>
                    {cell.day}
                  </span>
                )}
              </div>

              {/* Reservation pills */}
              {pills.length > 0 && (
                <div className="space-y-0.5">
                  {pills.map((r) => {
                    const isPendiente = r.estado === "PENDIENTE";
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onPillTap(r); }}
                        className={cn(
                          "block w-full truncate rounded-full px-1.5 py-0.5 text-center text-[9px] leading-tight",
                          isPendiente ? "border border-dashed opacity-70" : "",
                        )}
                        style={
                          isPendiente
                            ? { backgroundColor: r.quintaColor + "18", color: r.quintaColor, borderColor: r.quintaColor }
                            : { backgroundColor: r.quintaColor + "28", color: r.quintaColor }
                        }
                      >
                        {r.clienteNombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CalendarioClientProps {
  initialReservas: ReservaEvento[];
  quintas:         QuintaBasic[];
}

type MonthEntry = { year: number; month: number };

const STICKY_H = 48; // sticky month-label bar height in px

export function CalendarioClient({ initialReservas, quintas }: CalendarioClientProps) {
  const now = new Date();
  const cy  = now.getFullYear();
  const cm  = now.getMonth();

  const [months, setMonths] = useState<MonthEntry[]>(() => [
    shiftMonth(cy, cm, -1),
    { year: cy, month: cm },
    shiftMonth(cy, cm, 1),
  ]);
  const [reservas,    setReservas]    = useState(initialReservas);
  const [headerLabel, setHeaderLabel] = useState(`${MONTH_NAMES[cm].toUpperCase()} ${cy}`);

  const [activeBar, setActiveBar] = useState<ReservaEvento | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  const blockRefs        = useRef(new Map<string, HTMLDivElement>());
  const visibleKeys      = useRef(new Set<string>());
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

    const prevScrollY = window.scrollY;
    const prevHeight  = document.documentElement.scrollHeight;

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

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const delta = document.documentElement.scrollHeight - prevHeight;
          window.scrollTo(0, prevScrollY + delta);
        });
      });

      return [...add, ...prev];
    });
  }, [fetchRange]);

  // ── IntersectionObserver: update sticky header label ─────────────────────

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.getAttribute("data-month-key");
          if (!key) return;
          if (entry.isIntersecting) visibleKeys.current.add(key);
          else visibleKeys.current.delete(key);
        });

        // Show the topmost currently-visible month
        const first = months.find(({ year, month }) =>
          visibleKeys.current.has(monthKey(year, month)),
        );
        if (first) {
          setHeaderLabel(`${MONTH_NAMES[first.month].toUpperCase()} ${first.year}`);
        }
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "-56px 0px -60px 0px", // compensate fixed header + bottom nav
      },
    );

    blockRefs.current.forEach((el, key) => {
      el.setAttribute("data-month-key", key);
      io.observe(el);
    });

    return () => io.disconnect();
  }, [months]);

  // ── Window scroll: lazy-load past / future months ─────────────────────────

  useEffect(() => {
    const onScroll = () => {
      const scrollY      = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      if (scrollHeight - scrollY - clientHeight < 500) loadFuture();
      if (scrollY < 80) loadPast();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadFuture, loadPast]);

  // ── Initial scroll to current month ──────────────────────────────────────

  useEffect(() => {
    const blockEl = blockRefs.current.get(monthKey(cy, cm));
    if (blockEl) {
      blockEl.scrollIntoView({ behavior: "instant", block: "start" });
      window.scrollBy(0, -(56 + STICKY_H));
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

  const handleDayTap  = useCallback((iso: string)          => { setActiveDay(iso); },   []);
  const handlePillTap = useCallback((reserva: ReservaEvento) => { setActiveBar(reserva); }, []);
  const closeDaySheet = useCallback(() => { setActiveDay(null); },  []);
  const closeBarSheet = useCallback(() => { setActiveBar(null); }, []);
  const handleReservaTapFromDay = useCallback((r: ReservaEvento) => {
    setActiveDay(null);
    setActiveBar(r);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Sticky month/year label — clears fixed app header (56px) */}
      <div
        className="sticky z-20 border-b border-gray-200 bg-white px-4 py-3"
        style={{ top: "56px" }}
      >
        <p className="text-base font-semibold text-gray-900">{headerLabel}</p>
      </div>

      {/* Month cards — grow naturally, body handles scroll */}
      <div className="flex flex-col py-4">
        {months.map(({ year, month }, idx) => {
          const prevYear          = idx > 0 ? months[idx - 1].year : null;
          const showYearSeparator = prevYear !== null && prevYear !== year;

          return (
            <div key={monthKey(year, month)}>
              {showYearSeparator && (
                <div className="mx-3 mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm font-semibold text-gray-400">{year}</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              )}
              <MonthBlock
                year={year}
                month={month}
                reservas={reservas}
                selectedDate={activeDay}
                onDayTap={handleDayTap}
                onPillTap={handlePillTap}
                onRef={makeOnRef(monthKey(year, month))}
              />
            </div>
          );
        })}
        <div className="h-20" />
      </div>

      <BottomSheet open={activeBar !== null} onClose={closeBarSheet}>
        {activeBar && <ReservationSheet reserva={activeBar} onClose={closeBarSheet} />}
      </BottomSheet>

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
    </>
  );
}
