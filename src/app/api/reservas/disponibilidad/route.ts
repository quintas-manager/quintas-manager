import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const quintaId   = searchParams.get("quintaId");
  const desde      = searchParams.get("desde");
  const hasta      = searchParams.get("hasta");
  const excludeId  = searchParams.get("excludeId");

  if (!quintaId || !desde || !hasta) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
  }

  const conflicto = await prisma.reserva.findFirst({
    where: {
      quintaId,
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      fechaInicio: { lte: new Date(hasta) },
      fechaFin:    { gte: new Date(desde) },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      cliente: { select: { nombre: true, apellido: true } },
    },
  });

  if (!conflicto) {
    return NextResponse.json({ disponible: true });
  }

  return NextResponse.json({
    disponible: false,
    conflicto: {
      clienteNombre:  `${conflicto.cliente.nombre} ${conflicto.cliente.apellido}`,
      fechaInicio:    conflicto.fechaInicio.toISOString(),
      fechaFin:       conflicto.fechaFin.toISOString(),
      estado:         conflicto.estado,
    },
  });
}
