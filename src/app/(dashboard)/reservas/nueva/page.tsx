import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReservaForm } from "@/components/reservas/ReservaForm";
import { getTipoCambioBlueSell } from "@/lib/dolar";

interface SearchParams { fecha?: string; quintaId?: string }

export default async function NuevaReservaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [quintas, clientes, tipoCambio] = await Promise.all([
    prisma.quinta.findMany({
      where: { activa: true },
      select: {
        id: true, nombre: true, colorHex: true,
        capacidadAdultos: true, capacidadNinos: true,
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.cliente.findMany({
      select: { id: true, nombre: true, apellido: true, telefono: true, dni: true },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      take: 200,
    }),
    getTipoCambioBlueSell(),
  ]);

  const defaultValues = {
    ...(searchParams.quintaId ? { quintaId: searchParams.quintaId } : {}),
    ...(searchParams.fecha    ? { fechaInicio: searchParams.fecha } : {}),
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/reservas"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Nueva Reserva</h2>
          <p className="text-sm text-gray-500">Se creará directamente como confirmada</p>
        </div>
      </div>

      <ReservaForm
        quintas={quintas}
        clientes={clientes}
        defaultValues={defaultValues}
        mode="crear"
        forceEstado="CONFIRMADA"
        tipoCambio={tipoCambio}
      />
    </div>
  );
}
