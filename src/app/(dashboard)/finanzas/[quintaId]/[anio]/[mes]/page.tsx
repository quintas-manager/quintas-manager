import { notFound } from "next/navigation";
import { calcularMes } from "@/lib/actions/finanzas";
import { MesDetalleClient } from "@/components/finanzas/MesDetalleClient";
import { prisma } from "@/lib/prisma";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function MesDetallePage({
  params,
}: {
  params: { quintaId: string; anio: string; mes: string };
}) {
  const mes  = parseInt(params.mes);
  const anio = parseInt(params.anio);

  if (isNaN(mes) || isNaN(anio) || mes < 1 || mes > 12) notFound();

  const [data, categorias] = await Promise.all([
    calcularMes(params.quintaId, mes, anio).catch(() => null),
    prisma.categoriaGasto.findMany({
      where:   { activa: true },
      select:  { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  if (!data) notFound();

  const mesNombre = `${MESES[mes]} ${anio}`;

  return (
    <MesDetalleClient
      quintaId={params.quintaId}
      mes={mes}
      anio={anio}
      mesNombre={mesNombre}
      data={data}
      categorias={categorias}
    />
  );
}
