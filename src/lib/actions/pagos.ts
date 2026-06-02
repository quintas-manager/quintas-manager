"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagoSchema, type PagoFormValues } from "@/lib/schemas/pagos";

type Ok<T> = { success: true; data: T };
type Err  = { success: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T = undefined> = Ok<T> | Err;

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export async function calcularSaldoPendiente(reservaId: string): Promise<number> {
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    select: {
      montoTotal: true,
      sena: true,
      pagos: { select: { monto: true } },
    },
  });
  if (!reserva) return 0;
  const pagado = reserva.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  return Number(reserva.montoTotal) - (Number(reserva.sena) || 0) - pagado;
}

export async function registrarPago(raw: PagoFormValues): Promise<Result<{ id: string }>> {
  const session = await getSession();
  const parsed = pagoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const saldo = await calcularSaldoPendiente(data.reservaId);

  if (data.monto > saldo + 0.01) {
    return {
      success: false,
      error: `El monto ($${data.monto.toFixed(2)}) supera el saldo pendiente ($${saldo.toFixed(2)})`,
      fieldErrors: { monto: ["Supera el saldo pendiente"] },
    };
  }

  const pago = await prisma.pago.create({
    data: {
      reservaId:  data.reservaId,
      creadoPorId: session.user.id,
      monto:      data.monto,
      fecha:      new Date(data.fecha),
      metodoPago: data.metodoPago,
      notas:      data.notas || null,
    },
  });

  revalidatePath("/pagos");
  revalidatePath(`/reservas/${data.reservaId}`);
  revalidatePath("/reservas");
  return { success: true, data: { id: pago.id } };
}

export async function getClientesConDeuda() {
  const reservas = await prisma.reserva.findMany({
    where: { estado: { in: ["PENDIENTE", "CONFIRMADA"] } },
    include: {
      cliente: true,
      quinta:  { select: { id: true, nombre: true, colorHex: true } },
      pagos:   { select: { monto: true } },
    },
  });

  const clienteMap = new Map<
    string,
    {
      id: string;
      nombre: string;
      apellido: string;
      telefono: string;
      reservasConDeuda: {
        id: string;
        quintaNombre: string;
        quintaColor: string;
        fechaInicio: Date;
        fechaFin: Date;
        montoTotal: number;
        senaYPagos: number;
        saldoPendiente: number;
      }[];
    }
  >();

  for (const r of reservas) {
    const pagado = r.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    const saldo = Number(r.montoTotal) - (Number(r.sena) || 0) - pagado;
    if (saldo <= 0) continue;

    const cid = r.cliente.id;
    if (!clienteMap.has(cid)) {
      clienteMap.set(cid, {
        id: cid,
        nombre: r.cliente.nombre,
        apellido: r.cliente.apellido,
        telefono: r.cliente.telefono,
        reservasConDeuda: [],
      });
    }

    clienteMap.get(cid)!.reservasConDeuda.push({
      id: r.id,
      quintaNombre: r.quinta.nombre,
      quintaColor: r.quinta.colorHex,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
      montoTotal: Number(r.montoTotal),
      senaYPagos: (Number(r.sena) || 0) + pagado,
      saldoPendiente: saldo,
    });
  }

  return Array.from(clienteMap.values());
}
