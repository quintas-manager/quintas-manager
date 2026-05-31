"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clienteSchema, type ClienteFormValues } from "@/lib/schemas/reservas";

type Ok<T> = { success: true; data: T };
type Err  = { success: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T> = Ok<T> | Err;

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

// ── Crear ─────────────────────────────────────────────────────────────────────

export async function crearCliente(raw: ClienteFormValues): Promise<
  Result<{ id: string; nombre: string; apellido: string; telefono: string }>
> {
  await getSession();
  const parsed = clienteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { email, ...rest } = parsed.data;
  const cliente = await prisma.cliente.create({
    data: { ...rest, email: email || null },
    select: { id: true, nombre: true, apellido: true, telefono: true },
  });
  revalidatePath("/clientes");
  return { success: true, data: cliente };
}

// ── Actualizar ────────────────────────────────────────────────────────────────

export async function actualizarCliente(
  id: string,
  raw: ClienteFormValues,
): Promise<Result<{ id: string }>> {
  await getSession();
  const parsed = clienteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { email, ...rest } = parsed.data;
  await prisma.cliente.update({
    where: { id },
    data: { ...rest, email: email || null },
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true, data: { id } };
}
