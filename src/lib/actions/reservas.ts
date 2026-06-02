"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  reservaSchema,
  cancelarSchema,
  type ReservaFormValues,
  type CancelarFormValues,
} from "@/lib/schemas/reservas";

type Ok<T> = { success: true; data: T };
type Err  = { success: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T = undefined> = Ok<T> | Err;

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
      fechaInicio: { lte: fechaFin },
      fechaFin:    { gte: fechaInicio },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { cliente: { select: { nombre: true, apellido: true } } },
  });
}

// ── Crear ────────────────────────────────────────────────────────────────────

export async function crearReserva(raw: ReservaFormValues): Promise<Result<{ id: string }>> {
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
  const inicio = new Date(data.fechaInicio);
  const fin    = new Date(data.fechaFin);

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

  const reserva = await prisma.$transaction(async (tx) => {
    const r = await tx.reserva.create({
      data: {
        quintaId:         data.quintaId,
        clienteId:        data.clienteId,
        creadoPorId:      session.user.id,
        fechaInicio:      inicio,
        fechaFin:         fin,
        tipoAlquiler:     data.tipoAlquiler,
        estado:           data.estado,
        montoTotal:       data.montoTotal,
        sena: seña,
        motivoEvento:     data.motivoEvento || null,
        notas:            data.notas || null,
        tieneMascota:     data.tieneMascota ?? false,
        cantidadPersonas: data.cantidadPersonas ?? null,
      },
    });

    if (seña && seña > 0) {
      await tx.pago.create({
        data: {
          reservaId:   r.id,
          creadoPorId: session.user.id,
          monto:       seña,
          fecha:       now,
          metodoPago:  data.metodoPagoSeña ?? "EFECTIVO",
          notas:       "Seña registrada al crear la reserva",
        },
      });
    }

    return r;
  });

  revalidatePath("/reservas");
  revalidatePath("/calendario");
  return { success: true, data: { id: reserva.id } };
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
  const inicio = new Date(data.fechaInicio);
  const fin    = new Date(data.fechaFin);

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
      tipoAlquiler:     data.tipoAlquiler,
      estado:           data.estado,
      montoTotal:       data.montoTotal,
      sena:             data.sena ?? null,
      motivoEvento:     data.motivoEvento || null,
      notas:            data.notas || null,
      tieneMascota:     data.tieneMascota ?? false,
      cantidadPersonas: data.cantidadPersonas ?? null,
    },
  });

  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
  revalidatePath("/calendario");
  return { success: true, data: { id } };
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
