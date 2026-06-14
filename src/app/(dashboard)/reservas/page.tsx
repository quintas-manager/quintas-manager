import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReservasTable } from "@/components/reservas/ReservasTable";

const PAGE_SIZE = 20;

interface SearchParams {
  quinta?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
  page?: string;
}

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const ACTIVE_STATES = ["CONFIRMADA", "PENDIENTE"];
  const CLOSED_STATES = ["CANCELADA",  "COMPLETADA"];

  const baseWhere = {
    ...(searchParams.quinta ? { quintaId: searchParams.quinta } : {}),
    ...(searchParams.desde || searchParams.hasta
      ? {
          fechaInicio: {
            ...(searchParams.desde ? { gte: new Date(searchParams.desde) } : {}),
            ...(searchParams.hasta ? { lte: new Date(searchParams.hasta) } : {}),
          },
        }
      : {}),
  };

  const where = {
    ...baseWhere,
    ...(searchParams.estado ? { estado: searchParams.estado as never } : {}),
  };

  const activeStates = searchParams.estado
    ? ACTIVE_STATES.filter((s) => s === searchParams.estado)
    : ACTIVE_STATES;
  const closedStates = searchParams.estado
    ? CLOSED_STATES.filter((s) => s === searchParams.estado)
    : CLOSED_STATES;

  const include = {
    quinta:  { select: { nombre: true, colorHex: true } },
    cliente: { select: { nombre: true, apellido: true, telefono: true } },
  } as const;

  const [activeReservas, closedReservas, total, quintas] = await Promise.all([
    activeStates.length > 0
      ? prisma.reserva.findMany({ where: { ...baseWhere, estado: { in: activeStates as never[] } }, include, orderBy: { fechaInicio: "asc"  } })
      : Promise.resolve([]),
    closedStates.length > 0
      ? prisma.reserva.findMany({ where: { ...baseWhere, estado: { in: closedStates as never[] } }, include, orderBy: { fechaInicio: "desc" } })
      : Promise.resolve([]),
    prisma.reserva.count({ where }),
    prisma.quinta.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const rawReservas = [...activeReservas, ...closedReservas].slice(skip, skip + PAGE_SIZE);

  const reservas = rawReservas.map((r) => ({
    id:               r.id,
    clienteId:        r.clienteId,
    clienteNombre:    r.cliente.nombre,
    clienteApellido:  r.cliente.apellido,
    clienteTelefono:  r.cliente.telefono,
    quintaNombre:     r.quinta.nombre,
    quintaColor:      r.quinta.colorHex,
    fechaInicio:      r.fechaInicio.toISOString(),
    fechaFin:         r.fechaFin.toISOString(),
    tipoAlquiler:     r.tipoAlquiler,
    montoTotal:       Number(r.montoTotal),
    sena:             r.sena ? Number(r.sena) : null,
    estado:           r.estado,
    notas:            r.notas ?? null,
    motivoEvento:     r.motivoEvento ?? null,
    cantidadPersonas: r.cantidadPersonas ?? null,
    tieneMascota:     r.tieneMascota,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} en total</p>
        <Link
          href="/reservas/nueva"
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva reserva
        </Link>
      </div>

      <ReservasTable
        reservas={reservas}
        quintas={quintas}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        defaultFiltros={{
          quinta: searchParams.quinta,
          estado: searchParams.estado,
          desde:  searchParams.desde,
          hasta:  searchParams.hasta,
        }}
      />
    </div>
  );
}
