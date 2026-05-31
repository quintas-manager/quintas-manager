import { prisma } from "@/lib/prisma";
import { GastosClient, type GastoRow, type ReintegroPersona, type TotalQuinta } from "@/components/gastos/GastosClient";
import type { QuintaOpt, CategoriaOpt } from "@/components/gastos/GastoModal";
import { GastoPagador } from "@prisma/client";
import { format } from "date-fns";

interface PageProps {
  searchParams: Promise<{
    view?:        string;
    quintaId?:    string;
    categoriaId?: string;
    pagador?:     string;
    desde?:       string;
    hasta?:       string;
    reintegrado?: string;
    page?:        string;
  }>;
}

const PAGE_SIZE   = 25;
const PERSONAS    = ["GRACIELA", "MATIAS", "ROCIO"] as const;
const NOMBRE_MAP: Record<string, string> = { GRACIELA: "Graciela", MATIAS: "Matías", ROCIO: "Rocío" };

export default async function GastosPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const view        = sp.view === "reintegros" ? "reintegros" : "lista";
  const page        = Math.max(1, parseInt(sp.page ?? "1"));
  const skip        = (page - 1) * PAGE_SIZE;

  // Build where clause for filtered list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (sp.quintaId)    where.quintaId    = sp.quintaId;
  if (sp.categoriaId) where.categoriaId = sp.categoriaId;
  if (sp.pagador && Object.values(GastoPagador).includes(sp.pagador as GastoPagador)) {
    where.pagadoPor = sp.pagador as GastoPagador;
  }
  if (sp.reintegrado === "true")  where.reintegrado = true;
  if (sp.reintegrado === "false") where.reintegrado = false;
  if (sp.desde || sp.hasta) {
    where.fecha = {
      ...(sp.desde ? { gte: new Date(sp.desde) } : {}),
      ...(sp.hasta ? { lte: new Date(sp.hasta + "T23:59:59") } : {}),
    };
  }

  const [quintas, categorias, gastosList, gastosCount, reintegrosPendientes] =
    await Promise.all([
      prisma.quinta.findMany({
        where: { activa: true },
        select: { id: true, nombre: true, colorHex: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.categoriaGasto.findMany({
        where: { activa: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.gasto.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { fecha: "desc" },
        include: {
          quinta:    { select: { nombre: true, colorHex: true } },
          categoria: { select: { nombre: true } },
        },
      }),
      prisma.gasto.count({ where }),

      // All pending reintegros (personas only), not paginated
      prisma.gasto.findMany({
        where: {
          reintegrado: false,
          pagadoPor:   { in: [...PERSONAS] },
        },
        orderBy: { fecha: "asc" },
        include: {
          quinta: { select: { nombre: true } },
        },
      }),
    ]);

  // ── Serialize ──────────────────────────────────────────────────────────────

  const quintasOpt: QuintaOpt[] = quintas.map((q) => ({
    id: q.id, nombre: q.nombre, colorHex: q.colorHex,
  }));

  const categoriasOpt: CategoriaOpt[] = categorias.map((c) => ({
    id: c.id, nombre: c.nombre,
  }));

  const gastosRows: GastoRow[] = gastosList.map((g) => ({
    id:              g.id,
    fecha:           format(g.fecha, "yyyy-MM-dd"),
    quintaId:        g.quintaId,
    quintaNombre:    g.quinta.nombre,
    quintaColor:     g.quinta.colorHex,
    categoriaId:     g.categoriaId,
    categoriaNombre: g.categoria.nombre,
    descripcion:     g.descripcion,
    monto:           Number(g.monto),
    pagadoPor:       g.pagadoPor,
    reintegrado:     g.reintegrado,
    fechaReintegro:  g.fechaReintegro ? format(g.fechaReintegro, "yyyy-MM-dd") : null,
    notas:           g.notas,
  }));

  // Totals per quinta for filtered period
  const totalesMap = new Map<string, { nombre: string; color: string; total: number }>();
  for (const g of gastosList) {
    const key = g.quintaId;
    if (!totalesMap.has(key)) {
      totalesMap.set(key, { nombre: g.quinta.nombre, color: g.quinta.colorHex, total: 0 });
    }
    totalesMap.get(key)!.total += Number(g.monto);
  }
  const totales: TotalQuinta[] = Array.from(totalesMap.entries()).map(([id, v]) => ({
    quintaId: id, quintaNombre: v.nombre, quintaColor: v.color, total: v.total,
  }));
  const totalGastos = totales.reduce((s, t) => s + t.total, 0);

  // Reintegros pendientes grouped by person
  const reintegrosMap = new Map<string, ReintegroPersona>();
  for (const pag of PERSONAS) {
    reintegrosMap.set(pag, { pagador: pag, nombre: NOMBRE_MAP[pag], total: 0, gastos: [] });
  }
  for (const g of reintegrosPendientes) {
    const entry = reintegrosMap.get(g.pagadoPor);
    if (!entry) continue;
    entry.total += Number(g.monto);
    entry.gastos.push({
      id:           g.id,
      fecha:        format(g.fecha, "yyyy-MM-dd"),
      quintaNombre: (g as typeof g & { quinta: { nombre: string } }).quinta.nombre,
      descripcion:  g.descripcion,
      monto:        Number(g.monto),
    });
  }
  const reintegros: ReintegroPersona[] = Array.from(reintegrosMap.values()).filter(
    (p) => p.gastos.length > 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gastos</h1>
        <p className="text-sm text-gray-500">
          Registro de gastos operativos y reintegros pendientes.
        </p>
      </div>

      <GastosClient
        gastos={gastosRows}
        reintegros={reintegros}
        totales={totales}
        totalGastos={totalGastos}
        totalPages={Math.ceil(gastosCount / PAGE_SIZE)}
        quintas={quintasOpt}
        categorias={categoriasOpt}
        view={view}
      />
    </div>
  );
}
