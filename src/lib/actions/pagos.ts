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
  return Number(reserva.montoTotal) - pagado;
}

// ── Tipos para distribución ───────────────────────────────────────────────────

export interface GastoPendienteItem {
  id: string;
  descripcion: string;
  pagadoPor: "GRACIELA" | "MATIAS";
  monto: number;
  fecha: string;
}

export interface DistribucionInput {
  gastosReintegradosIds: string[];
  reintegroMatias: number;
  reintegroGraciela: number;
  parteMatias: number;
  parteGraciela: number;
  notas?: string;
}

// ── Gastos pendientes por quinta ──────────────────────────────────────────────

export async function getGastosPendientesPorQuinta(quintaId: string): Promise<GastoPendienteItem[]> {
  await getSession();
  const gastos = await prisma.gasto.findMany({
    where: {
      quintaId,
      reintegrado: false,
      pagadoPor: { in: ["GRACIELA", "MATIAS"] },
    },
    orderBy: { fecha: "asc" },
  });
  return gastos.map((g) => ({
    id:          g.id,
    descripcion: g.descripcion,
    pagadoPor:   g.pagadoPor as "GRACIELA" | "MATIAS",
    monto:       Number(g.montoUSD ?? g.monto),
    fecha:       g.fecha.toISOString().split("T")[0],
  }));
}

// ── Detalle de pago para distribución de seña ─────────────────────────────────

export async function getPagoParaDistribucion(pagoId: string): Promise<{
  id: string;
  montoUSD: number;
  reservaId: string;
  quintaId: string;
  quintaNombre: string;
  quintaColor: string;
  clienteNombre: string;
  yaDistribuido: boolean;
} | null> {
  await getSession();
  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: {
      distribucion: true,
      reserva: {
        include: {
          quinta: { select: { id: true, nombre: true, colorHex: true } },
          cliente: { select: { nombre: true, apellido: true } },
        },
      },
    },
  });
  if (!pago) return null;
  return {
    id:            pago.id,
    montoUSD:      Number(pago.montoUSD ?? pago.monto),
    reservaId:     pago.reservaId,
    quintaId:      pago.reserva.quintaId,
    quintaNombre:  pago.reserva.quinta.nombre,
    quintaColor:   pago.reserva.quinta.colorHex,
    clienteNombre: `${pago.reserva.cliente.nombre} ${pago.reserva.cliente.apellido}`,
    yaDistribuido: !!pago.distribucion,
  };
}

// ── Crear pago + distribución (paso único) ────────────────────────────────────

export async function crearPagoConDistribucion(
  pagoRaw: PagoFormValues,
  dist: DistribucionInput,
): Promise<Result<{ reservaId: string }>> {
  const session = await getSession();
  const parsed = pagoSchema.safeParse(pagoRaw);
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

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const pago = await tx.pago.create({
      data: {
        reservaId:   data.reservaId,
        creadoPorId: session.user.id,
        monto:       data.monto,
        montoUSD:    data.monto,
        montoARS:    data.montoARS   ?? null,
        tipoCambio:  data.tipoCambio ?? null,
        moneda:      data.moneda     ?? "USD",
        fecha:       new Date(data.fecha),
        metodoPago:  data.metodoPago,
        notas:       data.notas || null,
      },
    });

    await tx.distribucion.create({
      data: {
        pagoId:            pago.id,
        montoTotalUSD:     data.monto,
        reintegroMatias:   dist.reintegroMatias,
        reintegroGraciela: dist.reintegroGraciela,
        parteMatias:       dist.parteMatias,
        parteGraciela:     dist.parteGraciela,
        notas:             dist.notas || null,
        creadoPorId:       session.user.id,
      },
    });

    if (dist.gastosReintegradosIds.length > 0) {
      await tx.gasto.updateMany({
        where: { id: { in: dist.gastosReintegradosIds } },
        data:  { reintegrado: true, fechaReintegro: now },
      });
    }
  });

  revalidatePath("/pagos");
  revalidatePath(`/reservas/${data.reservaId}`);
  revalidatePath("/reservas");
  revalidatePath("/finanzas");
  return { success: true, data: { reservaId: data.reservaId } };
}

// ── Distribuir seña ya existente ──────────────────────────────────────────────

export async function crearDistribucionParaPago(
  pagoId: string,
  dist: DistribucionInput,
): Promise<Result<{ reservaId: string }>> {
  const session = await getSession();

  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: { distribucion: true },
  });
  if (!pago)             return { success: false, error: "Pago no encontrado" };
  if (pago.distribucion) return { success: false, error: "Este pago ya tiene distribución" };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.distribucion.create({
      data: {
        pagoId,
        montoTotalUSD:     Number(pago.montoUSD ?? pago.monto),
        reintegroMatias:   dist.reintegroMatias,
        reintegroGraciela: dist.reintegroGraciela,
        parteMatias:       dist.parteMatias,
        parteGraciela:     dist.parteGraciela,
        notas:             dist.notas || null,
        creadoPorId:       session.user.id,
      },
    });

    if (dist.gastosReintegradosIds.length > 0) {
      await tx.gasto.updateMany({
        where: { id: { in: dist.gastosReintegradosIds } },
        data:  { reintegrado: true, fechaReintegro: now },
      });
    }
  });

  revalidatePath("/finanzas");
  revalidatePath(`/reservas/${pago.reservaId}`);
  return { success: true, data: { reservaId: pago.reservaId } };
}

// ── Listado de clientes con deuda ─────────────────────────────────────────────

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
        quintaId: string;
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
    const saldo = Number(r.montoTotal) - pagado;
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
      id:             r.id,
      quintaId:       r.quinta.id,
      quintaNombre:   r.quinta.nombre,
      quintaColor:    r.quinta.colorHex,
      fechaInicio:    r.fechaInicio,
      fechaFin:       r.fechaFin,
      montoTotal:     Number(r.montoTotal),
      senaYPagos:     pagado,
      saldoPendiente: saldo,
    });
  }

  return Array.from(clienteMap.values());
}
