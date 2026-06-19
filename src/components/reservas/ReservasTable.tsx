"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO, startOfToday, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import {
  Pencil, XCircle, Search, X, Trash2, Loader2,
  Phone, PawPrint, Users, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import { CancelarModal } from "./CancelarModal";
import { ConfirmarConMontoModal } from "./ConfirmarConMontoModal";
import { eliminarReserva } from "@/lib/actions/reservas";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReservaRow {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteApellido: string;
  clienteTelefono: string;
  quintaNombre: string;
  quintaColor: string;
  fechaInicio: string;
  fechaFin: string;
  tipoAlquiler: string;
  montoTotal: number;
  sena: number | null;
  estado: string;
  notas: string | null;
  motivoEvento: string | null;
  cantidadPersonas: number | null;
  tieneMascota: boolean;
}

type Chip = "proximas" | "canceladas" | "todas";

interface Props {
  reservas: ReservaRow[];
  tipoCambio?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  DIA: "Día",
  FIN_DE_SEMANA: "Fin de semana",
  SEMANA: "Semana",
  QUINCENA: "Quincena",
  MES: "Mes",
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  CONFIRMADA: { label: "Confirmada", cls: "bg-green-100 text-green-700 ring-1 ring-green-200" },
  CANCELADA:  { label: "Cancelada",  cls: "bg-red-100 text-red-600 ring-1 ring-red-200" },
  COMPLETADA: { label: "Completada", cls: "bg-blue-100 text-blue-700 ring-1 ring-blue-200" },
};

const CHIP_LABELS: Record<Chip, string> = {
  proximas:   "Próximas",
  canceladas: "Canceladas",
  todas:      "Todas",
};

const fmt = (iso: string) => format(parseISO(iso), "d/MM/yy", { locale: es });
const fmtLong = (iso: string) =>
  format(parseISO(iso), "EEEE d 'de' MMMM yyyy", { locale: es });

// ── Detail drawer ─────────────────────────────────────────────────────────────

function ReservaDrawer({
  reserva,
  onClose,
  onCancelar,
}: {
  reserva: ReservaRow;
  onClose: () => void;
  onCancelar: (r: { id: string; nombre: string }) => void;
}) {
  const estado = ESTADO_CONFIG[reserva.estado] ?? ESTADO_CONFIG.PENDIENTE;
  const puedeEditar   = ["PENDIENTE", "CONFIRMADA"].includes(reserva.estado);
  const puedeCancelar = puedeEditar;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        onPointerUp={onClose}
        aria-hidden="true"
      />

      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900">
                {reserva.clienteNombre} {reserva.clienteApellido}
              </h2>
              <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", estado.cls)}>
                {estado.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 capitalize">{fmtLong(reserva.fechaInicio)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{ backgroundColor: reserva.quintaColor + "1A" }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-base font-bold"
              style={{ backgroundColor: reserva.quintaColor }}
            >
              {reserva.quintaNombre.charAt(0)}
            </span>
            <span className="font-medium text-gray-900">{reserva.quintaNombre}</span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
            <Row label="Fechas" value={`${fmt(reserva.fechaInicio)} → ${fmt(reserva.fechaFin)}`} />
            <Row label="Tipo" value={TIPO_LABELS[reserva.tipoAlquiler] ?? reserva.tipoAlquiler} />
            {reserva.motivoEvento && <Row label="Motivo" value={reserva.motivoEvento} />}
            {reserva.cantidadPersonas && (
              <Row
                label="Personas"
                value={
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {reserva.cantidadPersonas}
                  </span>
                }
              />
            )}
            <Row
              label="Mascota"
              value={
                <span className="flex items-center gap-1">
                  <PawPrint className="h-3.5 w-3.5 text-gray-400" />
                  {reserva.tieneMascota ? "Sí" : "No"}
                </span>
              }
            />
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
            <Row label="Monto total" value={formatUSD(reserva.montoTotal)} />
            <Row label="Seña acordada" value={reserva.sena != null ? formatUSD(reserva.sena) : "—"} />
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
            <Row
              label="Teléfono"
              value={
                <a
                  href={`tel:${reserva.clienteTelefono}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {reserva.clienteTelefono}
                </a>
              }
            />
          </div>

          {reserva.notas && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Notas</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{reserva.notas}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-4 flex flex-wrap gap-2">
          <Link
            href={`/reservas/${reserva.id}`}
            onClick={onClose}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition"
          >
            <ExternalLink className="h-4 w-4" />
            Ver detalle completo
          </Link>
          {puedeEditar && (
            <Link
              href={`/reservas/${reserva.id}/editar`}
              onClick={onClose}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          )}
          {puedeCancelar && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCancelar({ id: reserva.id, nombre: `${reserva.clienteNombre} ${reserva.clienteApellido}` });
              }}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
            >
              <XCircle className="h-4 w-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 px-4 py-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-xs font-medium text-gray-900">{value}</dd>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReservasTable({ reservas, tipoCambio = 0 }: Props) {
  const [busqueda,       setBusqueda]       = useState("");
  const [chip,           setChip]           = useState<Chip>("proximas");
  const [cancelModal,    setCancelModal]    = useState<{ id: string; nombre: string } | null>(null);
  const [confirmarModal, setConfirmarModal] = useState<{ id: string; nombre: string } | null>(null);
  const [deleteModal,    setDeleteModal]    = useState<{ id: string; nombre: string } | null>(null);
  const [deleting,       setDeleting]       = useState(false);
  const [drawerReserva,  setDrawerReserva]  = useState<ReservaRow | null>(null);

  async function handleEliminar(id: string) {
    setDeleting(true);
    try {
      await eliminarReserva(id);
      setDeleteModal(null);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const today = startOfToday();

    let list: ReservaRow[];

    if (chip === "proximas") {
      list = reservas
        .filter((r) =>
          ["CONFIRMADA", "PENDIENTE"].includes(r.estado) &&
          !isBefore(parseISO(r.fechaInicio), today),
        );
    } else if (chip === "canceladas") {
      list = [...reservas]
        .filter((r) => ["CANCELADA", "COMPLETADA"].includes(r.estado))
        .sort((a, b) => parseISO(b.fechaInicio).getTime() - parseISO(a.fechaInicio).getTime());
    } else {
      list = reservas; // already sorted asc from server
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.clienteNombre.toLowerCase().includes(q) ||
          r.clienteApellido.toLowerCase().includes(q),
      );
    }

    return list;
  }, [reservas, chip, busqueda]);

  return (
    <div className="space-y-4">
      {/* ── Search + chips ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-0"
          />
        </div>

        <div className="flex gap-2">
          {(["proximas", "canceladas", "todas"] as Chip[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              className={cn(
                "min-h-[36px] rounded-full px-4 py-1 text-sm font-medium transition-colors",
                chip === c
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {CHIP_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No se encontraron reservas</p>
          </div>
        ) : (
          <>
            {/* ── Desktop table ──────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Cliente", "Quinta", "Fechas", "Tipo", "Monto", "Seña", "Estado", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((r) => {
                    const estadoCfg     = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.PENDIENTE;
                    const puedeEditar   = ["PENDIENTE", "CONFIRMADA"].includes(r.estado);
                    const puedeCancelar = puedeEditar;
                    return (
                      <tr
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setDrawerReserva(r)}
                        onKeyDown={(e) => e.key === "Enter" && setDrawerReserva(r)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {r.clienteNombre} {r.clienteApellido}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.quintaColor }} />
                            <span className="text-gray-700">{r.quintaNombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {fmt(r.fechaInicio)} → {fmt(r.fechaFin)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {TIPO_LABELS[r.tipoAlquiler] ?? r.tipoAlquiler}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {formatUSD(r.montoTotal)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {r.sena != null ? formatUSD(r.sena) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            estadoCfg.cls,
                            r.estado === "PENDIENTE" && "font-semibold ring-2",
                          )}>
                            {estadoCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {puedeEditar && (
                              <Link
                                href={`/reservas/${r.id}/editar`}
                                title="Editar"
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            )}
                            {r.estado === "PENDIENTE" && (
                              <button
                                title="Confirmar"
                                onClick={() => setConfirmarModal({ id: r.id, nombre: `${r.clienteNombre} ${r.clienteApellido}` })}
                                className="min-h-[44px] rounded-lg px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition"
                              >
                                Confirmar
                              </button>
                            )}
                            {puedeCancelar && (
                              <button
                                title="Cancelar"
                                onClick={() => setCancelModal({ id: r.id, nombre: `${r.clienteNombre} ${r.clienteApellido}` })}
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              title="Eliminar"
                              onClick={() => setDeleteModal({ id: r.id, nombre: `${r.clienteNombre} ${r.clienteApellido}` })}
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ───────────────────────────── */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((r) => {
                const estadoCfg     = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.PENDIENTE;
                const puedeEditar   = ["PENDIENTE", "CONFIRMADA"].includes(r.estado);
                const puedeCancelar = puedeEditar;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setDrawerReserva(r)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {r.clienteNombre} {r.clienteApellido}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.quintaColor }} />
                          <span className="text-xs text-gray-500">{r.quintaNombre}</span>
                        </div>
                      </div>
                      <span className={cn("shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", estadoCfg.cls)}>
                        {estadoCfg.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                      <span>{fmt(r.fechaInicio)} → {fmt(r.fechaFin)}</span>
                      <span className="font-medium text-gray-900">{formatUSD(r.montoTotal)}</span>
                      <span>{TIPO_LABELS[r.tipoAlquiler] ?? r.tipoAlquiler}</span>
                      <span className="text-gray-500">Seña: {r.sena != null ? formatUSD(r.sena) : "—"}</span>
                    </div>

                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
                      {puedeEditar && (
                        <Link
                          href={`/reservas/${r.id}/editar`}
                          className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Link>
                      )}
                      {r.estado === "PENDIENTE" && (
                        <button
                          onClick={() => setConfirmarModal({ id: r.id, nombre: `${r.clienteNombre} ${r.clienteApellido}` })}
                          className="min-h-[40px] rounded-lg px-3 text-xs font-medium text-green-700 hover:bg-green-50 transition"
                        >
                          Confirmar
                        </button>
                      )}
                      {puedeCancelar && (
                        <button
                          onClick={() => setCancelModal({ id: r.id, nombre: `${r.clienteNombre} ${r.clienteApellido}` })}
                          className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteModal({ id: r.id, nombre: `${r.clienteNombre} ${r.clienteApellido}` })}
                        className="flex min-h-[40px] items-center justify-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {drawerReserva && (
        <ReservaDrawer
          reserva={drawerReserva}
          onClose={() => setDrawerReserva(null)}
          onCancelar={(r) => setCancelModal(r)}
        />
      )}
      {cancelModal && (
        <CancelarModal
          reservaId={cancelModal.id}
          clienteNombre={cancelModal.nombre}
          onClose={() => setCancelModal(null)}
          onSuccess={() => setCancelModal(null)}
        />
      )}
      {confirmarModal && (
        <ConfirmarConMontoModal
          reservaId={confirmarModal.id}
          clienteNombre={confirmarModal.nombre}
          onClose={() => setConfirmarModal(null)}
          onSuccess={() => setConfirmarModal(null)}
          tipoCambio={tipoCambio}
        />
      )}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteModal(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Eliminar reserva</h3>
                <p className="text-xs text-gray-500 mt-0.5">{deleteModal.nombre}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              ¿Eliminar esta reserva permanentemente? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModal(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleEliminar(deleteModal.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
