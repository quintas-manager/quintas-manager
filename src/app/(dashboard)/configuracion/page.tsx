import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { QuintasSection, type QuintaRow } from "@/components/configuracion/QuintasSection";
import { TemporadasSection, type TemporadaRow, type QuintaBasic } from "@/components/configuracion/TemporadasSection";
import { PreciosGrid, type PrecioGridData } from "@/components/configuracion/PreciosGrid";
import { UsuariosSection, type UsuarioRow } from "@/components/configuracion/UsuariosSection";
import { format } from "date-fns";

type Tab = "quintas" | "temporadas" | "precios" | "usuarios";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "quintas",    label: "Quintas" },
  { id: "temporadas", label: "Temporadas" },
  { id: "precios",    label: "Precios" },
  { id: "usuarios",   label: "Usuarios" },
];

export default async function ConfiguracionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const { tab: rawTab = "quintas" } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "quintas";

  // Load all data in parallel — dataset is small
  const [quintas, temporadas, precios, usuarios] = await Promise.all([
    prisma.quinta.findMany({ orderBy: { nombre: "asc" } }),
    prisma.temporada.findMany({
      include: { quintas: { select: { quintaId: true } } },
      orderBy: { fechaInicio: "asc" },
    }),
    prisma.precioTemporada.findMany(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Serialize for client components ─────────────────────────────────────────

  const quintasRows: QuintaRow[] = quintas.map((q) => ({
    id:               q.id,
    nombre:           q.nombre,
    descripcion:      q.descripcion,
    capacidadAdultos: q.capacidadAdultos,
    capacidadNinos:   q.capacidadNinos,
    colorHex:         q.colorHex,
    activa:           q.activa,
  }));

  const quintasBasic: QuintaBasic[] = quintas.map((q) => ({ id: q.id, nombre: q.nombre }));

  const temporadasRows: TemporadaRow[] = temporadas.map((t) => ({
    id:          t.id,
    nombre:      t.nombre,
    tipo:        t.tipo as "ALTA" | "BAJA",
    fechaInicio: format(t.fechaInicio, "yyyy-MM-dd"),
    fechaFin:    format(t.fechaFin,    "yyyy-MM-dd"),
    quintaIds:   t.quintas.map((tq) => tq.quintaId),
  }));

  const TIPOS = ["DIA", "FIN_DE_SEMANA", "SEMANA", "QUINCENA", "MES"] as const;

  const preciosGrid: PrecioGridData[] = quintas.map((q) => ({
    quintaId:     q.id,
    quintaNombre: q.nombre,
    temporadas: temporadas
      .filter((t) => t.quintas.some((tq) => tq.quintaId === q.id))
      .map((t) => ({
        id:      t.id,
        nombre:  t.nombre,
        tipo:    t.tipo as "ALTA" | "BAJA",
        precios: Object.fromEntries(
          TIPOS.map((tipo) => [
            tipo,
            Number(
              precios.find(
                (p) => p.quintaId === q.id && p.temporadaId === t.id && p.tipoAlquiler === tipo,
              )?.precio ?? 0,
            ),
          ]),
        ),
      })),
  }));

  const usuariosRows: UsuarioRow[] = usuarios.map((u) => ({
    id:        u.id,
    name:      u.name,
    email:     u.email,
    role:      u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">Solo visible para administradores.</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/configuracion?tab=${t.id}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition",
              tab === t.id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "quintas"    && <QuintasSection    quintas={quintasRows} />}
      {tab === "temporadas" && (
        <TemporadasSection temporadas={temporadasRows} quintas={quintasBasic} />
      )}
      {tab === "precios"    && <PreciosGrid quintas={preciosGrid} />}
      {tab === "usuarios"   && <UsuariosSection usuarios={usuariosRows} />}
    </div>
  );
}
