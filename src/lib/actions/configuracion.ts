"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TipoAlquiler } from "@prisma/client";

type Ok<T> = { success: true; data: T };
type Err   = { success: false; error: string };
type Result<T = undefined> = Ok<T> | Err;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("No autorizado");
}

// ── Quintas ───────────────────────────────────────────────────────────────────

const quintaSchema = z.object({
  nombre:           z.string().min(1, "Requerido"),
  descripcion:      z.string().optional(),
  capacidadAdultos: z.number().int().min(1),
  capacidadNinos:   z.number().int().min(0),
  colorHex:         z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
});
export type QuintaInput = z.infer<typeof quintaSchema>;

export async function actualizarQuinta(id: string, raw: QuintaInput): Promise<Result> {
  await requireAdmin();
  const parsed = quintaSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };
  await prisma.quinta.update({ where: { id }, data: parsed.data });
  revalidatePath("/configuracion");
  revalidatePath("/calendario");
  return { success: true, data: undefined };
}

export async function toggleActivaQuinta(id: string, activa: boolean): Promise<Result> {
  await requireAdmin();
  await prisma.quinta.update({ where: { id }, data: { activa } });
  revalidatePath("/configuracion");
  revalidatePath("/calendario");
  return { success: true, data: undefined };
}

// ── Temporadas ────────────────────────────────────────────────────────────────

const temporadaSchema = z
  .object({
    nombre:      z.string().min(1, "Requerido"),
    tipo:        z.enum(["ALTA", "BAJA"]),
    fechaInicio: z.string().min(1, "Requerido"),
    fechaFin:    z.string().min(1, "Requerido"),
    quintaIds:   z.array(z.string()),
  })
  .refine((d) => new Date(d.fechaFin) >= new Date(d.fechaInicio), {
    message: "La fecha fin debe ser posterior al inicio",
    path: ["fechaFin"],
  });
export type TemporadaInput = z.infer<typeof temporadaSchema>;

export async function crearTemporada(raw: TemporadaInput): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const parsed = temporadaSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { quintaIds, fechaInicio, fechaFin, ...rest } = parsed.data;
  const t = await prisma.temporada.create({
    data: {
      ...rest,
      fechaInicio: new Date(fechaInicio),
      fechaFin:    new Date(fechaFin),
      quintas: { create: quintaIds.map((quintaId) => ({ quintaId })) },
    },
  });
  revalidatePath("/configuracion");
  return { success: true, data: { id: t.id } };
}

export async function actualizarTemporada(id: string, raw: TemporadaInput): Promise<Result> {
  await requireAdmin();
  const parsed = temporadaSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { quintaIds, fechaInicio, fechaFin, ...rest } = parsed.data;
  await prisma.$transaction([
    prisma.temporadaQuinta.deleteMany({ where: { temporadaId: id } }),
    prisma.temporada.update({
      where: { id },
      data: { ...rest, fechaInicio: new Date(fechaInicio), fechaFin: new Date(fechaFin) },
    }),
    ...quintaIds.map((quintaId) =>
      prisma.temporadaQuinta.create({ data: { temporadaId: id, quintaId } }),
    ),
  ]);
  revalidatePath("/configuracion");
  return { success: true, data: undefined };
}

export async function eliminarTemporada(id: string): Promise<Result> {
  await requireAdmin();
  await prisma.temporada.delete({ where: { id } });
  revalidatePath("/configuracion");
  return { success: true, data: undefined };
}

// ── Precios ───────────────────────────────────────────────────────────────────

const TIPOS_ALQUILER = ["DIA", "FIN_DE_SEMANA", "SEMANA", "QUINCENA", "MES"] as const;

export async function upsertPrecio(
  quintaId:     string,
  temporadaId:  string,
  tipoAlquiler: string,
  precio:       number,
): Promise<Result> {
  await requireAdmin();
  if (!TIPOS_ALQUILER.includes(tipoAlquiler as TipoAlquiler))
    return { success: false, error: "Tipo inválido" };
  if (isNaN(precio) || precio < 0) return { success: false, error: "Precio inválido" };

  await prisma.precioTemporada.upsert({
    where: {
      quintaId_temporadaId_tipoAlquiler: {
        quintaId,
        temporadaId,
        tipoAlquiler: tipoAlquiler as TipoAlquiler,
      },
    },
    create: { quintaId, temporadaId, tipoAlquiler: tipoAlquiler as TipoAlquiler, precio },
    update: { precio },
  });
  revalidatePath("/configuracion");
  return { success: true, data: undefined };
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

const usuarioSchema = z.object({
  name:     z.string().min(1, "Requerido"),
  password: z
    .string()
    .min(6, "Mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),
});
export type UsuarioInput = z.infer<typeof usuarioSchema>;

export async function actualizarUsuario(id: string, raw: UsuarioInput): Promise<Result> {
  await requireAdmin();
  const parsed = usuarioSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const updateData: { name: string; password?: string } = { name: parsed.data.name };
  if (parsed.data.password) {
    updateData.password = await bcrypt.hash(parsed.data.password, 10);
  }
  await prisma.user.update({ where: { id }, data: updateData });
  revalidatePath("/configuracion");
  return { success: true, data: undefined };
}
