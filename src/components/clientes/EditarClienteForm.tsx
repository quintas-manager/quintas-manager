"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { actualizarCliente } from "@/lib/actions/clientes";
import { clienteSchema, type ClienteFormValues } from "@/lib/schemas/reservas";
import { cn } from "@/lib/utils";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string | null;
  dni?: string | null;
  notas?: string | null;
  fechaCumpleanos?: string | null;
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
      <label className="block text-xs font-medium text-gray-500 mb-1">
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

export function EditarClienteForm({ cliente }: { cliente: Cliente }) {
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre:          cliente.nombre,
      apellido:        cliente.apellido,
      telefono:        cliente.telefono,
      email:           cliente.email ?? "",
      dni:             cliente.dni ?? "",
      notas:           cliente.notas ?? "",
      fechaCumpleanos: cliente.fechaCumpleanos ?? "",
    },
  });

  const onSubmit = async (data: ClienteFormValues) => {
    const result = await actualizarCliente(cliente.id, data);
    if (result.success) {
      toast.success("Cliente actualizado");
      setEditing(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleCancel = () => {
    reset();
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Datos personales
          </h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Nombre completo</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">
              {cliente.nombre} {cliente.apellido}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Teléfono</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{cliente.telefono}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Email</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{cliente.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">DNI</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{cliente.dni || "—"}</dd>
          </div>
          {cliente.fechaCumpleanos && (
            <div>
              <dt className="text-xs text-gray-500">Cumpleaños</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {new Date(cliente.fechaCumpleanos + "T00:00:00").toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                })}
              </dd>
            </div>
          )}
          {cliente.notas && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Notas</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{cliente.notas}</dd>
            </div>
          )}
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Editar datos
        </h2>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
        >
          <X className="h-3 w-3" />
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre" required error={errors.nombre?.message}>
            <input {...register("nombre")} className={inputCls(errors.nombre?.message)} />
          </Field>
          <Field label="Apellido" required error={errors.apellido?.message}>
            <input {...register("apellido")} className={inputCls(errors.apellido?.message)} />
          </Field>
          <Field label="Teléfono" required error={errors.telefono?.message}>
            <input {...register("telefono")} className={inputCls(errors.telefono?.message)} />
          </Field>
          <Field label="DNI" error={errors.dni?.message}>
            <input {...register("dni")} className={inputCls(errors.dni?.message)} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              className={inputCls(errors.email?.message)}
            />
          </Field>
        </div>

        <Field label="Notas" error={errors.notas?.message}>
          <textarea
            {...register("notas")}
            rows={3}
            className={cn(inputCls(errors.notas?.message), "resize-none")}
          />
        </Field>

        <Field label="Fecha de cumpleaños" error={errors.fechaCumpleanos?.message}>
          <input
            {...register("fechaCumpleanos")}
            type="date"
            className={inputCls(errors.fechaCumpleanos?.message)}
          />
          <p className="mt-1 text-xs text-gray-400">
            Opcional — se usará para mostrar alertas en el dashboard
          </p>
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
