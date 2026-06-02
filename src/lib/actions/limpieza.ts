"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONTACTOS_KEYS } from "@/lib/limpieza-config";
import type { ContactoConfig } from "@/lib/limpieza-config";
export type { ContactoConfig } from "@/lib/limpieza-config";

type Ok<T> = { success: true; data: T };
type Err  = { success: false; error: string };
type Result<T = undefined> = Ok<T> | Err;

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export interface DiaInput {
  diaSemana:         number;
  lugarPrincipalId:  string;
  lugarSecundarioId: string | null;
}

export interface CronogramaInput {
  semanaInicio: string;
  dias:         DiaInput[];
  enviar?:      boolean;
}

// ── Crear ─────────────────────────────────────────────────────────────────────

export async function crearCronograma(
  input: CronogramaInput,
): Promise<Result<{ id: string }>> {
  const session = await getSession();
  const now = new Date();

  const cronograma = await prisma.cronogramaLimpieza.create({
    data: {
      semanaInicio: new Date(input.semanaInicio),
      creadoPorId:  session.user.id,
      enviado:      input.enviar ?? false,
      fechaEnvio:   input.enviar ? now : null,
      dias: {
        create: input.dias.map((d) => ({
          diaSemana:         d.diaSemana,
          lugarPrincipalId:  d.lugarPrincipalId,
          lugarSecundarioId: d.lugarSecundarioId || null,
        })),
      },
    },
  });

  revalidatePath("/limpieza");
  return { success: true, data: { id: cronograma.id } };
}

// ── Actualizar ────────────────────────────────────────────────────────────────

export async function actualizarCronograma(
  id: string,
  input: CronogramaInput,
): Promise<Result<{ id: string }>> {
  await getSession();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.diaCronograma.deleteMany({ where: { cronogramaId: id } });
    await tx.cronogramaLimpieza.update({
      where: { id },
      data: {
        semanaInicio: new Date(input.semanaInicio),
        enviado:      input.enviar ?? false,
        fechaEnvio:   input.enviar ? now : null,
        dias: {
          create: input.dias.map((d) => ({
            diaSemana:         d.diaSemana,
            lugarPrincipalId:  d.lugarPrincipalId,
            lugarSecundarioId: d.lugarSecundarioId || null,
          })),
        },
      },
    });
  });

  revalidatePath("/limpieza");
  revalidatePath(`/limpieza/${id}`);
  return { success: true, data: { id } };
}

// ── Marcar enviado ────────────────────────────────────────────────────────────

export async function marcarEnviado(id: string): Promise<Result> {
  await getSession();

  await prisma.cronogramaLimpieza.update({
    where: { id },
    data: { enviado: true, fechaEnvio: new Date() },
  });

  revalidatePath("/limpieza");
  revalidatePath(`/limpieza/${id}`);
  return { success: true, data: undefined };
}

// ── Configuración ─────────────────────────────────────────────────────────────

export async function getConfiguracion(clave: string): Promise<string> {
  const config = await prisma.configuracionApp.findUnique({ where: { clave } });
  return config?.valor ?? "";
}

export async function setConfiguracion(
  clave: string,
  valor: string,
): Promise<Result> {
  await getSession();

  await prisma.configuracionApp.upsert({
    where:  { clave },
    update: { valor },
    create: { clave, valor },
  });

  return { success: true, data: undefined };
}

// ── Contactos múltiples ───────────────────────────────────────────────────────

export async function getContactos(): Promise<ContactoConfig[]> {
  const claves  = CONTACTOS_KEYS.map((c) => c.key);
  const configs = await prisma.configuracionApp.findMany({
    where: { clave: { in: claves } },
  });
  const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));
  return CONTACTOS_KEYS.map((c) => ({
    key:    c.key,
    nombre: c.nombre,
    numero: map[c.key] ?? "",
  }));
}

export async function setContactos(
  contactos: { key: string; numero: string }[],
): Promise<Result> {
  await getSession();

  await Promise.all(
    contactos.map(({ key, numero }) =>
      prisma.configuracionApp.upsert({
        where:  { clave: key },
        update: { valor: numero },
        create: { clave: key, valor: numero },
      }),
    ),
  );

  return { success: true, data: undefined };
}
