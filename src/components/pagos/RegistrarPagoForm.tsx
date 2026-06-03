"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { pagoSchema, type PagoFormValues } from "@/lib/schemas/pagos";
import { registrarPago } from "@/lib/actions/pagos";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReservaDeuda {
  id: string;
  quintaNombre: string;
  quintaColor: string;
  fechaInicio: Date;
  fechaFin: Date;
  montoTotal: number;
  senaYPagos: number;
  saldoPendiente: number;
}

interface ClienteConDeuda {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  reservasConDeuda: ReservaDeuda[];
}

interface ReservaFlat extends ReservaDeuda {
  clienteId: string;
  clienteNombre: string;
  clienteApellido: string;
}

interface Props {
  clientes: ClienteConDeuda[];
  defaultReservaId?: string;
  defaultClienteId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const formatFecha = (d: Date) =>
  format(new Date(d), "d MMM yy", { locale: es });

const METODO_OPTIONS = [
  { value: "EFECTIVO",      label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA",       label: "Tarjeta" },
  { value: "MERCADOPAGO",   label: "MercadoPago" },
] as const;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-700 mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;
}

const inputBase =
  "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-offset-0";
const inputCls = (err?: string) =>
  cn(
    inputBase,
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200"
  );

// ── Main ──────────────────────────────────────────────────────────────────────

export function RegistrarPagoForm({ clientes, defaultReservaId, defaultClienteId }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedReserva, setSelectedReserva] = useState<ReservaFlat | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      fecha:      new Date().toISOString().split("T")[0],
      metodoPago: "EFECTIVO",
    },
  });

  // Flatten all reservas from all clients
  const todasLasReservas: ReservaFlat[] = clientes.flatMap((c) =>
    c.reservasConDeuda.map((r) => ({
      ...r,
      clienteId:      c.id,
      clienteNombre:  c.nombre,
      clienteApellido: c.apellido,
    }))
  );

  // Pre-select from URL params on mount
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (didAutoSelect.current) return;
    if (!defaultReservaId) return;
    const target = todasLasReservas.find((r) => r.id === defaultReservaId);
    if (target) {
      didAutoSelect.current = true;
      selectReserva(target);
      if (defaultClienteId) {
        const cliente = clientes.find((c) => c.id === defaultClienteId);
        if (cliente) setQuery(`${cliente.nombre} ${cliente.apellido}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter by search query
  const filtered = todasLasReservas.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.clienteNombre.toLowerCase().includes(q) ||
      r.clienteApellido.toLowerCase().includes(q)
    );
  });

  function selectReserva(r: ReservaFlat) {
    setSelectedReserva(r);
    setValue("reservaId", r.id);
    setValue("monto", Math.round(r.saldoPendiente * 100) / 100);
  }

  const onSubmit = async (data: PagoFormValues) => {
    const result = await registrarPago(data);
    if (result.success) {
      toast.success("Pago registrado correctamente");
      router.push(`/reservas/${data.reservaId}`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Tabla de reservas ──────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Reservas con saldo pendiente
          </h2>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre de cliente..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm placeholder-gray-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
            />
          </div>
        </div>

        {todasLasReservas.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">No hay reservas con saldo pendiente.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-gray-400">Sin resultados para &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <>
            {/* ── Desktop table ─────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Cliente", "Quinta", "Fechas", "Total", "Pagado", "Saldo"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((r) => {
                    const selected = selectedReserva?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => selectReserva(r)}
                        className={cn("cursor-pointer transition-colors", selected ? "bg-gray-900 text-white" : "hover:bg-gray-50")}
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {r.clienteNombre} {r.clienteApellido}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.quintaColor }} />
                            <span className={cn(selected ? "text-gray-200" : "text-gray-700")}>{r.quintaNombre}</span>
                          </div>
                        </td>
                        <td className={cn("px-4 py-3 whitespace-nowrap", selected ? "text-gray-300" : "text-gray-600")}>
                          {formatFecha(r.fechaInicio)} → {formatFecha(r.fechaFin)}
                        </td>
                        <td className={cn("px-4 py-3 whitespace-nowrap", selected ? "text-gray-200" : "text-gray-700")}>
                          {formatMonto(r.montoTotal)}
                        </td>
                        <td className={cn("px-4 py-3 whitespace-nowrap", selected ? "text-gray-300" : "text-gray-500")}>
                          {formatMonto(r.senaYPagos)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn("font-semibold", selected ? "text-red-300" : "text-red-600")}>
                            {formatMonto(r.saldoPendiente)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ──────────────────────────── */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((r) => {
                const selected = selectedReserva?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectReserva(r)}
                    className={cn(
                      "w-full text-left px-4 py-4 transition-colors",
                      selected ? "bg-gray-900" : "hover:bg-gray-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn("font-medium truncate", selected ? "text-white" : "text-gray-900")}>
                          {r.clienteNombre} {r.clienteApellido}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.quintaColor }} />
                          <span className={cn("text-xs", selected ? "text-gray-300" : "text-gray-500")}>{r.quintaNombre}</span>
                        </div>
                        <p className={cn("text-xs mt-0.5", selected ? "text-gray-400" : "text-gray-500")}>
                          {formatFecha(r.fechaInicio)} → {formatFecha(r.fechaFin)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs", selected ? "text-gray-400" : "text-gray-500")}>
                          {formatMonto(r.montoTotal)} total
                        </p>
                        <p className={cn("font-semibold", selected ? "text-red-300" : "text-red-600")}>
                          {formatMonto(r.saldoPendiente)}
                        </p>
                        <p className={cn("text-[10px]", selected ? "text-gray-500" : "text-gray-400")}>pendiente</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <FieldError msg={errors.reservaId?.message} />
        <input type="hidden" {...register("reservaId")} />
      </section>

      {/* ── Datos del pago ──────────────────────────────────────── */}
      {selectedReserva && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: selectedReserva.quintaColor }}
            />
            <h2 className="text-sm font-semibold text-gray-900">
              Pago — {selectedReserva.clienteNombre} {selectedReserva.clienteApellido} · {selectedReserva.quintaNombre}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Monto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={selectedReserva.saldoPendiente}
                    {...register("monto", { valueAsNumber: true })}
                    className={cn(inputCls(errors.monto?.message), "pl-7")}
                  />
                </div>
                <FieldError msg={errors.monto?.message} />
                <p className="mt-1 text-xs text-gray-400">
                  Saldo pendiente: {formatMonto(selectedReserva.saldoPendiente)}
                </p>
              </div>
              <div>
                <Label required>Fecha</Label>
                <input
                  type="date"
                  {...register("fecha")}
                  className={inputCls(errors.fecha?.message)}
                />
                <FieldError msg={errors.fecha?.message} />
              </div>
            </div>

            <div>
              <Label required>Método de pago</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {METODO_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-200 p-3 text-sm transition has-[:checked]:border-gray-900 has-[:checked]:bg-gray-50 hover:border-gray-300"
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register("metodoPago")}
                      className="sr-only"
                    />
                    <span className="font-medium text-gray-900">{opt.label}</span>
                  </label>
                ))}
              </div>
              <FieldError msg={errors.metodoPago?.message} />
            </div>

            <div>
              <Label>Notas</Label>
              <textarea
                {...register("notas")}
                rows={2}
                placeholder="Ej: Transferencia bancaria ref. 123..."
                className={cn(inputCls(errors.notas?.message), "resize-none")}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedReserva}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar pago
        </button>
      </div>
    </form>
  );
}
