import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getConfiguracion } from "@/lib/actions/limpieza";
import { NuevoCronogramaForm } from "@/components/limpieza/NuevoCronogramaForm";

export default async function NuevoCronogramaPage() {
  const [lugares, numeroSilvana] = await Promise.all([
    prisma.lugarLimpieza.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true },
    }),
    getConfiguracion("whatsapp_silvana"),
  ]);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/limpieza"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Nuevo cronograma</h2>
          <p className="text-sm text-gray-500">Asigná los lugares para cada día de la semana</p>
        </div>
      </div>

      <NuevoCronogramaForm lugares={lugares} numeroSilvana={numeroSilvana} />
    </div>
  );
}
