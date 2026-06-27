import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EditarClienteForm } from "@/components/clientes/EditarClienteForm";
import { EliminarClienteModal } from "@/components/clientes/EliminarClienteModal";
import { ArrowLeft, Calendar, DollarSign, Home } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const estadoBadge: Record<string, string> = {
  PENDIENTE:  "bg-yellow-100 text-yellow-700",
  CONFIRMADA: "bg-green-100 text-green-700",
  CANCELADA:  "bg-red-100 text-red-700",
  COMPLETADA: "bg-gray-100 text-gray-600",
};

export default async function ClienteDetallePage({ params }: PageProps) {
  const { id } = await params;

  const raw = await prisma.cliente.findUnique({
    where: { id },
    include: {
      reservas: {
        orderBy: { fechaInicio: "desc" },
        include: {
          quinta: { select: { nombre: true, colorHex: true } },
        },
      },
    },
  });

  if (!raw) notFound();

  const cliente = raw;

  const reservasActivas = cliente.reservas.filter(
    (r) => r.estado === "CONFIRMADA" || r.estado === "COMPLETADA"
  );

  const montoTotal = reservasActivas.reduce(
    (sum, r) => sum + Number(r.montoTotal),
    0
  );

  // Quinta preferida: the one with most reservas
  const quintaCount: Record<string, { nombre: string; count: number }> = {};
  for (const r of cliente.reservas) {
    if (!quintaCount[r.quintaId]) {
      quintaCount[r.quintaId] = { nombre: r.quinta.nombre, count: 0 };
    }
    quintaCount[r.quintaId].count++;
  }
  const quintaPreferida = Object.values(quintaCount).sort((a, b) => b.count - a.count)[0];

  const fmt = (date: Date) =>
    date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 w-full max-w-4xl overflow-x-hidden px-4">
      {/* Back + delete */}
      <div className="flex items-center justify-between">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
        <EliminarClienteModal
          clienteId={cliente.id}
          nombre={cliente.nombre}
          apellido={cliente.apellido}
          reservasCount={cliente.reservas.length}
          variant="button"
          redirectOnDelete="/clientes"
        />
      </div>

      {/* Name header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {cliente.nombre} {cliente.apellido}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Cliente desde {fmt(cliente.createdAt)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <Calendar className="h-5 w-5 text-blue-600" />
            </span>
            <div>
              <p className="text-xs text-gray-500">Total reservas</p>
              <p className="text-xl font-semibold text-gray-900">{cliente.reservas.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </span>
            <div>
              <p className="text-xs text-gray-500">Monto total (confirmadas)</p>
              <p className="text-xl font-semibold text-gray-900 break-words">{fmtMoney(montoTotal)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
              <Home className="h-5 w-5 text-purple-600" />
            </span>
            <div>
              <p className="text-xs text-gray-500">Quinta preferida</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {quintaPreferida?.nombre ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal data + edit */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <EditarClienteForm
          cliente={{
            id:              cliente.id,
            nombre:          cliente.nombre,
            apellido:        cliente.apellido,
            telefono:        cliente.telefono,
            email:           cliente.email,
            dni:             cliente.dni,
            notas:           cliente.notas,
            fechaCumpleanos: cliente.fechaCumpleanos
              ? cliente.fechaCumpleanos.toISOString().split("T")[0]
              : null,
          }}
        />
      </div>

      {/* Reservation history */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Historial de reservas
          </h2>
        </div>

        {cliente.reservas.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">
            Este cliente no tiene reservas.
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {cliente.reservas.map((r) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: r.quinta.colorHex ?? "#6b7280" }}
                      />
                      <span className="font-medium text-gray-900 truncate">{r.quinta.nombre}</span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        estadoBadge[r.estado] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.estado.charAt(0) + r.estado.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {fmt(r.fechaInicio)} — {fmt(r.fechaFin)}
                    <span className="ml-2 capitalize text-gray-400">
                      · {r.tipoAlquiler.replace("_", " ").toLowerCase()}
                    </span>
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{fmtMoney(Number(r.montoTotal))}</span>
                    <Link
                      href={`/reservas/${r.id}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Quinta</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Fechas</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Monto</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cliente.reservas.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.quinta.colorHex ?? "#6b7280" }}
                          />
                          <span className="font-medium text-gray-900">{r.quinta.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmt(r.fechaInicio)} — {fmt(r.fechaFin)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {r.tipoAlquiler.replace("_", " ").toLowerCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            estadoBadge[r.estado] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {r.estado.charAt(0) + r.estado.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {fmtMoney(Number(r.montoTotal))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reservas/${r.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
