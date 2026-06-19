import { prisma } from "@/lib/prisma";
import { CalendarioClient } from "@/components/calendario/CalendarioClient";
import type { ReservaEvento, QuintaBasic } from "@/types/calendario";

async function getInitialData(): Promise<{
  reservas: ReservaEvento[];
  quintas: QuintaBasic[];
}> {
  const now = new Date();
  // Fetch a 3-month window (prev, current, next) so the initial render covers
  // all weeks FullCalendar might display at the month view boundaries.
  const desde = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const hasta = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const [rawReservas, rawQuintas] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        estado: { in: ["CONFIRMADA", "PENDIENTE"] },
        fechaInicio: { lte: hasta },
        fechaFin: { gte: desde },
      },
      include: {
        quinta: { select: { id: true, nombre: true, colorHex: true } },
        cliente: { select: { nombre: true, apellido: true } },
      },
      orderBy: { fechaInicio: "asc" },
    }),
    prisma.quinta.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, colorHex: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const reservas: ReservaEvento[] = rawReservas.map((r) => ({
    id: r.id,
    clienteNombre: r.cliente.nombre,
    clienteApellido: r.cliente.apellido,
    quintaId: r.quintaId,
    quintaNombre: r.quinta.nombre,
    quintaColor: r.quinta.colorHex,
    fechaInicio: r.fechaInicio.toISOString(),
    fechaFin: r.fechaFin.toISOString(),
    tipoAlquiler: r.tipoAlquiler,
    estado: r.estado,
    montoTotal:        Number(r.montoTotalUSD ?? r.montoTotal),
    montoTotalARS:     r.montoTotalARS ? Number(r.montoTotalARS) : null,
    tipoCambioReserva: r.tipoCambioReserva ? Number(r.tipoCambioReserva) : null,
    monedaIngreso:     r.monedaIngreso ?? "USD",
    sena:              r.senaUSD ? Number(r.senaUSD) : (r.sena ? Number(r.sena) : null),
    senaARS:           r.senaARS ? Number(r.senaARS) : null,
    tipoCambioSena:    r.tipoCambioSena ? Number(r.tipoCambioSena) : null,
    notas: r.notas,
    motivoEvento: r.motivoEvento,
    cantidadPersonas: r.cantidadPersonas,
    tieneMascota: r.tieneMascota,
  }));

  return { reservas, quintas: rawQuintas };
}

export default async function CalendarioPage() {
  const { reservas, quintas } = await getInitialData();

  return (
    <CalendarioClient initialReservas={reservas} quintas={quintas} />
  );
}
