"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { eliminarGasto } from "@/lib/actions/gastos";
import { GastoModal, type QuintaOpt, type CategoriaOpt } from "./GastoModal";
import { ReintegroModal } from "./ReintegroModal";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GastoRow {
  id:             string;
  fecha:          string;
  quintaId:       string;
  quintaNombre:   string;
  quintaColor:    string;
  categoriaNombre: string;
  descripcion:    string;
  monto:          number;
  pagadoPor:      string;
  reintegrado:    boolean;
  fechaReintegro: string | null;
  notas:          string | null;
  // For edit form
  categoriaId:    string;
}

export interface ReintegroPersona {
  pagador:  string;
  nombre:   string;
  total:    number;
  gastos: {
    id:          string;
    fecha:       string;
    quintaNombre: string;
    descripcion: string;
    monto:       number;
  }[];
}

export interface TotalQuinta {
  quintaId:    string;
  quintaNombre: string;
  quintaColor: string;
  total:       number;
}

interface Props {
  gastos:      GastoRow[];
  reintegros:  ReintegroPersona[];
  totales:     TotalQuinta[];
  totalGastos: number;
  totalPages:  number;
  quintas:     QuintaOpt[];
  categorias:  CategoriaOpt[];
  view:        "lista" | "reintegros";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGADOR_LABEL: Record<string, string> = {
  CAJA:     "Caja",
  GRACIELA: "Graciela",
  MATIAS:   "Matías",
  ROCIO:    "Rocío",
};

const PAGADOR_PERSONA_BADGE = "bg-blue-100 text-blue-700";
const PAGADOR_CAJA_BADGE    = "bg-gray-100 text-gray-600";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

// ── Filter helpers ────────────────────────────────────────────────────────────

function useFilters() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  const push = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) next.set(key, val);
      else next.delete(key);
    }
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  return {
    quintaId:    params.get("quintaId") ?? "",
    categoriaId: params.get("categoriaId") ?? "",
    pagador:     params.get("pagador") ?? "",
    desde:       params.get("desde") ?? "",
    hasta:       params.get("hasta") ?? "",
    reintegrado: params.get("reintegrado") ?? "",
    page:        Number(params.get("page") ?? "1"),
    push,
  };
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({
  quintas,
  categorias,
}: {
  quintas:    QuintaOpt[];
  categorias: CategoriaOpt[];
}) {
  const { quintaId, categoriaId, pagador, desde, hasta, reintegrado, push } = useFilters();

  const selectCls =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 transition";

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={quintaId}
        onChange={(e) => push({ quintaId: e.target.value || undefined })}
        className={selectCls}
      >
        <option value="">Todas las quintas</option>
        {quintas.map((q) => (
          <option key={q.id} value={q.id}>{q.nombre}</option>
        ))}
      </select>

      <select
        value={categoriaId}
        onChange={(e) => push({ categoriaId: e.target.value || undefined })}
        className={selectCls}
      >
        <option value="">Todas las categorías</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>

      <select
        value={pagador}
        onChange={(e) => push({ pagador: e.target.value || undefined })}
        className={selectCls}
      >
        <option value="">Todos los pagadores</option>
        {Object.entries(PAGADOR_LABEL).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>

      <select
        value={reintegrado}
        onChange={(e) => push({ reintegrado: e.target.value || undefined })}
        className={selectCls}
      >
        <option value="">Todos los estados</option>
        <option value="false">Pendientes</option>
        <option value="true">Reintegrados</option>
      </select>

      <input
        type="date"
        value={desde}
        onChange={(e) => push({ desde: e.target.value || undefined })}
        className={selectCls}
        title="Desde"
        placeholder="Desde"
      />
      <input
        type="date"
        value={hasta}
        onChange={(e) => push({ hasta: e.target.value || undefined })}
        className={selectCls}
        title="Hasta"
      />
    </div>
  );
}

// ── Lista de gastos ───────────────────────────────────────────────────────────

function ListaGastos({
  gastos,
  totales,
  totalGastos,
  totalPages,
  quintas,
  categorias,
}: Pick<Props, "gastos" | "totales" | "totalGastos" | "totalPages" | "quintas" | "categorias">) {
  const router          = useRouter();
  const { page, push }  = useFilters();

  const [showModal,     setShowModal]     = useState(false);
  const [editTarget,    setEditTarget]    = useState<GastoRow | null>(null);
  const [reintegroTarget, setReintegroTarget] = useState<GastoRow | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [, startTransition]               = useTransition();

  const handleDelete = (gasto: GastoRow) => {
    if (!confirm(`¿Eliminar el gasto "${gasto.descripcion}"?`)) return;
    setDeletingId(gasto.id);
    startTransition(async () => {
      const result = await eliminarGasto(gasto.id);
      setDeletingId(null);
      if (result.success) {
        toast.success("Gasto eliminado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {gastos.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            No hay gastos con los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Quinta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Pagó</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Reintegro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gastos.map((g) => {
                  const esPersona = g.pagadoPor !== "CAJA";
                  return (
                    <tr key={g.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {fmtDate(g.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: g.quintaColor }}
                          />
                          <span className="text-gray-700 whitespace-nowrap">{g.quintaNombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {g.categoriaNombre}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate text-gray-900">{g.descripcion}</p>
                        {g.notas && (
                          <p className="truncate text-xs text-gray-400">{g.notas}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {fmtMoney(g.monto)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            esPersona ? PAGADOR_PERSONA_BADGE : PAGADOR_CAJA_BADGE,
                          )}
                        >
                          {PAGADOR_LABEL[g.pagadoPor] ?? g.pagadoPor}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {g.pagadoPor === "CAJA" ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : g.reintegrado ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              {g.fechaReintegro ? fmtDate(g.fechaReintegro) : "Sí"}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReintegroTarget(g)}
                            className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 transition"
                          >
                            <Clock className="h-3 w-3" />
                            Pendiente
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditTarget(g); setShowModal(true); }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(g)}
                            disabled={deletingId === g.id}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 transition disabled:opacity-50"
                          >
                            {deletingId === g.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totales pie */}
        {totales.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Total período
              </span>
              {totales.map((t) => (
                <div key={t.quintaId} className="flex items-center gap-1.5 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: t.quintaColor }}
                  />
                  <span className="text-gray-600">{t.quintaNombre}:</span>
                  <span className="font-semibold text-gray-900">{fmtMoney(t.total)}</span>
                </div>
              ))}
              <div className="ml-auto text-sm font-bold text-gray-900">
                {fmtMoney(totalGastos)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => push({ page: String(page - 1) })}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-40 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => push({ page: String(page + 1) })}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-40 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <GastoModal
          quintas={quintas}
          categorias={categorias}
          gasto={editTarget ?? undefined}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}

      {reintegroTarget && (
        <ReintegroModal
          mode="single"
          gastoId={reintegroTarget.id}
          descripcion={reintegroTarget.descripcion}
          monto={reintegroTarget.monto}
          pagadoPor={reintegroTarget.pagadoPor}
          onClose={() => setReintegroTarget(null)}
        />
      )}
    </>
  );
}

// ── Panel de reintegros ───────────────────────────────────────────────────────

function ReintegrosPanel({ reintegros }: { reintegros: ReintegroPersona[] }) {
  const [batchTarget, setBatchTarget] = useState<ReintegroPersona | null>(null);
  const [singleTarget, setSingleTarget] = useState<{
    id: string; descripcion: string; monto: number; pagadoPor: string;
  } | null>(null);

  if (reintegros.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">No hay reintegros pendientes</p>
        <p className="text-xs text-gray-400 mt-1">Todos los gastos están al día.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {reintegros.map((p) => (
          <div key={p.pagador} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* Header persona */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {p.gastos.length} gasto{p.gastos.length !== 1 ? "s" : ""} pendiente
                    {p.gastos.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-gray-900">{fmtMoney(p.total)}</p>
                <button
                  onClick={() => setBatchTarget(p)}
                  className="flex items-center gap-1.5 rounded-xl bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Reintegrar todos
                </button>
              </div>
            </div>

            {/* Detalle */}
            <div className="divide-y divide-gray-50">
              {p.gastos.map((g) => (
                <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{g.descripcion}</p>
                    <p className="text-xs text-gray-400">
                      {fmtDate(g.fecha)} · {g.quintaNombre}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900 shrink-0">
                    {fmtMoney(g.monto)}
                  </span>
                  <button
                    onClick={() =>
                      setSingleTarget({ id: g.id, descripcion: g.descripcion, monto: g.monto, pagadoPor: p.pagador })
                    }
                    className="shrink-0 rounded-lg border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition"
                  >
                    Marcar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {batchTarget && (
        <ReintegroModal
          mode="batch"
          pagador={batchTarget.pagador}
          total={batchTarget.total}
          cantidad={batchTarget.gastos.length}
          onClose={() => setBatchTarget(null)}
        />
      )}

      {singleTarget && (
        <ReintegroModal
          mode="single"
          gastoId={singleTarget.id}
          descripcion={singleTarget.descripcion}
          monto={singleTarget.monto}
          pagadoPor={singleTarget.pagadoPor}
          onClose={() => setSingleTarget(null)}
        />
      )}
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GastosClient({
  gastos,
  reintegros,
  totales,
  totalGastos,
  totalPages,
  quintas,
  categorias,
  view,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const setView = (v: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", v);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View tabs */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setView("lista")}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition",
              view === "lista"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            Lista de gastos
          </button>
          <button
            onClick={() => setView("reintegros")}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition",
              view === "reintegros"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            Reintegros pendientes
            {reintegros.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {reintegros.reduce((s, p) => s + p.gastos.length, 0)}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition"
        >
          <Plus className="h-4 w-4" />
          Registrar gasto
        </button>
      </div>

      {/* Filters — only on lista view */}
      {view === "lista" && (
        <FilterBar quintas={quintas} categorias={categorias} />
      )}

      {/* Content */}
      {view === "lista" ? (
        <ListaGastos
          gastos={gastos}
          totales={totales}
          totalGastos={totalGastos}
          totalPages={totalPages}
          quintas={quintas}
          categorias={categorias}
        />
      ) : (
        <ReintegrosPanel reintegros={reintegros} />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <GastoModal
          quintas={quintas}
          categorias={categorias}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
