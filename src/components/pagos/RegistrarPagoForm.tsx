"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, X, AlertCircle } from "lucide-react";
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

interface Props {
  clientes: ClienteConDeuda[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const formatFecha = (d: Date) =>
  format(new Date(d), "d MMM yyyy", { locale: es });

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

export function RegistrarPagoForm({ clientes }: Props) {
  const router = useRouter();
  const [query, setQuery]           = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteConDeuda | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<ReservaDeuda | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const filtered = clientes.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.telefono.includes(q)
    );
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCliente(c: ClienteConDeuda) {
    setSelectedCliente(c);
    setSelectedReserva(null);
    setQuery(`${c.nombre} ${c.apellido}`);
    setShowDropdown(false);
    setValue("reservaId", "");
    setValue("monto", 0);
  }

  function selectReserva(r: ReservaDeuda) {
    setSelectedReserva(r);
    setValue("reservaId", r.id);
    setValue("monto", Math.round(r.saldoPendiente * 100) / 100);
  }

  function clearCliente() {
    setSelectedCliente(null);
    setSelectedReserva(null);
    setQuery("");
    setValue("reservaId", "");
    setValue("monto", 0);
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
      {/* ── Buscador de cliente ─────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Cliente con deuda</h2>

        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
                if (selectedCliente) clearCliente();
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscá por nombre o teléfono..."
              className={cn(inputBase, "border-gray-300 focus:border-gray-400 focus:ring-gray-200 pl-9 pr-9")}
            />
            {query && (
              <button
                type="button"
                onClick={clearCliente}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showDropdown && query && !selectedCliente && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">Sin resultados</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCliente(c)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-medium text-gray-900">
                      {c.nombre} {c.apellido}
                    </span>
                    <span className="ml-2 text-gray-500">{c.telefono}</span>
                    <span className="ml-2 text-xs text-red-600">
                      {c.reservasConDeuda.length} reserva{c.reservasConDeuda.length !== 1 ? "s" : ""} con deuda
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {clientes.length === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            No hay clientes con saldo pendiente.
          </div>
        )}
      </section>

      {/* ── Reservas con deuda ──────────────────────────────────────── */}
      {selectedCliente && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Reservas con saldo pendiente
          </h2>
          <div className="space-y-2">
            {selectedCliente.reservasConDeuda.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectReserva(r)}
                className={cn(
                  "w-full text-left rounded-xl border-2 p-4 transition",
                  selectedReserva?.id === r.id
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: r.quintaColor }}
                  />
                  <span className="text-sm font-semibold text-gray-900">{r.quintaNombre}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {formatFecha(r.fechaInicio)} → {formatFecha(r.fechaFin)}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Total</p>
                    <p className="font-medium text-gray-700">{formatMonto(r.montoTotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pagado</p>
                    <p className="font-medium text-gray-700">{formatMonto(r.senaYPagos)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pendiente</p>
                    <p className="font-semibold text-red-600">{formatMonto(r.saldoPendiente)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <FieldError msg={errors.reservaId?.message} />
          <input type="hidden" {...register("reservaId")} />
        </section>
      )}

      {/* ── Datos del pago ──────────────────────────────────────────── */}
      {selectedReserva && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Datos del pago</h2>
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

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedReserva}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar pago
        </button>
      </div>
    </form>
  );
}
