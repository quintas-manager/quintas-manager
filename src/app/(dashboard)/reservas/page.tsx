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

  const where = {
    ...(searchParams.quinta ? { quintaId: searchParams.quinta } : {}),
    ...(searchParams.estado ? { estado: searchParams.estado as never } : {}),
    ...(searchParams.desde || searchParams.hasta
      ? {
          fechaInicio: {
            ...(searchParams.desde ? { gte: new Date(searchParams.desde) } : {}),
            ...(searchParams.hasta ? { lte: new Date(searchParams.hasta) } : {}),
          },
        }
      : {}),
  };

  const [rawReservas, total, quintas] = await Promise.all([
    prisma.reserva.findMany({
      where,
      include: {
        quinta:  { select: { nombre: true, colorHex: true } },
        cliente: { select: { nombre: true, apellido: true, telefono: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.reserva.count({ where }),
    prisma.quinta.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

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
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reservas</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} en total</p>
        </div>
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
