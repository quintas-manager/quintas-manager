"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function shiftM(y: number, m: number, delta: number) {
  const dt = new Date(y, m + delta, 1);
  return { y: dt.getFullYear(), m: dt.getMonth() };
}
function nightCount(start: string, end: string) {
  return Math.round(
    (new Date(end + "T12:00:00").getTime() - new Date(start + "T12:00:00").getTime()) / 86400000,
  );
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return format(new Date(y, m - 1, d), "EEE d MMM", { locale: es });
}

const WEEKDAYS  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlockedRange { start: string; end: string; }

interface DateRangePickerProps {
  startDate: string;   // "" if not yet selected
  endDate:   string;   // "" if not yet selected
  onChange:  (start: string, end: string) => void;
  quintaColor: string;
  blockedRanges: BlockedRange[];
  error?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  quintaColor,
  blockedRanges,
  error,
}: DateRangePickerProps) {
  const now      = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewY, setViewY] = useState(() =>
    startDate ? parseInt(startDate.slice(0, 4)) : now.getFullYear(),
  );
  const [viewM, setViewM] = useState(() =>
    startDate ? parseInt(startDate.slice(5, 7)) - 1 : now.getMonth(),
  );
  // step 0 = waiting for start, step 1 = waiting for end
  const [step,  setStep]  = useState<0 | 1>(0);
  const [hover, setHover] = useState<string | null>(null);

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const numDays  = daysInMonth(viewY, viewM);
  const firstWd  = firstWeekday(viewY, viewM);
  const pm       = shiftM(viewY, viewM, -1);
  const nm       = shiftM(viewY, viewM,  1);
  const prevDays = daysInMonth(pm.y, pm.m);

  const cells: { day: number; iso: string; current: boolean }[] = [];
  for (let i = firstWd - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, iso: toIso(pm.y, pm.m, prevDays - i), current: false });
  for (let d = 1; d <= numDays; d++)
    cells.push({ day: d, iso: toIso(viewY, viewM, d), current: true });
  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= trailing; d++)
    cells.push({ day: d, iso: toIso(nm.y, nm.m, d), current: false });

  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // ── Helpers ───────────────────────────────────────────────────────────────

  function isBlocked(iso: string) {
    return blockedRanges.some((r) => iso >= r.start && iso <= r.end);
  }

  // Displayed range uses hover preview during step 1
  const dispStart = startDate || null;
  const dispEnd   = step === 1 && hover ? hover : (endDate || null);

  function effectiveBounds() {
    if (!dispStart || !dispEnd) return { s: null, e: null };
    return dispStart <= dispEnd
      ? { s: dispStart, e: dispEnd }
      : { s: dispEnd,   e: dispStart };
  }

  function inRange(iso: string) {
    const { s, e } = effectiveBounds();
    return s && e ? iso > s && iso < e : false;
  }
  function isStart(iso: string) {
    const { s } = effectiveBounds();
    return iso === s;
  }
  function isEnd(iso: string) {
    const { e } = effectiveBounds();
    return e ? iso === e : false;
  }
  function isSingleDay() {
    const { s, e } = effectiveBounds();
    return s && e && s === e;
  }

  // ── Click handler ─────────────────────────────────────────────────────────

  function handleClick(iso: string, current: boolean) {
    if (!current || isBlocked(iso)) return;

    if (step === 0) {
      onChange(iso, "");
      setStep(1);
    } else {
      // Step 1: picking end
      if (iso >= startDate) {
        onChange(startDate, iso);
      } else {
        // Clicked before start: use iso as new start, old start as end
        onChange(iso, startDate);
      }
      setStep(0);
      setHover(null);
    }
  }

  function prevMonth() { const n = shiftM(viewY, viewM, -1); setViewY(n.y); setViewM(n.m); }
  function nextMonth() { const n = shiftM(viewY, viewM,  1); setViewY(n.y); setViewM(n.m); }

  const nights = startDate && endDate ? nightCount(startDate, endDate) : null;
  const single = isSingleDay();

  return (
    <div>
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-white",
          error ? "border-red-400" : "border-gray-200",
        )}
      >
        {/* Month header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {MONTH_NAMES[viewM]} {viewY}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 px-2 pt-3 pb-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="px-2 pb-3">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((cell, col) => {
                const blk      = cell.current && isBlocked(cell.iso);
                const start    = cell.current && isStart(cell.iso);
                const end      = cell.current && isEnd(cell.iso);
                const mid      = cell.current && inRange(cell.iso);
                const isToday  = cell.iso === todayIso;

                // Strip spans full height of cell; clipped on start/end sides
                const showStrip = cell.current && !single && (start || end || mid);
                const stripLeft  = end && !start ? "left-0"   : "left-1/2";
                const stripRight = start && !end  ? "right-0"  : "right-1/2";

                return (
                  <div
                    key={col}
                    className="relative py-0.5"
                    onMouseEnter={() =>
                      cell.current && step === 1 && !blk && setHover(cell.iso)
                    }
                    onMouseLeave={() => step === 1 && setHover(null)}
                  >
                    {/* Range strip */}
                    {showStrip && (
                      <div
                        className={cn("absolute inset-y-0.5", stripLeft, stripRight)}
                        style={{ backgroundColor: `${quintaColor}22` }}
                      />
                    )}

                    {/* Day circle */}
                    <button
                      type="button"
                      disabled={!cell.current || blk}
                      onClick={() => handleClick(cell.iso, cell.current)}
                      className={cn(
                        "relative z-10 mx-auto flex h-9 w-9 select-none items-center justify-center rounded-full text-sm transition",
                        !cell.current && "pointer-events-none text-gray-300",
                        cell.current && !start && !end && !mid && !blk &&
                          "cursor-pointer text-gray-900 hover:bg-gray-100",
                        mid && !start && !end && "text-gray-800",
                        blk && "cursor-not-allowed text-gray-300 line-through",
                        isToday && !start && !end && "ring-1 ring-inset ring-gray-400 font-semibold",
                        step === 1 && cell.current && !blk && !start && !end &&
                          "cursor-pointer",
                      )}
                      style={
                        (start || end)
                          ? { backgroundColor: quintaColor, color: "#fff" }
                          : undefined
                      }
                    >
                      {cell.day}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Summary / prompt */}
      <div className="mt-2 min-h-[20px] text-center text-sm">
        {!startDate && step === 0 && (
          <span className="text-gray-400">Seleccioná la fecha de ingreso</span>
        )}
        {startDate && step === 1 && (
          <span className="text-blue-600">Ahora seleccioná la fecha de salida</span>
        )}
        {startDate && endDate && step === 0 && (
          <span className="text-gray-600">
            <span className="capitalize font-medium">{fmtDate(startDate)}</span>
            {" → "}
            <span className="capitalize font-medium">{fmtDate(endDate)}</span>
            {nights !== null && nights > 0 && (
              <span className="ml-2 text-gray-400">
                · {nights} {nights === 1 ? "noche" : "noches"}
              </span>
            )}
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
