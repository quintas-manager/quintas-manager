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

  const mesNombre  = `${MESES[mes]} ${anio}`;
  const esCerrado  = !!data.cierre;

  const totalIngresos      = esCerrado ? data.cierre!.totalIngresos      : data.totalIngresos;
  const totalGastos        = esCerrado ? data.cierre!.totalGastos        : data.totalGastos;
  const resultado          = esCerrado ? data.cierre!.resultado          : data.resultado;
  const parteGraciela      = esCerrado ? data.cierre!.parteGraciela      : data.parteGraciela;
  const parteMatias        = esCerrado ? data.cierre!.parteMatias        : data.parteMatias;
  const reintegrosGraciela = esCerrado ? data.cierre!.reintegrosGraciela : data.totalReintegrosGraciela;
  const reintegrosMatias   = esCerrado ? data.cierre!.reintegrosMatias   : data.totalReintegrosMatias;
  const retirosGraciela    = esCerrado ? data.cierre!.retirosGraciela    : data.totalRetirosGraciela;
  const retirosMatias      = esCerrado ? data.cierre!.retirosMatias      : data.totalRetirosMatias;
  const retirosRocio       = esCerrado ? data.cierre!.retirosRocio       : data.totalRetirosRocio;
  const cobrarGraciela     = esCerrado ? data.cierre!.cobrarGraciela     : data.cobrarGraciela;
  const cobrarMatias       = esCerrado ? data.cierre!.cobrarMatias       : data.cobrarMatias;

  return (
    <MesDetalleClient
      quintaId={params.quintaId}
      mes={mes}
      anio={anio}
      mesNombre={mesNombre}
      esCerrado={esCerrado}
      data={data}
      categorias={categorias}
      totalIngresos={totalIngresos}
      totalGastos={totalGastos}
      resultado={resultado}
      parteGraciela={parteGraciela}
      parteMatias={parteMatias}
      reintegrosGraciela={reintegrosGraciela}
      reintegrosMatias={reintegrosMatias}
      retirosGraciela={retirosGraciela}
      retirosMatias={retirosMatias}
      retirosRocio={retirosRocio}
      cobrarGraciela={cobrarGraciela}
      cobrarMatias={cobrarMatias}
    />
  );
}
