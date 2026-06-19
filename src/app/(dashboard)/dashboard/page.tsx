import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ConfirmarButton } from "@/components/reservas/ConfirmarButton";
import { getTipoCambioBlueSell } from "@/lib/dolar";
import { formatUSD, formatARS } from "@/lib/format";
import {
  Calendar,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  Bell,
  ChevronRight,
  Receipt,
  ArrowDownLeft,
  Cake,
  Home,
} from "lucide-react";
import { GastoPagador } from "@prisma/client";

// ── helpers ───────────────────────────────────────────────────────────────────

function startOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function pct(n: number, d: number) {
  if (d === 0) return 0;
  return Math.round((n / d) * 100);
}

const estadoBadge: Record<string, string> = {
  PENDIENTE:  "bg-yellow-100 text-yellow-700",
  CONFIRMADA: "bg-green-100 text-green-700",
  CANCELADA:  "bg-red-100 text-red-700",
  COMPLETADA: "bg-gray-100 text-gray-600",
};

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const now      = new Date();
  const today    = startOf(now);
  const tomorrow = addDays(today, 1);
  const in7days  = addDays(today, 7);
  const in30days = addDays(today, 30);

  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const diasEnMes = mesFin.getDate();

  // ── queries paralelas ─────────────────────────────────────────────────────

  const PERSONAS_PAGADOR = ["GRACIELA", "MATIAS", "ROCIO"] as const;
  const PERSONA_NOMBRE: Record<string, string> = { GRACIELA: "Graciela", MATIAS: "Matías", ROCIO: "Rocío" };

  const [quintas, reservasMes, proximasReservas, pendientes, reservasMiniCal, gastosMes, reintegrosPendientes, clientesConCumple, tipoCambio, mascotasPendientes] =
    await Promise.all([
      prisma.quinta.findMany({
        where: { activa: true },
        select: { id: true, nombre: true, colorHex: true },
        orderBy: { nombre: "asc" },
      }),

      prisma.reserva.findMany({
        where: {
          estado:      { in: ["PENDIENTE", "CONFIRMADA", "COMPLETADA"] },
          fechaInicio: { lte: mesFin },
          fechaFin:    { gte: mesInicio },
        },
        select: {
          id:          true,
          quintaId:    true,
          estado:      true,
          montoTotal:  true,
          sena:        true,
          fechaInicio: true,
          fechaFin:    true,
          cliente:     { select: { nombre: true, apellido: true } },
          quinta:      { select: { nombre: true, colorHex: true } },
        },
      }),

      prisma.reserva.findMany({
        where: {
          estado:      { in: ["PENDIENTE", "CONFIRMADA"] },
          fechaInicio: { gte: today },
        },
        take: 5,
        orderBy: { fechaInicio: "asc" },
        select: {
          id:          true,
          fechaInicio: true,
          fechaFin:    true,
          estado:      true,
          cliente:     { select: { nombre: true, apellido: true } },
          quinta:      { select: { nombre: true, colorHex: true } },
        },
      }),

      prisma.reserva.findMany({
        where: { estado: "PENDIENTE" },
        orderBy: { fechaInicio: "asc" },
        select: {
          id:          true,
          fechaInicio: true,
          fechaFin:    true,
          montoTotal:  true,
          sena:        true,
          cliente:     { select: { nombre: true, apellido: true } },
          quinta:      { select: { nombre: true, colorHex: true } },
        },
      }),

      prisma.reserva.findMany({
        where: {
          estado:      { in: ["PENDIENTE", "CONFIRMADA"] },
          fechaInicio: { lte: in30days },
          fechaFin:    { gte: today },
        },
        select: {
          fechaInicio: true,
          fechaFin:    true,
          quintaId:    true,
          quinta:      { select: { colorHex: true } },
        },
      }),

      // Gastos del mes por quinta
      prisma.gasto.findMany({
        where: { fecha: { gte: mesInicio, lte: mesFin } },
        select: { quintaId: true, monto: true },
      }),

      // Reintegros pendientes por persona
      prisma.gasto.findMany({
        where: {
          reintegrado: false,
          pagadoPor:   { in: PERSONAS_PAGADOR as unknown as GastoPagador[] },
        },
        select: { pagadoPor: true, monto: true },
      }),

      // Cumpleaños
      prisma.cliente.findMany({
        where: { fechaCumpleanos: { not: null } },
        select: {
          id:              true,
          nombre:          true,
          apellido:        true,
          fechaCumpleanos: true,
          reservas: {
            where: {
              estado:    { in: ["PENDIENTE", "CONFIRMADA"] },
              fechaFin:  { gte: today },
            },
            select: { quinta: { select: { nombre: true, colorHex: true } } },
            take: 1,
          },
        },
      }),

      // Tipo de cambio blue
      getTipoCambioBlueSell(),

      // Mascotas con cargo pendiente
      prisma.reserva.findMany({
        where: {
          tieneMascota:       true,
          cargoMascotaPagado: false,
          estado:             { in: ["PENDIENTE", "CONFIRMADA"] },
        },
        select: {
          id:          true,
          fechaInicio: true,
          cliente:     { select: { nombre: true, apellido: true } },
          quinta:      { select: { nombre: true } },
        },
        orderBy: { fechaInicio: "asc" },
      }),
    ]);

  // ── estadísticas ──────────────────────────────────────────────────────────

  const totalReservasMes = reservasMes.length;

  const ingresosMes = reservasMes
    .filter((r) => r.estado === "CONFIRMADA" || r.estado === "COMPLETADA")
    .reduce((sum, r) => sum + Number(r.montoTotal), 0);

  const proximasSemana = reservasMes.filter(
    (r) => r.fechaInicio >= today && r.fechaInicio < in7days
  ).length;

  const reservasPorQuinta = quintas.map((q) => ({
    ...q,
    count: reservasMes.filter((r) => r.quintaId === q.id).length,
  }));

  const ocupacionPorQuinta = quintas.map((q) => {
    const rq = reservasMes.filter((r) => r.quintaId === q.id);
    let diasOcupados = 0;
    for (const r of rq) {
      const start = r.fechaInicio < mesInicio ? mesInicio : r.fechaInicio;
      const end   = r.fechaFin   > mesFin    ? mesFin    : r.fechaFin;
      const days  = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
      diasOcupados += Math.max(0, days);
    }
    return { ...q, ocupacion: pct(diasOcupados, diasEnMes) };
  });

  // ── alertas ───────────────────────────────────────────────────────────────

  const tomorrowEnd   = addDays(tomorrow, 1);
  const comenzanManana = pendientes.filter(
    (r) => r.fechaInicio >= tomorrow && r.fechaInicio < tomorrowEnd
  );
  // También incluir confirmadas que comienzan mañana
  const confirmManana = proximasReservas.filter(
    (r) => r.estado === "CONFIRMADA" && r.fechaInicio >= tomorrow && r.fechaInicio < tomorrowEnd
  );
  const alertasManana = [
    ...comenzanManana,
    ...confirmManana.filter((c) => !comenzanManana.find((p) => p.id === c.id)),
  ];

  const sinSena = pendientes.filter((r) => !r.sena || Number(r.sena) === 0);

  // ── gastos / reintegros ───────────────────────────────────────────────────

  const gastosPorQuinta = quintas.map((q) => ({
    ...q,
    gastos: gastosMes
      .filter((g) => g.quintaId === q.id)
      .reduce((s, g) => s + Number(g.monto), 0),
  }));
  const totalGastosMes = gastosMes.reduce((s, g) => s + Number(g.monto), 0);

  const reintegrosPorPersona = PERSONAS_PAGADOR.map((p) => ({
    pagador: p,
    nombre:  PERSONA_NOMBRE[p],
    total:   reintegrosPendientes
      .filter((g) => g.pagadoPor === p)
      .reduce((s, g) => s + Number(g.monto), 0),
  })).filter((p) => p.total > 0);

  const totalReintegrosPendientes = reintegrosPorPersona.reduce((s, p) => s + p.total, 0);

  // ── cumpleaños este mes ───────────────────────────────────────────────────

  const cumplesMes = clientesConCumple
    .filter((c) => c.fechaCumpleanos!.getUTCMonth() === now.getMonth())
    .sort((a, b) => a.fechaCumpleanos!.getUTCDate() - b.fechaCumpleanos!.getUTCDate());

  const esCumpleHoy = (d: Date) =>
    d.getUTCDate() === today.getDate() && d.getUTCMonth() === today.getMonth();

  const fmtCumple = (d: Date) =>
    `${d.getUTCDate()} de ${d.toLocaleString("es-AR", { month: "long", timeZone: "UTC" })}`;

  // ── mini calendario ───────────────────────────────────────────────────────

  const calDays: Map<number, string[]> = new Map();
  for (const r of reservasMiniCal) {
    const start = r.fechaInicio < today ? today : r.fechaInicio;
    const end   = r.fechaFin > in30days ? in30days : r.fechaFin;
    let cur = startOf(start);
    while (cur <= end) {
      const offset = Math.round((cur.getTime() - today.getTime()) / 86_400_000);
      if (offset >= 0 && offset < 30) {
        if (!calDays.has(offset)) calDays.set(offset, []);
        const existing = calDays.get(offset)!;
        if (!existing.includes(r.quinta.colorHex)) existing.push(r.quinta.colorHex);
      }
      cur = addDays(cur, 1);
    }
  }

  const calGrid = Array.from({ length: 30 }, (_, i) => ({
    offset: i,
    date:   addDays(today, i),
    colors: calDays.get(i) ?? [],
  }));

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 capitalize">
        {now.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* ── Alertas ── */}
      {(alertasManana.length > 0 || sinSena.length > 0 || mascotasPendientes.length > 0) && (
        <div className="space-y-2">
          {alertasManana.map((r) => (
            <Link
              key={`alerta-manana-${r.id}`}
              href={`/reservas/${r.id}`}
              className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 hover:bg-yellow-100 transition"
            >
              <Bell className="h-4 w-4 shrink-0 text-yellow-500" />
              <span>
                <strong>Mañana comienza</strong> la reserva de{" "}
                <strong>
                  {"cliente" in r ? `${r.cliente.nombre} ${r.cliente.apellido}` : ""}
                </strong>{" "}
                en {"quinta" in r ? r.quinta.nombre : ""}.
              </span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-yellow-400" />
            </Link>
          ))}

          {sinSena.map((r) => (
            <Link
              key={`alerta-sena-${r.id}`}
              href={`/reservas/${r.id}`}
              className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 hover:bg-orange-100 transition"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400" />
              <span>
                Reserva de <strong>{r.cliente.nombre} {r.cliente.apellido}</strong> (
                {fmtDate(r.fechaInicio)}) sin seña registrada.
              </span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-orange-300" />
            </Link>
          ))}

          {mascotasPendientes.map((r) => (
            <Link
              key={`alerta-mascota-${r.id}`}
              href={`/reservas/${r.id}`}
              className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 hover:bg-orange-100 transition"
            >
              <span className="shrink-0 text-base">🐾</span>
              <span>
                <strong>{r.cliente.nombre} {r.cliente.apellido}</strong> ({r.quinta.nombre} · {fmtDate(r.fechaInicio)}) — cargo de mascota pendiente de pago.
              </span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-orange-300" />
            </Link>
          ))}
        </div>
      )}

      {/* ── Cards resumen ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Reservas este mes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-3">
            <Calendar className="h-3.5 w-3.5" />
            Reservas este mes
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalReservasMes}</p>
          <div className="mt-3 space-y-1.5">
            {reservasPorQuinta.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: q.colorHex }}
                  />
                  <span className="text-gray-500 truncate">{q.nombre}</span>
                </div>
                <span className="font-semibold text-gray-700 ml-2">{q.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ingresos este mes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-3">
            <DollarSign className="h-3.5 w-3.5" />
            Ingresos este mes
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-tight break-all">
            {formatUSD(ingresosMes)}
          </p>
          <p className="mt-2 text-xs text-gray-400">confirmadas y completadas</p>
          {tipoCambio > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              TC Blue: {formatARS(tipoCambio)}
            </p>
          )}
        </div>

        {/* Ocupación */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-3">
            <TrendingUp className="h-3.5 w-3.5" />
            Ocupación este mes
          </div>
          <div className="space-y-2.5">
            {ocupacionPorQuinta.map((q) => (
              <div key={q.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: q.colorHex }}
                    />
                    <span className="text-gray-600 truncate">{q.nombre}</span>
                  </div>
                  <span className="font-semibold text-gray-700 ml-2">{q.ocupacion}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(q.ocupacion, 100)}%`,
                      backgroundColor: q.colorHex,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximos 7 días */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-3">
            <Clock className="h-3.5 w-3.5" />
            Próximos 7 días
          </div>
          <p className="text-3xl font-bold text-gray-900">{proximasSemana}</p>
          <p className="mt-1 text-xs text-gray-400">reservas que inician</p>
          {pendientes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-yellow-700">
                {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""} de confirmar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Segunda fila: gastos + reintegros ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Gastos este mes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Receipt className="h-3.5 w-3.5" />
              Gastos este mes
            </div>
            <Link
              href="/gastos"
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Ver gastos →
            </Link>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-tight break-all">
            {formatUSD(totalGastosMes)}
          </p>
          <div className="mt-3 space-y-1.5">
            {gastosPorQuinta.filter((q) => q.gastos > 0).map((q) => (
              <div key={q.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: q.colorHex }}
                  />
                  <span className="text-gray-500 truncate">{q.nombre}</span>
                </div>
                <span className="font-semibold text-gray-700 ml-2">{formatUSD(q.gastos)}</span>
              </div>
            ))}
            {gastosPorQuinta.every((q) => q.gastos === 0) && (
              <p className="text-xs text-gray-400">Sin gastos registrados este mes.</p>
            )}
          </div>
          {ingresosMes > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Rentabilidad estimada</span>
                <span
                  className={
                    ingresosMes - totalGastosMes >= 0
                      ? "font-semibold text-green-600"
                      : "font-semibold text-red-600"
                  }
                >
                  {formatUSD(ingresosMes - totalGastosMes)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Reintegros pendientes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Reintegros pendientes
            </div>
            <Link
              href="/gastos?view=reintegros"
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Gestionar →
            </Link>
          </div>
          {reintegrosPorPersona.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">Sin reintegros pendientes ✓</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 leading-tight break-all">
                {formatUSD(totalReintegrosPendientes)}
              </p>
              <div className="mt-3 space-y-2">
                {reintegrosPorPersona.map((p) => (
                  <div key={p.pagador} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {p.nombre}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatUSD(p.total)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Cumpleaños este mes ── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <Cake className="h-4 w-4 text-pink-400" />
          <h2 className="text-sm font-semibold text-gray-700">Cumpleaños este mes</h2>
          {cumplesMes.length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-100 px-1.5 text-[10px] font-bold text-pink-600">
              {cumplesMes.length}
            </span>
          )}
        </div>

        {cumplesMes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Sin cumpleaños este mes.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {cumplesMes.map((c) => {
              const hoy    = esCumpleHoy(c.fechaCumpleanos!);
              const quinta = c.reservas[0]?.quinta ?? null;
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-50 text-base">
                    🎂
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {c.nombre} {c.apellido}
                    </p>
                    <p className="text-xs text-gray-500">{fmtCumple(c.fechaCumpleanos!)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {quinta && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: quinta.colorHex }}
                        title={`Reserva activa en ${quinta.nombre}`}
                      >
                        <Home className="h-3 w-3" />
                        {quinta.nombre}
                      </span>
                    )}
                    {hoy && (
                      <span className="rounded-full bg-pink-500 px-2.5 py-0.5 text-xs font-bold text-white">
                        ¡Hoy!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Fila: próximas reservas + mini calendario ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Próximas reservas */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Próximas reservas</h2>
            <Link
              href="/reservas"
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Ver todas →
            </Link>
          </div>

          {proximasReservas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">
              No hay reservas próximas.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {proximasReservas.map((r) => (
                <Link
                  key={r.id}
                  href={`/reservas/${r.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition"
                >
                  <div
                    className="h-8 w-1 rounded-full shrink-0"
                    style={{ backgroundColor: r.quinta.colorHex }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {r.cliente.nombre} {r.cliente.apellido}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {r.quinta.nombre} · {fmtDate(r.fechaInicio)} — {fmtDate(r.fechaFin)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      estadoBadge[r.estado] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.estado.charAt(0) + r.estado.slice(1).toLowerCase()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mini calendario */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Próximos 30 días</h2>
            <Link
              href="/calendario"
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Calendario →
            </Link>
          </div>

          <div className="p-4">
            <div className="mb-1 grid grid-cols-7 text-center">
              {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
                <span key={d} className="text-[10px] font-medium text-gray-400 py-0.5">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {/* Leading empty cells to align with day-of-week */}
              {Array.from({ length: today.getDay() }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {calGrid.map((day) => {
                const isToday  = day.offset === 0;
                const occupied = day.colors.length > 0;
                const color    = day.colors[0] ?? null;
                const multiQ   = day.colors.length > 1;

                return (
                  <Link
                    key={day.offset}
                    href="/calendario"
                    className={`relative flex h-8 w-full items-center justify-center rounded-lg text-xs transition hover:opacity-75 ${
                      isToday ? "ring-2 ring-gray-900 ring-offset-1" : ""
                    }`}
                    style={
                      occupied && color
                        ? { backgroundColor: color + "33", color }
                        : undefined
                    }
                  >
                    <span className={occupied ? "font-semibold" : "text-gray-400"}>
                      {day.date.getDate()}
                    </span>
                    {multiQ && day.colors[1] && (
                      <span
                        className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: day.colors[1] }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Leyenda quintas */}
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {quintas.map((q) => (
                <div key={q.id} className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: q.colorHex }}
                  />
                  {q.nombre}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pendientes de confirmación ── */}
      {pendientes.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Pendientes de confirmación{" "}
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-100 px-1.5 text-xs font-medium text-yellow-700">
                {pendientes.length}
              </span>
            </h2>
          </div>

          <div className="divide-y divide-gray-50">
            {pendientes.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className="h-8 w-1 rounded-full shrink-0"
                  style={{ backgroundColor: r.quinta.colorHex }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {r.cliente.nombre} {r.cliente.apellido}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.quinta.nombre} · {fmtDate(r.fechaInicio)} — {fmtDate(r.fechaFin)} ·{" "}
                    {formatUSD(Number(r.montoTotal))}
                    {(!r.sena || Number(r.sena) === 0) && (
                      <span className="ml-1.5 text-orange-500 font-medium">sin seña</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/reservas/${r.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Ver
                  </Link>
                  <ConfirmarButton reservaId={r.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
