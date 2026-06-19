"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  reservaSchema,
  reservaPendienteSchema,
  confirmarConMontoSchema,
  cancelarSchema,
  type ReservaFormValues,
  type ReservaPendienteFormValues,
  type ConfirmarConMontoValues,
  type CancelarFormValues,
} from "@/lib/schemas/reservas";

type Ok<T> = { success: true; data: T };
type Err  = { success: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T = undefined> = Ok<T> | Err;

function parseISODateUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

async function checkConflicto(
  quintaId: string,
  fechaInicio: Date,
  fechaFin: Date,
  excludeId?: string,
) {
  return prisma.reserva.findFirst({
    where: {
      quintaId,
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      fechaInicio: { lt: fechaFin },
      fechaFin:    { gt: fechaInicio },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { cliente: { select: { nombre: true, apellido: true } } },
  });
}

// ── Crear ────────────────────────────────────────────────────────────────────

export async function crearReserva(raw: ReservaFormValues): Promise<Result<{ id: string; senaPagoId?: string }>> {
  const session = await getSession();
  const parsed = reservaSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const inicio = parseISODateUTC(data.fechaInicio);
  const fin    = parseISODateUTC(data.fechaFin);

  const conflicto = await checkConflicto(data.quintaId, inicio, fin);
  if (conflicto) {
    const c = conflicto.cliente;
    return {
      success: false,
      error: `Conflicto: ya existe una reserva de ${c.nombre} ${c.apellido} que se superpone con esas fechas.`,
      fieldErrors: { fechaInicio: ["Fechas ocupadas"], fechaFin: ["Fechas ocupadas"] },
    };
  }

  const seña = data.sena ?? null;
  const now  = new Date();

  const { reserva, senaPagoId } = await prisma.$transaction(async (tx) => {
    const r = await tx.reserva.create({
      data: {
        quintaId:         data.quintaId,
        clienteId:        data.clienteId,
        creadoPorId:      session.user.id,
        fechaInicio:      inicio,
        fechaFin:         fin,
        tipoAlquiler:     data.tipoAlquiler ?? "DIA",
        estado:           data.estado,
        montoTotal:       data.montoTotal,
        montoTotalUSD:     data.montoTotal,
        montoTotalARS:     data.montoTotalARS     ?? null,
        tipoCambioReserva: data.tipoCambioReserva ?? null,
        monedaIngreso:     data.monedaIngreso     ?? "USD",
        sena: seña,
        senaUSD:           data.sena              ?? null,
        senaARS:           data.senaARS           ?? null,
        tipoCambioSena:    data.tipoCambioSena    ?? null,
        motivoEvento:     data.motivoEvento || null,
        notas:            data.notas || null,
        tieneMascota:       data.tieneMascota ?? false,
        cargoMascotaARS:    data.tieneMascota ? (data.cargoMascotaARS ?? 20000) : null,
        cargoMascotaUSD:    data.tieneMascota ? (data.cargoMascotaUSD ?? null) : null,
        cargoMascotaPagado: data.cargoMascotaPagado ?? false,
        fechaPagoMascota:   data.cargoMascotaPagado ? new Date() : null,
        cantidadPersonas: data.cantidadPersonas ?? null,
      },
    });

    let senaPagoId: string | undefined;
    if (seña && seña > 0) {
      const p = await tx.pago.create({
        data: {
          reservaId:   r.id,
          creadoPorId: session.user.id,
          monto:       seña,
          montoUSD:    data.sena ?? null,
          montoARS:    data.senaARS ?? null,
          tipoCambio:  data.tipoCambioSena ?? null,
          moneda:      data.monedaIngreso ?? "USD",
          fecha:       now,
          metodoPago:  data.metodoPagoSeña ?? "EFECTIVO",
          notas:       "Seña registrada al crear la reserva",
        },
      });
      senaPagoId = p.id;
    }

    return { reserva: r, senaPagoId };
  });

  revalidatePath("/reservas");
  revalidatePath("/calendario");
  return { success: true, data: { id: reserva.id, senaPagoId } };
}

// ── Actualizar ───────────────────────────────────────────────────────────────

export async function actualizarReserva(
  id: string,
  raw: ReservaFormValues,
): Promise<Result<{ id: string }>> {
  await getSession();
  const parsed = reservaSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const inicio = parseISODateUTC(data.fechaInicio);
  const fin    = parseISODateUTC(data.fechaFin);

  const conflicto = await checkConflicto(data.quintaId, inicio, fin, id);
  if (conflicto) {
    const c = conflicto.cliente;
    return {
      success: false,
      error: `Conflicto: ya existe una reserva de ${c.nombre} ${c.apellido} que se superpone con esas fechas.`,
      fieldErrors: { fechaInicio: ["Fechas ocupadas"], fechaFin: ["Fechas ocupadas"] },
    };
  }

  await prisma.reserva.update({
    where: { id },
    data: {
      quintaId:         data.quintaId,
      clienteId:        data.clienteId,
      fechaInicio:      inicio,
      fechaFin:         fin,
      tipoAlquiler:     data.tipoAlquiler ?? "DIA",
      estado:           data.estado,
      montoTotal:       data.montoTotal,
      montoTotalUSD:     data.montoTotal,
      montoTotalARS:     data.montoTotalARS     ?? null,
      tipoCambioReserva: data.tipoCambioReserva ?? null,
      monedaIngreso:     data.monedaIngreso     ?? "USD",
      sena:             data.sena ?? null,
      senaUSD:           data.sena              ?? null,
      senaARS:           data.senaARS           ?? null,
      tipoCambioSena:    data.tipoCambioSena    ?? null,
      motivoEvento:     data.motivoEvento || null,
      notas:            data.notas || null,
      tieneMascota:       data.tieneMascota ?? false,
      cargoMascotaARS:    data.tieneMascota ? (data.cargoMascotaARS ?? 20000) : null,
      cargoMascotaUSD:    data.tieneMascota ? (data.cargoMascotaUSD ?? null) : null,
      cargoMascotaPagado: data.cargoMascotaPagado ?? false,
      fechaPagoMascota:   data.cargoMascotaPagado ? new Date() : null,
      cantidadPersonas: data.cantidadPersonas ?? null,
    },
  });

  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
  revalidatePath("/calendario");
  return { success: true, data: { id } };
}

// ── Crear Pendiente ──────────────────────────────────────────────────────────

export async function crearReservaPendiente(
  raw: ReservaPendienteFormValues,
): Promise<Result<{ id: string }>> {
  const session = await getSession();
  const parsed = reservaPendienteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const inicio = parseISODateUTC(data.fechaInicio);
  const fin    = parseISODateUTC(data.fechaFin);

  const conflicto = await checkConflicto(data.quintaId, inicio, fin);
  if (conflicto) {
    const c = conflicto.cliente;
    return {
      success: false,
      error: `Conflicto: ya existe una reserva de ${c.nombre} ${c.apellido} que se superpone con esas fechas.`,
      fieldErrors: { fechaInicio: ["Fechas ocupadas"], fechaFin: ["Fechas ocupadas"] },
    };
  }

  const reserva = await prisma.reserva.create({
    data: {
      quintaId:         data.quintaId,
      clienteId:        data.clienteId,
      creadoPorId:      session.user.id,
      fechaInicio:      inicio,
      fechaFin:         fin,
      tipoAlquiler:     "DIA",
      estado:           "PENDIENTE",
      montoTotal:       0,
      notas:            data.notas || null,
      tieneMascota:     data.tieneMascota ?? false,
      cantidadPersonas: data.cantidadPersonas ?? null,
    },
  });

  revalidatePath("/reservas");
  revalidatePath("/calendario");
  return { success: true, data: { id: reserva.id } };
}

// ── Confirmar ────────────────────────────────────────────────────────────────

export async function confirmarReserva(id: string): Promise<Result> {
  await getSession();
  await prisma.reserva.update({
    where: { id },
    data: { estado: "CONFIRMADA" },
  });
  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
  revalidatePath("/calendario");
  return { success: true, data: undefined };
}

export async function confirmarConMonto(
  id: string,
  raw: ConfirmarConMontoValues,
): Promise<Result> {
  const session = await getSession();
  const parsed = confirmarConMontoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const seña = data.sena ?? null;
  const now  = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.reserva.update({
      where: { id },
      data: {
        estado:    "CONFIRMADA",
        montoTotal: data.montoTotal,
        montoTotalUSD:     data.montoTotal,
        montoTotalARS:     data.montoTotalARS     ?? null,
        tipoCambioReserva: data.tipoCambioReserva ?? null,
        monedaIngreso:     data.monedaIngreso     ?? "USD",
        sena:       seña,
        senaUSD:           data.sena              ?? null,
        senaARS:           data.senaARS           ?? null,
        tipoCambioSena:    data.tipoCambioSena    ?? null,
      },
    });

    if (seña && seña > 0) {
      await tx.pago.create({
        data: {
          reservaId:   id,
          creadoPorId: session.user.id,
          monto:       seña,
          montoUSD:    data.sena ?? null,
          montoARS:    data.senaARS ?? null,
          tipoCambio:  data.tipoCambioSena ?? null,
          moneda:      data.monedaIngreso ?? "USD",
          fecha:       now,
          metodoPago:  data.metodoPagoSeña ?? "EFECTIVO",
          notas:       "Seña registrada al confirmar la reserva",
        },
      });
    }
  });

  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
  revalidatePath("/calendario");
  return { success: true, data: undefined };
}

// ── Marcar cargo mascota pagado ───────────────────────────────────────────────

export async function marcarCargoMascotaPagado(id: string): Promise<Result> {
  await getSession();
  await prisma.reserva.update({
    where: { id },
    data: { cargoMascotaPagado: true, fechaPagoMascota: new Date() },
  });
  revalidatePath(`/reservas/${id}`);
  revalidatePath("/reservas");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

// ── Eliminar ─────────────────────────────────────────────────────────────────

export async function eliminarReserva(id: string): Promise<Result> {
  await getSession();
  await prisma.pago.deleteMany({ where: { reservaId: id } });
  await prisma.reserva.delete({ where: { id } });
  revalidatePath("/reservas");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

// ── Cancelar ─────────────────────────────────────────────────────────────────

export async function cancelarReserva(
  id: string,
  raw: CancelarFormValues,
): Promise<Result> {
  await getSession();
  const parsed = cancelarSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors.motivo?.[0] ?? "Datos inválidos",
    };
  }

  await prisma.reserva.update({
    where: { id },
    data: {
      estado: "CANCELADA",
      notas: `[CANCELADA] ${parsed.data.motivo}`,
    },
  });

  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
  revalidatePath("/calendario");
  return { success: true, data: undefined };
}
