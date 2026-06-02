import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReservaEvento } from "@/types/calendario";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const desde     = searchParams.get("desde");
  const hasta     = searchParams.get("hasta");
  const quintaId  = searchParams.get("quintaId");
  const excludeId = searchParams.get("excludeId");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Parámetros requeridos: desde, hasta" }, { status: 400 });
  }

  const reservas = await prisma.reserva.findMany({
    where: {
      estado: { in: ["CONFIRMADA", "PENDIENTE"] },
      fechaInicio: { lte: new Date(hasta) },
      fechaFin: { gte: new Date(desde) },
      ...(quintaId  ? { quintaId }              : {}),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      quinta: { select: { id: true, nombre: true, colorHex: true } },
      cliente: { select: { nombre: true, apellido: true } },
    },
    orderBy: { fechaInicio: "asc" },
  });

  const result: ReservaEvento[] = reservas.map((r) => ({
    id: r.id,
    clienteNombre: r.cliente.nombre,
    clienteApellido: r.cliente.apellido,
    quintaId: r.quintaId,
    quintaNombre: r.quinta.nombre,
    quintaColor: r.quinta.colorHex,
    fechaInicio: r.fechaInicio.toISOString(),
    fechaFin: r.fechaFin.toISOString(),
    tipoAlquiler: r.tipoAlquiler,
    estado: r.estado,
    montoTotal: Number(r.montoTotal),
    sena: r.sena ? Number(r.sena) : null,
    notas: r.notas,
    motivoEvento: r.motivoEvento,
    cantidadPersonas: r.cantidadPersonas,
    tieneMascota: r.tieneMascota,
  }));

  return NextResponse.json(result);
}
