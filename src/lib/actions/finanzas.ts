"use server";

import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PagoDetalle {
  id: string;
  fecha: string;
  clienteNombre: string;
  reservaFechaInicio: string;
  reservaFechaFin: string;
  monto: number;
  montoARS: number | null;
  tipoCambio: number | null;
  moneda: string;
  metodoPago: string;
}

export interface GastoDetalle {
  id: string;
  fecha: string;
  categoriaNombre: string;
  categoriaId: string;
  descripcion: string;
  monto: number;
  pagadoPor: string;
  notas: string | null;
  quintaId: string;
}

export interface ReintegroDetalle {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
}

export interface DistribucionDetalle {
  id: string;
  pagoId: string;
  fecha: string;
  clienteNombre: string;
  montoTotalUSD: number;
  reintegroMatias: number;
  reintegroGraciela: number;
  parteMatias: number;
  parteGraciela: number;
  notas: string | null;
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
  distribuciones: DistribucionDetalle[];
  totalParteMatias: number;
  totalParteGraciela: number;
  totalReintegroMatias: number;
  totalReintegroGraciela: number;
  reintegrosGraciela: ReintegroDetalle[];
  reintegrosMatias: ReintegroDetalle[];
  totalReintegrosGraciela: number;
  totalReintegrosMatias: number;
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

  const [quinta, pagos, gastos, reintegrosPendientes, mascotasPagadas] = await Promise.all([
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
        distribucion: true,
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
      include: { categoria: { select: { nombre: true, id: true } } },
    }),

    prisma.gasto.findMany({
      where: {
        quintaId,
        reintegrado: false,
        pagadoPor:   { in: ["GRACIELA", "MATIAS"] },
      },
      orderBy: { fecha: "asc" },
    }),

    prisma.reserva.findMany({
      where: {
        quintaId,
        cargoMascotaPagado: true,
        fechaPagoMascota: { gte: inicio, lte: fin },
      },
      select: { cargoMascotaUSD: true },
    }),
  ]);

  const totalMascotaUSD = mascotasPagadas.reduce((s, r) => s + Number(r.cargoMascotaUSD ?? 0), 0);
  const totalIngresos   = pagos.reduce((s, p) => s + Number(p.montoUSD ?? p.monto), 0) + totalMascotaUSD;
  const totalGastos     = gastos.reduce((s, g) => s + Number(g.montoUSD ?? g.monto), 0);
  const resultado       = totalIngresos - totalGastos;

  const distribuciones: DistribucionDetalle[] = pagos
    .filter((p) => p.distribucion)
    .map((p) => ({
      id:                p.distribucion!.id,
      pagoId:            p.id,
      fecha:             fmtDate(p.fecha),
      clienteNombre:     `${p.reserva.cliente.nombre} ${p.reserva.cliente.apellido}`,
      montoTotalUSD:     Number(p.distribucion!.montoTotalUSD),
      reintegroMatias:   Number(p.distribucion!.reintegroMatias),
      reintegroGraciela: Number(p.distribucion!.reintegroGraciela),
      parteMatias:       Number(p.distribucion!.parteMatias),
      parteGraciela:     Number(p.distribucion!.parteGraciela),
      notas:             p.distribucion!.notas,
    }));

  const totalParteMatias       = distribuciones.reduce((s, d) => s + d.parteMatias, 0);
  const totalParteGraciela     = distribuciones.reduce((s, d) => s + d.parteGraciela, 0);
  const totalReintegroMatias   = distribuciones.reduce((s, d) => s + d.reintegroMatias, 0);
  const totalReintegroGraciela = distribuciones.reduce((s, d) => s + d.reintegroGraciela, 0);

  const reintegrosG = reintegrosPendientes.filter((g) => g.pagadoPor === "GRACIELA");
  const reintegrosM = reintegrosPendientes.filter((g) => g.pagadoPor === "MATIAS");
  const totalReintG = reintegrosG.reduce((s, g) => s + Number(g.montoUSD ?? g.monto), 0);
  const totalReintM = reintegrosM.reduce((s, g) => s + Number(g.montoUSD ?? g.monto), 0);

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
      monto:              Number(p.montoUSD ?? p.monto),
      montoARS:           p.montoARS ? Number(p.montoARS) : null,
      tipoCambio:         p.tipoCambio ? Number(p.tipoCambio) : null,
      moneda:             p.moneda ?? "USD",
      metodoPago:         p.metodoPago,
    })),
    totalIngresos,

    gastos: gastos.map((g) => ({
      id:              g.id,
      fecha:           fmtDate(g.fecha),
      categoriaNombre: g.categoria.nombre,
      categoriaId:     g.categoria.id,
      descripcion:     g.descripcion,
      monto:           Number(g.montoUSD ?? g.monto),
      pagadoPor:       g.pagadoPor,
      notas:           g.notas,
      quintaId:        g.quintaId,
    })),
    totalGastos,

    resultado,
    distribuciones,
    totalParteMatias,
    totalParteGraciela,
    totalReintegroMatias,
    totalReintegroGraciela,

    reintegrosGraciela: reintegrosG.map((g) => ({
      id:          g.id,
      fecha:       fmtDate(g.fecha),
      descripcion: g.descripcion,
      monto:       Number(g.montoUSD ?? g.monto),
    })),
    reintegrosMatias: reintegrosM.map((g) => ({
      id:          g.id,
      fecha:       fmtDate(g.fecha),
      descripcion: g.descripcion,
      monto:       Number(g.montoUSD ?? g.monto),
    })),
    totalReintegrosGraciela: totalReintG,
    totalReintegrosMatias:   totalReintM,
  };
}

// ── getMesesConActividad ──────────────────────────────────────────────────────

export interface MesResumen {
  mes: number;
  anio: number;
  totalIngresos: number;
  totalGastos: number;
  resultado: number;
}

export async function getMesesConActividad(quintaId: string): Promise<MesResumen[]> {
  const [pagos, gastos] = await Promise.all([
    prisma.pago.findMany({
      where: { reserva: { quintaId } },
      select: { fecha: true, monto: true, montoUSD: true },
    }),
    prisma.gasto.findMany({
      where: { quintaId },
      select: { fecha: true, monto: true, montoUSD: true },
    }),
  ]);

  const map = new Map<string, { mes: number; anio: number; ingresos: number; gastos: number }>();

  for (const p of pagos) {
    const d = new Date(p.fecha);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!map.has(key)) map.set(key, { mes: d.getMonth() + 1, anio: d.getFullYear(), ingresos: 0, gastos: 0 });
    map.get(key)!.ingresos += Number(p.montoUSD ?? p.monto);
  }

  for (const g of gastos) {
    const d = new Date(g.fecha);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!map.has(key)) map.set(key, { mes: d.getMonth() + 1, anio: d.getFullYear(), ingresos: 0, gastos: 0 });
    map.get(key)!.gastos += Number(g.montoUSD ?? g.monto);
  }

  return Array.from(map.values())
    .map((v) => ({
      mes:           v.mes,
      anio:          v.anio,
      totalIngresos: v.ingresos,
      totalGastos:   v.gastos,
      resultado:     v.ingresos - v.gastos,
    }))
    .sort((a, b) => b.anio - a.anio || b.mes - a.mes);
}
