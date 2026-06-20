import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Search, UserPlus, Phone, Mail, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EliminarClienteModal } from "@/components/clientes/EliminarClienteModal";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function ClientesPage({ searchParams }: PageProps) {
  const { q = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page));
  const skip = (currentPage - 1) * PAGE_SIZE;

  const where = q.trim()
    ? {
        OR: [
          { nombre:   { contains: q, mode: "insensitive" as const } },
          { apellido: { contains: q, mode: "insensitive" as const } },
          { telefono: { contains: q } },
          { dni:      { contains: q } },
        ],
      }
    : undefined;

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { apellido: "asc" },
      select: {
        id:       true,
        nombre:   true,
        apellido: true,
        telefono: true,
        email:    true,
        dni:      true,
        _count:   { select: { reservas: true } },
        reservas: {
          orderBy: { fechaInicio: "desc" },
          take: 1,
          select: { fechaInicio: true, estado: true },
        },
      },
    }),
    prisma.cliente.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const estadoBadge: Record<string, string> = {
    PENDIENTE:  "bg-yellow-100 text-yellow-700",
    CONFIRMADA: "bg-green-100 text-green-700",
    CANCELADA:  "bg-red-100 text-red-700",
    COMPLETADA: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-5 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} en total</p>
        <Link
          href="/clientes/nuevo"
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, teléfono o DNI..."
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:ring-offset-0 transition"
        />
      </form>

      {clientes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-gray-400 text-sm">
          {q ? "No se encontraron clientes con esa búsqueda." : "Aún no hay clientes registrados."}
        </div>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────── */}
          <div className="hidden md:block rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Contacto</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Reservas</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Última reserva</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientes.map((c) => {
                    const ultima = c.reservas[0];
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {c.apellido}, {c.nombre}
                          </p>
                          {c.dni && <p className="text-xs text-gray-400">DNI {c.dni}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <Phone className="h-3 w-3 shrink-0" />
                              {c.telefono}
                            </span>
                            {c.email && (
                              <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[160px]">{c.email}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                            {c._count.reservas}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {ultima ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-600">
                                {new Date(ultima.fechaInicio).toLocaleDateString("es-AR")}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  estadoBadge[ultima.estado] ?? "bg-gray-100 text-gray-600",
                                )}
                              >
                                {ultima.estado.charAt(0) + ultima.estado.slice(1).toLowerCase()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <EliminarClienteModal
                              clienteId={c.id}
                              nombre={c.nombre}
                              apellido={c.apellido}
                              reservasCount={c._count.reservas}
                            />
                            <Link
                              href={`/clientes/${c.id}`}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                            >
                              Ver perfil
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ──────────────────────────────────── */}
          <div className="md:hidden w-full space-y-2">
            {clientes.map((c) => {
              const ultima = c.reservas[0];
              const fmtUltima = ultima
                ? new Date(ultima.fechaInicio).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                  })
                : null;
              return (
                <div
                  key={c.id}
                  className="w-full max-w-full rounded-xl border border-gray-100 bg-white p-3"
                >
                  {/* Línea 1: nombre + acciones */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="flex-1 min-w-0"
                    >
                      <p className="font-medium text-gray-900 truncate">
                        {c.nombre} {c.apellido}
                      </p>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/clientes/${c.id}`}
                        title="Ver perfil"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <EliminarClienteModal
                        clienteId={c.id}
                        nombre={c.nombre}
                        apellido={c.apellido}
                        reservasCount={c._count.reservas}
                      />
                    </div>
                  </div>

                  {/* Línea 2: teléfono */}
                  <Link href={`/clientes/${c.id}`} className="block mt-1">
                    <p className="text-sm text-gray-500 whitespace-nowrap">
                      {c.telefono}
                    </p>
                  </Link>

                  {/* Línea 3: reservas + última fecha */}
                  <Link href={`/clientes/${c.id}`} className="block mt-0.5">
                    <p className="text-xs text-gray-400">
                      {c._count.reservas} reserva{c._count.reservas !== 1 ? "s" : ""}
                      {fmtUltima ? ` · Última: ${fmtUltima}` : ""}
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`?q=${q}&page=${currentPage - 1}`}
                className="min-h-[44px] flex items-center rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition"
              >
                Anterior
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`?q=${q}&page=${currentPage + 1}`}
                className="min-h-[44px] flex items-center rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
