import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EstadisticasClient } from "@/components/finanzas/EstadisticasClient";

export default async function EstadisticasPage({
  params,
}: {
  params: { quintaId: string };
}) {
  const quinta = await prisma.quinta.findUnique({
    where:  { id: params.quintaId },
    select: { id: true, nombre: true, colorHex: true },
  });
  if (!quinta) notFound();

  const [pagos, gastos, reservas] = await Promise.all([
    prisma.pago.findMany({
      where:  { reserva: { quintaId: params.quintaId } },
      select: { fecha: true, monto: true, montoUSD: true },
      orderBy: { fecha: "asc" },
    }),
    prisma.gasto.findMany({
      where:   { quintaId: params.quintaId },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { fecha: "asc" },
    }),
    prisma.reserva.findMany({
      where: {
        quintaId: params.quintaId,
        estado: { in: ["CONFIRMADA", "COMPLETADA"] },
      },
      select: {
        fechaInicio: true,
        fechaFin:    true,
        createdAt:   true,
        estado:      true,
      },
      orderBy: { fechaInicio: "asc" },
    }),
  ]);

  const pagosSer = pagos.map((p) => ({
    fecha:    p.fecha.toISOString(),
    montoUSD: Number(p.montoUSD ?? p.monto),
  }));

  const gastosSer = gastos.map((g) => ({
    fecha:          g.fecha.toISOString(),
    montoUSD:       Number(g.montoUSD ?? g.monto),
    categoriaId:    g.categoriaId,
    categoriaNombre: (g as typeof g & { categoria: { nombre: string } }).categoria.nombre,
  }));

  const reservasSer = reservas.map((r) => ({
    fechaInicio: r.fechaInicio.toISOString(),
    fechaFin:    r.fechaFin.toISOString(),
    createdAt:   r.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/finanzas/${params.quintaId}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
            style={{ backgroundColor: quinta.colorHex }}
          >
            {quinta.nombre.charAt(0)}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{quinta.nombre}</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        <Link
          href={`/finanzas/${params.quintaId}`}
          className="flex-1 rounded-lg py-2 text-center text-sm font-medium text-gray-500 hover:text-gray-700 transition"
        >
          Meses
        </Link>
        <Link
          href={`/finanzas/${params.quintaId}/estadisticas`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-center text-sm font-medium bg-white text-gray-900 shadow-sm transition"
        >
          <BarChart3 className="h-4 w-4" />
          Estadísticas
        </Link>
      </div>

      <EstadisticasClient
        quintaColor={quinta.colorHex}
        pagos={pagosSer}
        gastos={gastosSer}
        reservas={reservasSer}
      />
    </div>
  );
}
