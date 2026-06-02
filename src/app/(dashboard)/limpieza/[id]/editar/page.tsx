import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getConfiguracion } from "@/lib/actions/limpieza";
import { NuevoCronogramaForm } from "@/components/limpieza/NuevoCronogramaForm";
import { format } from "date-fns";

export default async function EditarCronogramaPage({
  params,
}: {
  params: { id: string };
}) {
  const [cronograma, lugares, numeroSilvana] = await Promise.all([
    prisma.cronogramaLimpieza.findUnique({
      where: { id: params.id },
      include: {
        dias: { orderBy: { diaSemana: "asc" } },
      },
    }),
    prisma.lugarLimpieza.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true },
    }),
    getConfiguracion("whatsapp_silvana"),
  ]);

  if (!cronograma) notFound();

  const defaultFecha = format(cronograma.semanaInicio, "yyyy-MM-dd");
  const defaultDias = cronograma.dias.map((d) => ({
    lugarPrincipalId:  d.lugarPrincipalId,
    lugarSecundarioId: d.lugarSecundarioId ?? "",
  }));

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/limpieza/${params.id}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Editar cronograma</h2>
          <p className="text-sm text-gray-500">Modificá la asignación de la semana</p>
        </div>
      </div>

      <NuevoCronogramaForm
        lugares={lugares}
        numeroSilvana={numeroSilvana}
        cronogramaId={params.id}
        defaultFecha={defaultFecha}
        defaultDias={defaultDias}
      />
    </div>
  );
}
