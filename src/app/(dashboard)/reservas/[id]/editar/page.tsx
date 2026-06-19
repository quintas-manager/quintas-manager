import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReservaForm } from "@/components/reservas/ReservaForm";
import { getTipoCambioBlueSell } from "@/lib/dolar";
import { toIsoDateUTC } from "@/lib/format";

export default async function EditarReservaPage({ params }: { params: { id: string } }) {
  const [reserva, quintas, clientes, tipoCambio] = await Promise.all([
    prisma.reserva.findUnique({
      where: { id: params.id },
      include: { quinta: true, cliente: true },
    }),
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

  if (!reserva) notFound();

  // If the quinta is inactive, add it so it still appears in the form
  const quintasConActual =
    quintas.some((q) => q.id === reserva.quintaId)
      ? quintas
      : [
          ...quintas,
          {
            id:               reserva.quinta.id,
            nombre:           reserva.quinta.nombre,
            colorHex:         reserva.quinta.colorHex,
            capacidadAdultos: reserva.quinta.capacidadAdultos,
            capacidadNinos:   reserva.quinta.capacidadNinos,
          },
        ];

  const defaultValues = {
    id:                 reserva.id,
    quintaId:           reserva.quintaId,
    clienteId:          reserva.clienteId,
    fechaInicio:        toIsoDateUTC(reserva.fechaInicio),
    fechaFin:           toIsoDateUTC(reserva.fechaFin),
    tipoAlquiler:       reserva.tipoAlquiler as never,
    estado:             reserva.estado as never,
    montoTotal:         Number(reserva.montoTotalUSD ?? reserva.montoTotal),
    montoTotalARS:      reserva.montoTotalARS     ? Number(reserva.montoTotalARS)     : undefined,
    tipoCambioReserva:  reserva.tipoCambioReserva ? Number(reserva.tipoCambioReserva) : undefined,
    monedaIngreso:      (reserva.monedaIngreso ?? "USD") as "USD" | "ARS",
    sena:               reserva.senaUSD ? Number(reserva.senaUSD) : (reserva.sena ? Number(reserva.sena) : null),
    senaARS:            reserva.senaARS      ? Number(reserva.senaARS)      : undefined,
    tipoCambioSena:     reserva.tipoCambioSena ? Number(reserva.tipoCambioSena) : undefined,
    motivoEvento:       reserva.motivoEvento ?? undefined,
    notas:              reserva.notas        ?? undefined,
    cantidadPersonas:   reserva.cantidadPersonas ?? undefined,
    tieneMascota:       reserva.tieneMascota,
    cargoMascotaARS:    reserva.cargoMascotaARS ? Number(reserva.cargoMascotaARS) : 20000,
    cargoMascotaPagado: reserva.cargoMascotaPagado,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/reservas/${reserva.id}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Editar reserva</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {reserva.cliente.nombre} {reserva.cliente.apellido} · {reserva.quinta.nombre}
          </p>
        </div>
      </div>

      <ReservaForm
        quintas={quintasConActual}
        clientes={clientes}
        defaultValues={defaultValues}
        mode="editar"
        tipoCambio={tipoCambio}
      />
    </div>
  );
}
