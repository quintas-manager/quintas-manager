"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import { useCallback, useMemo, useRef, useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  X,
  CalendarDays,
  Home,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuintaBasic, ReservaEvento } from "@/types/calendario";

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return hex + a;
}

function formatFecha(iso: string) {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

function formatMonto(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Exclusive end date for FullCalendar allDay events
function exclusiveEnd(isoFechaFin: string): string {
  return format(addDays(parseISO(isoFechaFin), 1), "yyyy-MM-dd");
}

const TIPO_LABELS: Record<string, string> = {
  DIA: "Por día",
  FIN_DE_SEMANA: "Fin de semana",
  SEMANA: "Semana",
  QUINCENA: "Quincena",
  MES: "Mes completo",
};

const ESTADO_CONFIG: Record<string, { label: string; classes: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    classes: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  },
  CONFIRMADA: {
    label: "Confirmada",
    classes: "bg-green-100 text-green-800 ring-1 ring-green-200",
  },
};

// ── Evento Modal ──────────────────────────────────────────────────────────────

function EventoModal({
  reserva,
  onClose,
}: {
  reserva: ReservaEvento;
  onClose: () => void;
}) {
  const router = useRouter();
  const estado = ESTADO_CONFIG[reserva.estado] ?? ESTADO_CONFIG.PENDIENTE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header con color de quinta */}
        <div
          className="flex items-center justify-between rounded-t-2xl px-5 py-4"
          style={{ backgroundColor: hexWithAlpha(reserva.quintaColor, 0.12) }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: reserva.quintaColor }}
            />
            <span className="text-sm font-semibold text-gray-800">
              {reserva.quintaNombre}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-black/10 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Cliente */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Cliente
            </p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">
              {reserva.clienteNombre} {reserva.clienteApellido}
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            {/* Fechas */}
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <span className="text-gray-900">{formatFecha(reserva.fechaInicio)}</span>
                <span className="mx-1.5 text-gray-400">→</span>
                <span className="text-gray-900">{formatFecha(reserva.fechaFin)}</span>
              </div>
            </div>

            {/* Quinta */}
            <div className="flex items-center gap-3">
              <Home className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="text-gray-700">{reserva.quintaNombre}</span>
            </div>

            {/* Tipo alquiler */}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="text-gray-700">
                {TIPO_LABELS[reserva.tipoAlquiler] ?? reserva.tipoAlquiler}
              </span>
            </div>

            {/* Monto */}
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="font-medium text-gray-900">
                {formatMonto(reserva.montoTotal)}
              </span>
              {reserva.seña != null && (
                <span className="text-gray-400">
                  · seña {formatMonto(reserva.seña)}
                </span>
              )}
            </div>

            {/* Motivo */}
            {reserva.motivoEvento && (
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="text-gray-700">{reserva.motivoEvento}</span>
              </div>
            )}

            {/* Notas */}
            {reserva.notas && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="text-gray-600 italic">{reserva.notas}</span>
              </div>
            )}
          </div>

          {/* Estado badge */}
          <div>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                estado.classes
              )}
            >
              {estado.label}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            onClick={() => router.push(`/reservas/${reserva.id}`)}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            Ver reserva completa →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Nueva Reserva Modal ───────────────────────────────────────────────────────

function NuevaReservaModal({
  fecha,
  quintas,
  onClose,
}: {
  fecha: string;
  quintas: QuintaBasic[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [quintaId, setQuintaId] = useState(quintas[0]?.id ?? "");
  const fechaLabel = format(parseISO(fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Nueva reserva</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Fecha de inicio</p>
            <p className="mt-0.5 text-sm font-medium capitalize text-gray-900">
              {fechaLabel}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Quinta
            </label>
            <div className="space-y-2">
              {quintas.map((q) => (
                <label
                  key={q.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition",
                    quintaId === q.id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="quinta"
                    value={q.id}
                    checked={quintaId === q.id}
                    onChange={() => setQuintaId(q.id)}
                    className="sr-only"
                  />
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: q.colorHex }}
                  />
                  <span className="text-sm font-medium text-gray-800">
                    {q.nombre}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              router.push(
                `/reservas/nueva?fecha=${fecha}&quintaId=${quintaId}`
              )
            }
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CalendarioClientProps {
  initialReservas: ReservaEvento[];
  quintas: QuintaBasic[];
}

export function CalendarioClient({
  initialReservas,
  quintas,
}: CalendarioClientProps) {
  const [reservas, setReservas] = useState<ReservaEvento[]>(initialReservas);
  const [filtroQuinta, setFiltroQuinta] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [isFetching, setIsFetching] = useState(false);
  const [eventoModal, setEventoModal] = useState<ReservaEvento | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState<string | null>(null);

  // Count per quinta in current fetched range
  const countByQuinta = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reservas) {
      counts[r.quintaId] = (counts[r.quintaId] ?? 0) + 1;
    }
    return counts;
  }, [reservas]);

  // FullCalendar events derived from reservas + active filters
  const events = useMemo(() => {
    return reservas
      .filter((r) => filtroQuinta === "todas" || r.quintaId === filtroQuinta)
      .filter((r) => filtroEstado === "todas" || r.estado === filtroEstado)
      .map((r) => {
        const confirmada = r.estado === "CONFIRMADA";
        return {
          id: r.id,
          title: `${r.clienteNombre} ${r.clienteApellido}`,
          start: r.fechaInicio.split("T")[0],
          end: exclusiveEnd(r.fechaFin),
          allDay: true,
          backgroundColor: confirmada
            ? r.quintaColor
            : hexWithAlpha(r.quintaColor, 0.18),
          borderColor: r.quintaColor,
          textColor: confirmada ? "#ffffff" : r.quintaColor,
          extendedProps: r,
        };
      });
  }, [reservas, filtroQuinta, filtroEstado]);

  const handleDatesSet = useCallback(async (info: DatesSetArg) => {
    setIsFetching(true);
    try {
      const res = await fetch(
        `/api/reservas?desde=${info.startStr}&hasta=${info.endStr}`
      );
      if (!res.ok) return;
      const data: ReservaEvento[] = await res.json();
      setReservas(data);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setEventoModal(info.event.extendedProps as ReservaEvento);
  }, []);

  const handleDateClick = useCallback((info: DateClickArg) => {
    setNuevaFecha(info.dateStr);
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Badges por quinta */}
        <div className="flex flex-wrap gap-2">
          {quintas.map((q) => {
            const count = countByQuinta[q.id] ?? 0;
            return (
              <div
                key={q.id}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: hexWithAlpha(q.colorHex, 0.4),
                  backgroundColor: hexWithAlpha(q.colorHex, 0.08),
                  color: q.colorHex,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: q.colorHex }}
                />
                {q.nombre}
                <span
                  className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: q.colorHex }}
                >
                  {count}
                </span>
              </div>
            );
          })}
          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando…
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filtroQuinta}
            onChange={(e) => setFiltroQuinta(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="todas">Todas las quintas</option>
            {quintas.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nombre}
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="todas">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="CONFIRMADA">Confirmada</option>
          </select>
        </div>
      </div>

      {/* Leyenda de estados */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Colores:</span>
        {quintas.map((q) => (
          <span key={q.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: q.colorHex }}
            />
            {q.nombre}
          </span>
        ))}
        <span className="ml-2 flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-gray-400 bg-gray-100" />
          Pendiente (fondo claro)
        </span>
      </div>

      {/* ── Calendario ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek,listMonth",
          }}
          buttonText={{
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            list: "Lista",
          }}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} más`}
          nowIndicator
          selectable
          eventTimeFormat={{ hour: undefined, minute: undefined }}
          eventClassNames="cursor-pointer rounded-md text-xs font-medium px-1"
          dayCellClassNames="hover:bg-gray-50 transition-colors"
        />
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {eventoModal && (
        <EventoModal
          reserva={eventoModal}
          onClose={() => setEventoModal(null)}
        />
      )}
      {nuevaFecha && (
        <NuevaReservaModal
          fecha={nuevaFecha}
          quintas={quintas}
          onClose={() => setNuevaFecha(null)}
        />
      )}
    </div>
  );
}
