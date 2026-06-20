"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GastoPagador } from "@prisma/client";
import {
  gastoSchema,
  reintegroSchema,
  type GastoFormValues,
  type ReintegroFormValues,
} from "@/lib/schemas/gastos";

type Ok<T> = { success: true; data: T };
type Err   = { success: false; error: string };
type Result<T = undefined> = Ok<T> | Err;

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

// ── Crear ─────────────────────────────────────────────────────────────────────

export async function crearGasto(raw: GastoFormValues): Promise<Result<{ id: string }>> {
  const session = await getSession();
  const parsed  = gastoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const d = parsed.data;
  const gasto = await prisma.gasto.create({
    data: {
      quintaId:    d.quintaId,
      categoriaId: d.categoriaId,
      creadoPorId: session.user.id,
      descripcion: d.descripcion,
      monto:       d.monto,
      montoUSD:    d.montoARS && d.tipoCambio ? d.montoARS / d.tipoCambio : d.monto,
      montoARS:    d.montoARS   ?? null,
      tipoCambio:  d.tipoCambio ?? null,
      fecha:       new Date(d.fecha),
      pagadoPor:   d.pagadoPor as GastoPagador,
      notas:       d.notas || null,
      // reintegrado defaults false; si pagadoPor === CAJA lo marcamos inmediatamente
      reintegrado: d.pagadoPor === "CAJA",
    },
  });
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { success: true, data: { id: gasto.id } };
}

// ── Actualizar ────────────────────────────────────────────────────────────────

export async function actualizarGasto(
  id: string,
  raw: GastoFormValues,
): Promise<Result> {
  await getSession();
  const parsed = gastoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const d = parsed.data;
  await prisma.gasto.update({
    where: { id },
    data: {
      quintaId:    d.quintaId,
      categoriaId: d.categoriaId,
      descripcion: d.descripcion,
      monto:       d.monto,
      montoUSD:    d.montoARS && d.tipoCambio ? d.montoARS / d.tipoCambio : d.monto,
      montoARS:    d.montoARS   ?? null,
      tipoCambio:  d.tipoCambio ?? null,
      fecha:       new Date(d.fecha),
      pagadoPor:   d.pagadoPor as GastoPagador,
      notas:       d.notas || null,
      // Recalculate reintegrado if payer changed to CAJA
      ...(d.pagadoPor === "CAJA" ? { reintegrado: true, fechaReintegro: null } : {}),
    },
  });
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

export async function eliminarGasto(id: string): Promise<Result> {
  await getSession();
  await prisma.gasto.delete({ where: { id } });
  revalidatePath("/gastos");
  revalidatePath("/finanzas");
  return { success: true, data: undefined };
}

// ── Marcar reintegrado ────────────────────────────────────────────────────────

export async function marcarReintegrado(
  id: string,
  raw: ReintegroFormValues,
): Promise<Result> {
  await getSession();
  const parsed = reintegroSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  await prisma.gasto.update({
    where: { id },
    data: {
      reintegrado:    true,
      fechaReintegro: new Date(parsed.data.fechaReintegro),
    },
  });
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

// ── Marcar todos reintegrados de un pagador ───────────────────────────────────

export async function marcarTodosReintegrados(
  pagador: string,
  raw: ReintegroFormValues,
): Promise<Result> {
  await getSession();
  const parsed = reintegroSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  if (!["GRACIELA", "MATIAS", "ROCIO"].includes(pagador)) {
    return { success: false, error: "Pagador inválido" };
  }
  await prisma.gasto.updateMany({
    where: { pagadoPor: pagador as GastoPagador, reintegrado: false },
    data: {
      reintegrado:    true,
      fechaReintegro: new Date(parsed.data.fechaReintegro),
    },
  });
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}
