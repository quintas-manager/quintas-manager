import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfiguracion } from "@/lib/actions/limpieza";
import { LimpiezaListClient } from "@/components/limpieza/LimpiezaListClient";
import { Plus } from "lucide-react";

export default async function LimpiezaPage() {
  const [cronogramas, numeroSilvana] = await Promise.all([
    prisma.cronogramaLimpieza.findMany({
      orderBy: { semanaInicio: "desc" },
      include: { creadoPor: { select: { name: true } } },
    }),
    getConfiguracion("whatsapp_silvana"),
  ]);

  const rows = cronogramas.map((c) => ({
    id:           c.id,
    semanaInicio: c.semanaInicio.toISOString(),
    creadoPor:    c.creadoPor.name,
    enviado:      c.enviado,
    fechaEnvio:   c.fechaEnvio?.toISOString() ?? null,
    createdAt:    c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Limpieza</h2>
          <p className="text-sm text-gray-500 mt-0.5">Cronogramas semanales para Silvana</p>
        </div>
        <Link
          href="/limpieza/nueva"
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo cronograma
        </Link>
      </div>

      <LimpiezaListClient cronogramas={rows} numeroSilvana={numeroSilvana} />
    </div>
  );
}
