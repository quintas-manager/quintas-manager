"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PagoDetalle {
  id: string;
  fecha: string;
  clienteNombre: string;
  reservaFechaInicio: string;
  reservaFechaFin: string;
  monto: number;
  metodoPago: string;
}

export interface GastoDetalle {
  id: string;
  fecha: string;
  categoriaNombre: string;
  descripcion: string;
  monto: number;
  pagadoPor: string;
}

export interface ReintegroDetalle {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
}

export interface MesCalculado {
  quintaId: string;
  quintaNombre: string;
  quintaColor: string;
  mes: number;
  anio: number;
  pagos: PagoDetalle[];
  totalIngresos: number;
  gastos: GastoDetalle[];
  totalGastos: number;
  resultado: number;
  parteGraciela: number;
  parteMatias: number;
  reintegrosGraciela: ReintegroDetalle[];
  reintegrosMatias: ReintegroDetalle[];
  totalReintegrosGraciela: number;
  totalReintegrosMatias: number;
  cobrarGraciela: number;
  cobrarMatias: number;
  cierre: {
    id: string;
    fechaCierre: string;
    cerradoPorNombre: string;
    totalIngresos: number;
    totalGastos: number;
    resultado: number;
    parteGraciela: number;
    parteMatias: number;
    reintegrosGraciela: number;
    reintegrosMatias: number;
    cobrarGraciela: number;
    cobrarMatias: number;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mesRange(mes: number, anio: number) {
  const inicio = new Date(anio, mes - 1, 1);
  const fin    = new Date(anio, mes, 0, 23, 59, 59, 999);
  return { inicio, fin };
}

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// ── calcularMes ───────────────────────────────────────────────────────────────

export async function calcularMes(
  quintaId: string,
  mes: number,
  anio: number,
): Promise<MesCalculado> {
  const { inicio, fin } = mesRange(mes, anio);

  const [quinta, pagos, gastos, reintegrosPendientes, cierre] = await Promise.all([
    prisma.quinta.findUniqueOrThrow({
      where: { id: quintaId },
      select: { id: true, nombre: true, colorHex: true },
    }),

    prisma.pago.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
        reserva: { quintaId },
      },
      orderBy: { fecha: "asc" },
      include: {
        reserva: {
          include: { cliente: { select: { nombre: true, apellido: true } } },
        },
      },
    }),

    prisma.gasto.findMany({
      where: {
        quintaId,
        fecha: { gte: inicio, lte: fin },
      },
      orderBy: { fecha: "asc" },
      include: { categoria: { select: { nombre: true } } },
    }),

    prisma.gasto.findMany({
      where: {
        quintaId,
        reintegrado: false,
        pagadoPor:   { in: ["GRACIELA", "MATIAS"] },
      },
      orderBy: { fecha: "asc" },
    }),

    prisma.cierreMes.findUnique({
      where: { quintaId_mes_anio: { quintaId, mes, anio } },
      include: { cerradoPor: { select: { name: true } } },
    }),
  ]);

  const totalIngresos = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const totalGastos   = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const resultado     = totalIngresos - totalGastos;
  const parteGraciela = resultado / 2;
  const parteMatias   = resultado / 2;

  const reintegrosG = reintegrosPendientes.filter((g) => g.pagadoPor === "GRACIELA");
  const reintegrosM = reintegrosPendientes.filter((g) => g.pagadoPor === "MATIAS");
  const totalReintG = reintegrosG.reduce((s, g) => s + Number(g.monto), 0);
  const totalReintM = reintegrosM.reduce((s, g) => s + Number(g.monto), 0);

  return {
    quintaId:    quinta.id,
    quintaNombre: quinta.nombre,
    quintaColor: quinta.colorHex,
    mes,
    anio,

    pagos: pagos.map((p) => ({
      id:                 p.id,
      fecha:              fmtDate(p.fecha),
      clienteNombre:      `${p.reserva.cliente.nombre} ${p.reserva.cliente.apellido}`,
      reservaFechaInicio: fmtDate(p.reserva.fechaInicio),
      reservaFechaFin:    fmtDate(p.reserva.fechaFin),
      monto:              Number(p.monto),
      metodoPago:         p.metodoPago,
    })),
    totalIngresos,

    gastos: gastos.map((g) => ({
      id:              g.id,
      fecha:           fmtDate(g.fecha),
      categoriaNombre: g.categoria.nombre,
      descripcion:     g.descripcion,
      monto:           Number(g.monto),
      pagadoPor:       g.pagadoPor,
    })),
    totalGastos,

    resultado,
    parteGraciela,
    parteMatias,

    reintegrosGraciela: reintegrosG.map((g) => ({
      id:          g.id,
      fecha:       fmtDate(g.fecha),
      descripcion: g.descripcion,
      monto:       Number(g.monto),
    })),
    reintegrosMatias: reintegrosM.map((g) => ({
      id:          g.id,
      fecha:       fmtDate(g.fecha),
      descripcion: g.descripcion,
      monto:       Number(g.monto),
    })),
    totalReintegrosGraciela: totalReintG,
    totalReintegrosMatias:   totalReintM,

    cobrarGraciela: parteGraciela + totalReintG,
    cobrarMatias:   parteMatias   + totalReintM,

    cierre: cierre
      ? {
          id:                  cierre.id,
          fechaCierre:         fmtDate(cierre.fechaCierre),
          cerradoPorNombre:    cierre.cerradoPor.name,
          totalIngresos:       Number(cierre.totalIngresos),
          totalGastos:         Number(cierre.totalGastos),
          resultado:           Number(cierre.resultado),
          parteGraciela:       Number(cierre.parteGraciela),
          parteMatias:         Number(cierre.parteMatias),
          reintegrosGraciela:  Number(cierre.reintegrosGraciela),
          reintegrosMatias:    Number(cierre.reintegrosMatias),
          cobrarGraciela:      Number(cierre.cobrarGraciela),
          cobrarMatias:        Number(cierre.cobrarMatias),
        }
      : null,
  };
}

// ── cerrarMes ─────────────────────────────────────────────────────────────────

export async function cerrarMes(
  quintaId: string,
  mes: number,
  anio: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "No autorizado" };

  const data = await calcularMes(quintaId, mes, anio);

  if (data.cierre) return { success: false, error: "El mes ya está cerrado" };

  const fechaCierre = new Date();

  await prisma.$transaction([
    prisma.cierreMes.create({
      data: {
        quintaId,
        mes,
        anio,
        totalIngresos:       data.totalIngresos,
        totalGastos:         data.totalGastos,
        resultado:           data.resultado,
        parteGraciela:       data.parteGraciela,
        parteMatias:         data.parteMatias,
        reintegrosGraciela:  data.totalReintegrosGraciela,
        reintegrosMatias:    data.totalReintegrosMatias,
        cobrarGraciela:      data.cobrarGraciela,
        cobrarMatias:        data.cobrarMatias,
        cerradoPorId:        session.user.id,
        fechaCierre,
      },
    }),
    prisma.gasto.updateMany({
      where: {
        quintaId,
        reintegrado: false,
        pagadoPor:   { not: "CAJA" },
      },
      data: {
        reintegrado:    true,
        fechaReintegro: fechaCierre,
      },
    }),
  ]);

  revalidatePath(`/finanzas/${quintaId}`);
  revalidatePath(`/finanzas/${quintaId}/${anio}/${mes}`);
  return { success: true };
}

// ── getMesesConActividad ──────────────────────────────────────────────────────

export interface MesResumen {
  mes: number;
  anio: number;
  totalIngresos: number;
  totalGastos: number;
  resultado: number;
  cerrado: boolean;
}

export async function getMesesConActividad(quintaId: string): Promise<MesResumen[]> {
  const [pagos, gastos, cierres] = await Promise.all([
    prisma.pago.findMany({
      where: { reserva: { quintaId } },
      select: { fecha: true, monto: true },
    }),
    prisma.gasto.findMany({
      where: { quintaId },
      select: { fecha: true, monto: true },
    }),
    prisma.cierreMes.findMany({
      where: { quintaId },
      select: { mes: true, anio: true },
    }),
  ]);

  const map = new Map<string, { mes: number; anio: number; ingresos: number; gastos: number }>();

  for (const p of pagos) {
    const d = new Date(p.fecha);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!map.has(key)) map.set(key, { mes: d.getMonth() + 1, anio: d.getFullYear(), ingresos: 0, gastos: 0 });
    map.get(key)!.ingresos += Number(p.monto);
  }

  for (const g of gastos) {
    const d = new Date(g.fecha);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!map.has(key)) map.set(key, { mes: d.getMonth() + 1, anio: d.getFullYear(), ingresos: 0, gastos: 0 });
    map.get(key)!.gastos += Number(g.monto);
  }

  const cerradosSet = new Set(cierres.map((c) => `${c.anio}-${c.mes}`));

  return Array.from(map.values())
    .map((v) => ({
      mes:           v.mes,
      anio:          v.anio,
      totalIngresos: v.ingresos,
      totalGastos:   v.gastos,
      resultado:     v.ingresos - v.gastos,
      cerrado:       cerradosSet.has(`${v.anio}-${v.mes}`),
    }))
    .sort((a, b) => b.anio - a.anio || b.mes - a.mes);
}
