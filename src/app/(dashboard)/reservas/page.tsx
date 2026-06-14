import { prisma } from "@/lib/prisma";
import { ReservasTable } from "@/components/reservas/ReservasTable";

export default async function ReservasPage() {
  const rawReservas = await prisma.reserva.findMany({
    include: {
      quinta:  { select: { nombre: true, colorHex: true } },
      cliente: { select: { nombre: true, apellido: true, telefono: true } },
    },
    orderBy: { fechaInicio: "asc" },
  });

  const reservas = rawReservas.map((r) => ({
    id:               r.id,
    clienteId:        r.clienteId,
    clienteNombre:    r.cliente.nombre,
    clienteApellido:  r.cliente.apellido,
    clienteTelefono:  r.cliente.telefono,
    quintaNombre:     r.quinta.nombre,
    quintaColor:      r.quinta.colorHex,
    fechaInicio:      r.fechaInicio.toISOString(),
    fechaFin:         r.fechaFin.toISOString(),
    tipoAlquiler:     r.tipoAlquiler,
    montoTotal:       Number(r.montoTotal),
    sena:             r.sena ? Number(r.sena) : null,
    estado:           r.estado,
    notas:            r.notas ?? null,
    motivoEvento:     r.motivoEvento ?? null,
    cantidadPersonas: r.cantidadPersonas ?? null,
    tieneMascota:     r.tieneMascota,
  }));

  return <ReservasTable reservas={reservas} />;
}
