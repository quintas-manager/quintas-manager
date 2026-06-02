"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { crearCliente } from "@/lib/actions/clientes";
import { clienteSchema, type ClienteFormValues } from "@/lib/schemas/reservas";
import { cn } from "@/lib/utils";

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

export default function NuevoClientePage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({ resolver: zodResolver(clienteSchema) });

  const onSubmit = async (data: ClienteFormValues) => {
    try {
      const result = await crearCliente(data);
      if (result.success) {
        toast.success("Cliente creado correctamente");
        router.push("/clientes");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Error inesperado al crear el cliente.");
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Nuevo cliente</h1>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              rows={3}
              placeholder="Información adicional..."
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

          <div className="flex gap-2 pt-2">
            <Link
              href="/clientes"
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </Link>
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
}
