import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const quintaId    = searchParams.get("quintaId");
  const fechaInicio = searchParams.get("fechaInicio");

  if (!quintaId || !fechaInicio) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
  }

  const fecha = new Date(fechaInicio);

  // Find the active temporada for that quinta on that date
  const temporada = await prisma.temporada.findFirst({
    where: {
      fechaInicio: { lte: fecha },
      fechaFin:    { gte: fecha },
      quintas: { some: { quintaId } },
    },
    include: {
      precios: {
        where: { quintaId },
        select: { tipoAlquiler: true, precio: true },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });

  if (!temporada) {
    return NextResponse.json({ temporada: null });
  }

  const precios: Record<string, number> = {};
  for (const p of temporada.precios) {
    precios[p.tipoAlquiler] = Number(p.precio);
  }

  return NextResponse.json({
    temporada: {
      id:     temporada.id,
      nombre: temporada.nombre,
      tipo:   temporada.tipo,
      precios,
    },
  });
}
