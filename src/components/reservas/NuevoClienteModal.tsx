"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { crearCliente } from "@/lib/actions/clientes";
import { clienteSchema, type ClienteFormValues } from "@/lib/schemas/reservas";
import { cn } from "@/lib/utils";

interface ClienteCreado {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

interface Props {
  onClose: () => void;
  onSuccess: (cliente: ClienteCreado) => void;
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-offset-0",
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200"
  );

export function NuevoClienteModal({ onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({ resolver: zodResolver(clienteSchema) });

  // Close on Escape key
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const onSubmit = async (data: ClienteFormValues) => {
    try {
      const result = await crearCliente(data);
      if (result.success) {
        toast.success("Cliente creado correctamente");
        onSuccess(result.data);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Error inesperado al crear el cliente.");
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Nuevo cliente</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Portal renders this outside any outer <form>, so this form is never nested */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" required error={errors.nombre?.message}>
              <input
                {...register("nombre")}
                placeholder="Juan"
                className={inputCls(errors.nombre?.message)}
              />
            </Field>
            <Field label="Apellido" required error={errors.apellido?.message}>
              <input
                {...register("apellido")}
                placeholder="García"
                className={inputCls(errors.apellido?.message)}
              />
            </Field>
          </div>

          <Field label="Teléfono" required error={errors.telefono?.message}>
            <input
              {...register("telefono")}
              placeholder="11-1234-5678"
              className={inputCls(errors.telefono?.message)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                placeholder="juan@email.com"
                className={inputCls(errors.email?.message)}
              />
            </Field>
            <Field label="DNI" error={errors.dni?.message}>
              <input
                {...register("dni")}
                placeholder="12.345.678"
                className={inputCls(errors.dni?.message)}
              />
            </Field>
          </div>

          <Field label="Notas" error={errors.notas?.message}>
            <textarea
              {...register("notas")}
              rows={2}
              placeholder="Información adicional..."
              className={cn(inputCls(errors.notas?.message), "resize-none")}
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
