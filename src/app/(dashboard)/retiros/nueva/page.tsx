import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { NuevoRetiroForm } from "@/components/retiros/NuevoRetiroForm";

export default async function NuevoRetiroPage() {
  const quintas = await prisma.quinta.findMany({
    where:   { activa: true },
    select:  { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="max-w-lg mx-auto pt-4 pb-10 space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Registrar Retiro</h1>
          <p className="text-sm text-gray-500">Registrá un retiro de efectivo de la caja</p>
        </div>
      </div>

      <NuevoRetiroForm quintas={quintas} />
    </div>
  );
}
