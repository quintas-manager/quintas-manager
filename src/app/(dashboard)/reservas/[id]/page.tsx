import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, Pencil, PawPrint, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { formatUSD, formatFechaReservaLong } from "@/lib/format";
import { MontoDisplay } from "@/components/ui/MontoDisplay";
import { ConfirmarButton } from "@/components/reservas/ConfirmarButton";
import { CancelarInline } from "@/components/reservas/CancelarInline";
import { ConfirmacionPDF } from "@/components/reservas/ConfirmacionPDF";
import { EliminarReservaButton } from "@/components/reservas/EliminarReservaButton";
import { MarcarMascotaPagadoButton } from "@/components/reservas/MarcarMascotaPagadoButton";
import { formatARS } from "@/lib/format";

const TIPO_LABELS: Record<string, string> = {
  DIA: "Por día", FIN_DE_SEMANA: "Fin de semana",
  SEMANA: "Semana", QUINCENA: "Quincena", MES: "Mes completo",
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  CONFIRMADA: { label: "Confirmada", cls: "bg-green-100 text-green-700 ring-1 ring-green-200" },
  CANCELADA:  { label: "Cancelada",  cls: "bg-red-100 text-red-600 ring-1 ring-red-200" },
  COMPLETADA: { label: "Completada", cls: "bg-blue-100 text-blue-700 ring-1 ring-blue-200" },
};

const formatMonto = formatUSD;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 py-3 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export default async function ReservaDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const reserva = await prisma.reserva.findUnique({
    where: { id: params.id },
    include: {
      quinta:    true,
      cliente:   true,
      creadoPor: { select: { id: true, name: true, role: true } },
      pagos:     { orderBy: { fecha: "asc" }, include: { creadoPor: { select: { name: true } } } },
    },
  });

  if (!reserva) notFound();

  const estado = ESTADO_CONFIG[reserva.estado] ?? ESTADO_CONFIG.PENDIENTE;
  const puedeCancelar = ["PENDIENTE", "CONFIRMADA"].includes(reserva.estado);
  const puedeEditar   = puedeCancelar;
  const puedeConfirmar = reserva.estado === "PENDIENTE";
  const isAdmin = session?.user.role === "ADMIN";

  const totalPagado = reserva.pagos.reduce((acc, p) => acc + Number(p.montoUSD ?? p.monto), 0);
  const saldoPendiente = Number(reserva.montoTotal) - totalPagado;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/reservas"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {reserva.cliente.nombre} {reserva.cliente.apellido}
              </h2>
              <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", estado.cls)}>
                {estado.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {formatFechaReservaLong(reserva.fechaInicio)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {puedeConfirmar && <ConfirmarButton reservaId={reserva.id} />}
          {puedeEditar && (
            <Link
              href={`/reservas/${reserva.id}/editar`}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          )}
          <ConfirmacionPDF
            clienteNombre={reserva.cliente.nombre}
            clienteApellido={reserva.cliente.apellido}
            clienteTelefono={reserva.cliente.telefono}
            clienteEmail={reserva.cliente.email}
            quintaNombre={reserva.quinta.nombre}
            fechaInicio={reserva.fechaInicio.toISOString()}
            fechaFin={reserva.fechaFin.toISOString()}
            cantidadPersonas={reserva.cantidadPersonas}
            tieneMascota={reserva.tieneMascota}
            motivoEvento={reserva.motivoEvento}
            montoTotal={Number(reserva.montoTotal)}
            saldoPendiente={saldoPendiente}
            sena={reserva.sena ? Number(reserva.sena) : null}
          />
        </div>
      </div>

      {/* Quinta card */}
      <div
        className="rounded-xl p-5 flex items-center gap-4"
        style={{ backgroundColor: reserva.quinta.colorHex + "1A" }}
      >
        <span
          className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: reserva.quinta.colorHex }}
        >
          <span className="text-white text-xl font-bold">
            {reserva.quinta.nombre.charAt(0)}
          </span>
        </span>
        <div>
          <p className="font-semibold text-gray-900">{reserva.quinta.nombre}</p>
          {reserva.quinta.descripcion && (
            <p className="text-sm text-gray-600 mt-0.5">{reserva.quinta.descripcion}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {reserva.quinta.capacidadAdultos} adultos
            {reserva.quinta.capacidadNinos > 0 ? ` · ${reserva.quinta.capacidadNinos} niños` : ""}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reserva detalles */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Detalles de la reserva</h3>
          <dl>
            <InfoRow
              label="Ingreso"
              value={
                <span className="capitalize">
                  {formatFechaReservaLong(reserva.fechaInicio)}
                  <span className="ml-1 text-xs text-gray-400 font-normal">a las 14:00 hs</span>
                </span>
              }
            />
            <InfoRow
              label="Egreso"
              value={
                <span className="capitalize">
                  {formatFechaReservaLong(reserva.fechaFin)}
                  <span className="ml-1 text-xs text-gray-400 font-normal">a las 10:00 hs</span>
                </span>
              }
            />
            <InfoRow label="Tipo" value={TIPO_LABELS[reserva.tipoAlquiler] ?? reserva.tipoAlquiler} />
            {reserva.motivoEvento && (
              <InfoRow label="Motivo" value={reserva.motivoEvento} />
            )}
            {reserva.cantidadPersonas && (
              <InfoRow
                label="Personas"
                value={
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {reserva.cantidadPersonas}
                  </span>
                }
              />
            )}
            <InfoRow
              label="Mascota"
              value={
                <span className="flex items-center gap-1">
                  <PawPrint className="h-3.5 w-3.5 text-gray-400" />
                  {reserva.tieneMascota ? "Sí" : "No"}
                </span>
              }
            />
          </dl>
        </div>

        {/* Cliente */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Cliente</h3>
          <dl>
            <InfoRow
              label="Nombre"
              value={`${reserva.cliente.nombre} ${reserva.cliente.apellido}`}
            />
            <InfoRow label="Teléfono" value={reserva.cliente.telefono} />
            {reserva.cliente.email && (
              <InfoRow label="Email" value={reserva.cliente.email} />
            )}
            {reserva.cliente.dni && (
              <InfoRow label="DNI" value={reserva.cliente.dni} />
            )}
          </dl>
        </div>

        {/* Financiero */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Financiero</h3>
          <dl>
            <InfoRow
              label="Monto total"
              value={
                <MontoDisplay
                  montoUSD={Number(reserva.montoTotalUSD ?? reserva.montoTotal)}
                  moneda={reserva.monedaIngreso ?? "USD"}
                  montoARS={reserva.montoTotalARS ? Number(reserva.montoTotalARS) : null}
                  tipoCambio={reserva.tipoCambioReserva ? Number(reserva.tipoCambioReserva) : null}
                />
              }
            />
            <InfoRow
              label="Seña acordada"
              value={
                reserva.sena ? (
                  <MontoDisplay
                    montoUSD={Number(reserva.senaUSD ?? reserva.sena)}
                    moneda={reserva.senaARS ? "ARS" : "USD"}
                    montoARS={reserva.senaARS ? Number(reserva.senaARS) : null}
                    tipoCambio={reserva.tipoCambioSena ? Number(reserva.tipoCambioSena) : null}
                  />
                ) : "—"
              }
            />
            <InfoRow
              label="Total pagado"
              value={formatMonto(totalPagado)}
            />
            <InfoRow
              label="Saldo pendiente"
              value={
                <span className={saldoPendiente > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                  {saldoPendiente > 0 ? formatMonto(saldoPendiente) : "Saldado"}
                </span>
              }
            />
          </dl>
        </div>

        {/* Cargo mascota */}
        {reserva.tieneMascota && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🐾</span>
              <h3 className="text-sm font-semibold text-orange-800">Cargo por mascota</h3>
            </div>
            <div className="space-y-2 text-sm">
              {reserva.cargoMascotaARS && (
                <p className="text-orange-900">
                  {formatARS(Number(reserva.cargoMascotaARS))}
                  {reserva.cargoMascotaUSD && (
                    <span className="ml-2 text-orange-700 text-xs">
                      ({formatUSD(Number(reserva.cargoMascotaUSD))})
                    </span>
                  )}
                </p>
              )}
              {reserva.cargoMascotaPagado ? (
                <p className="flex items-center gap-1.5 text-green-700 font-medium">
                  <span>✅</span> Pagado
                  {reserva.fechaPagoMascota && (
                    <span className="text-xs font-normal text-green-600 ml-1">
                      · {format(reserva.fechaPagoMascota, "d/MM/yyyy", { locale: es })}
                    </span>
                  )}
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="flex items-center gap-1.5 text-orange-700 font-medium">
                    <span>⏳</span> Pendiente de pago
                  </p>
                  <MarcarMascotaPagadoButton reservaId={reserva.id} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Historial</h3>
          <dl>
            <InfoRow
              label="Creada por"
              value={
                <span>
                  {reserva.creadoPor.name}
                  <span className="ml-1 text-xs text-gray-400">
                    ({reserva.creadoPor.role === "ADMIN" ? "Admin" : "Operador"})
                  </span>
                </span>
              }
            />
            <InfoRow
              label="Fecha de creación"
              value={format(reserva.createdAt, "d/MM/yyyy HH:mm", { locale: es })}
            />
            <InfoRow
              label="Última actualización"
              value={format(reserva.updatedAt, "d/MM/yyyy HH:mm", { locale: es })}
            />
          </dl>
        </div>
      </div>

      {/* Notas */}
      {reserva.notas && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Notas</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{reserva.notas}</p>
        </div>
      )}

      {/* Pagos */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Pagos registrados</h3>
          {saldoPendiente > 0 && puedeCancelar && (
            <Link
              href={`/pagos/nueva?reservaId=${reserva.id}&clienteId=${reserva.clienteId}`}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition"
            >
              <Wallet className="h-3.5 w-3.5" />
              Registrar pago
            </Link>
          )}
        </div>

        {reserva.pagos.length === 0 ? (
          <p className="text-sm text-gray-400">No hay pagos registrados aún.</p>
        ) : (
          <div className="space-y-2">
            {reserva.pagos.map((pago) => (
              <div
                key={pago.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
              >
                <div>
                  <MontoDisplay
                    montoUSD={Number(pago.montoUSD ?? pago.monto)}
                    moneda={pago.moneda ?? "USD"}
                    montoARS={pago.montoARS ? Number(pago.montoARS) : null}
                    tipoCambio={pago.tipoCambio ? Number(pago.tipoCambio) : null}
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(pago.fecha, "d/MM/yyyy", { locale: es })} ·{" "}
                    {pago.metodoPago === "EFECTIVO"      && "Efectivo"}
                    {pago.metodoPago === "TRANSFERENCIA" && "Transferencia"}
                    {pago.metodoPago === "TARJETA"       && "Tarjeta"}
                    {pago.metodoPago === "MERCADOPAGO"   && "MercadoPago"}
                    {" · "}{pago.creadoPor.name}
                  </p>
                  {pago.notas && <p className="text-xs text-gray-400 mt-0.5">{pago.notas}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
          <span className="text-gray-500">Saldo pendiente</span>
          <span className={cn("font-semibold", saldoPendiente > 0 ? "text-red-600" : "text-green-600")}>
            {saldoPendiente > 0 ? formatMonto(saldoPendiente) : "Saldado"}
          </span>
        </div>
      </div>

      {/* Cancel zone */}
      {puedeCancelar && (isAdmin || true) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-5">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Zona de riesgo</h3>
          <p className="text-xs text-red-600 mb-3">
            Cancelar una reserva es irreversible. El motivo quedará registrado en las notas.
          </p>
          <CancelarInline
            reservaId={reserva.id}
            clienteNombre={`${reserva.cliente.nombre} ${reserva.cliente.apellido}`}
          />
        </div>
      )}

      {/* Eliminar permanentemente */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Eliminar reserva</h3>
        <p className="text-xs text-gray-500 mb-3">
          Elimina la reserva y todos sus pagos asociados de forma permanente. Esta acción no se puede deshacer.
        </p>
        <EliminarReservaButton reservaId={reserva.id} />
      </div>
    </div>
  );
}
