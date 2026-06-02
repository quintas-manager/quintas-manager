"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Pencil, XCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CancelarModal } from "./CancelarModal";
import { ConfirmarConMontoModal } from "./ConfirmarConMontoModal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReservaRow {
  id: string;
  clienteNombre: string;
  clienteApellido: string;
  quintaNombre: string;
  quintaColor: string;
  fechaInicio: string;
  fechaFin: string;
  tipoAlquiler: string;
  montoTotal: number;
  sena: number | null;
  estado: string;
}

interface QuintaFilter {
  id: string;
  nombre: string;
}

interface Props {
  reservas: ReservaRow[];
  quintas: QuintaFilter[];
  total: number;
  page: number;
  pageSize: number;
  defaultFiltros: {
    quinta?: string;
    estado?: string;
    desde?: string;
    hasta?: string;
  };
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

const fmt = (iso: string) => format(parseISO(iso), "d/MM/yy", { locale: es });

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);

// ── Component ─────────────────────────────────────────────────────────────────

export function ReservasTable({
  reservas, quintas, total, page, pageSize, defaultFiltros,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [quinta,  setQuinta]  = useState(defaultFiltros.quinta  ?? "");
  const [estado,  setEstado]  = useState(defaultFiltros.estado  ?? "");
  const [desde,   setDesde]   = useState(defaultFiltros.desde   ?? "");
  const [hasta,   setHasta]   = useState(defaultFiltros.hasta   ?? "");

  const [cancelModal,   setCancelModal]   = useState<{ id: string; nombre: string } | null>(null);
  const [confirmarModal, setConfirmarModal] = useState<{ id: string; nombre: string } | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const pushParams = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v) params.set(k, v); else params.delete(k);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const applyFiltros = () => {
    pushParams({ quinta, estado, desde, hasta });
  };

  const clearFiltros = () => {
    setQuinta(""); setEstado(""); setDesde(""); setHasta("");
    router.push(pathname);
  };

  const selectCls =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-0";

  return (
    <div className="space-y-4">
      {/* ── Filtros ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-600">Quinta</label>
            <select value={quinta} onChange={(e) => setQuinta(e.target.value)} className={selectCls}>
              <option value="">Todas</option>
              {quintas.map((q) => <option key={q.id} value={q.id}>{q.nombre}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-600">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="COMPLETADA">Completada</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Desde</label>
            <input
              type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className={selectCls}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Hasta</label>
            <input
              type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className={selectCls}
            />
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={clearFiltros}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition"
            >
              Limpiar
            </button>
            <button
              onClick={applyFiltros}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition"
            >
              <Search className="h-3.5 w-3.5" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {reservas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No se encontraron reservas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {reservas.map((r) => {
                  const estado = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.PENDIENTE;
                  const puedeEditar  = ["PENDIENTE", "CONFIRMADA"].includes(r.estado);
                  const puedeCancelar = puedeEditar;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.clienteNombre} {r.clienteApellido}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.quintaColor }}
                          />
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
                        {formatMonto(r.montoTotal)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {r.sena != null ? formatMonto(r.sena) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          estado.cls,
                          r.estado === "PENDIENTE" && "font-semibold ring-2"
                        )}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/reservas/${r.id}`}
                            title="Ver"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {puedeEditar && (
                            <Link
                              href={`/reservas/${r.id}/editar`}
                              title="Editar"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                          {r.estado === "PENDIENTE" && (
                            <button
                              title="Confirmar"
                              onClick={() =>
                                setConfirmarModal({
                                  id: r.id,
                                  nombre: `${r.clienteNombre} ${r.clienteApellido}`,
                                })
                              }
                              className="rounded-lg px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition"
                            >
                              Confirmar
                            </button>
                          )}
                          {puedeCancelar && (
                            <button
                              title="Cancelar"
                              onClick={() =>
                                setCancelModal({
                                  id: r.id,
                                  nombre: `${r.clienteNombre} ${r.clienteApellido}`,
                                })
                              }
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              {total} resultado{total !== 1 ? "s" : ""} · página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => pushParams({ page: String(page - 1) })}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => pushParams({ page: String(page + 1) })}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
        />
      )}
    </div>
  );
}
