"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { retiroSchema } from "@/lib/schemas/retiros";

export async function crearRetiro(
  raw: unknown,
): Promise<{ success: false; error: string } | never> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "No autorizado" };

  const parsed = retiroSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { success: false, error: msg };
  }

  const { quintaId, realizadoPor, monto, fecha, notas, montoARS, tipoCambio } = parsed.data;
  const fechaDate = new Date(fecha);
  const mes  = fechaDate.getMonth() + 1;
  const anio = fechaDate.getFullYear();

  await prisma.retiro.create({
    data: {
      quintaId,
      creadoPorId:  session.user.id,
      monto,
      montoUSD:    montoARS && tipoCambio ? montoARS / tipoCambio : monto,
      montoARS:    montoARS   ?? null,
      tipoCambio:  tipoCambio ?? null,
      fecha:        fechaDate,
      realizadoPor,
      notas:        notas ?? null,
      mes,
      anio,
    },
  });

  revalidatePath("/finanzas");
  revalidatePath(`/finanzas/${quintaId}`);
  redirect("/dashboard");
}
