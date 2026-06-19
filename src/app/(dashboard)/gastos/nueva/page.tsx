import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NuevoGastoForm } from "@/components/gastos/NuevoGastoForm";
import { getTipoCambioBlueSell } from "@/lib/dolar";

export default async function NuevoGastoPage() {
  const [quintas, categorias, tipoCambio] = await Promise.all([
    prisma.quinta.findMany({
      where:   { activa: true },
      select:  { id: true, nombre: true, colorHex: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.categoriaGasto.findMany({
      where:   { activa: true },
      select:  { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    getTipoCambioBlueSell(),
  ]);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/finanzas"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Registrar gasto</h1>
          <p className="text-sm text-gray-500 mt-0.5">Nuevo gasto operativo</p>
        </div>
      </div>

      <NuevoGastoForm quintas={quintas} categorias={categorias} tipoCambio={tipoCambio} />
    </div>
  );
}
