import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";

  const clientes = await prisma.cliente.findMany({
    where: q
      ? {
          OR: [
            { nombre:   { contains: q, mode: "insensitive" } },
            { apellido: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q } },
            { dni:      { contains: q } },
          ],
        }
      : undefined,
    select: { id: true, nombre: true, apellido: true, telefono: true, dni: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    take: 100,
  });

  return NextResponse.json(clientes);
}
