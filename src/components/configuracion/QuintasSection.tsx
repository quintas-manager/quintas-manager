"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Power, Save } from "lucide-react";
import { toast } from "sonner";
import { actualizarQuinta, toggleActivaQuinta } from "@/lib/actions/configuracion";
import { cn } from "@/lib/utils";

export interface QuintaRow {
  id:               string;
  nombre:           string;
  descripcion:      string | null;
  capacidadAdultos: number;
  capacidadNinos:   number;
  colorHex:         string;
  activa:           boolean;
}

const schema = z.object({
  nombre:           z.string().min(1, "Requerido"),
  descripcion:      z.string().optional(),
  capacidadAdultos: z.number().int().min(1, "Mínimo 1"),
  capacidadNinos:   z.number().int().min(0),
  colorHex:         z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
});
type FormValues = z.infer<typeof schema>;

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

function QuintaCard({ quinta }: { quinta: QuintaRow }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:           quinta.nombre,
      descripcion:      quinta.descripcion ?? "",
      capacidadAdultos: quinta.capacidadAdultos,
      capacidadNinos:   quinta.capacidadNinos,
      colorHex:         quinta.colorHex,
    },
  });

  const colorHex = watch("colorHex");

  const onSubmit = async (data: FormValues) => {
    const result = await actualizarQuinta(quinta.id, data);
    if (result.success) {
      toast.success("Quinta actualizada");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const result = await toggleActivaQuinta(quinta.id, !quinta.activa);
    setToggling(false);
    if (result.success) {
      toast.success(quinta.activa ? "Quinta desactivada" : "Quinta activada");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 transition",
        quinta.activa ? "border-gray-200" : "border-gray-200 opacity-60",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full border border-white shadow"
            style={{ backgroundColor: colorHex }}
          />
          <span className="text-sm font-semibold text-gray-800">{quinta.nombre}</span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50",
            quinta.activa
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-green-200 text-green-600 hover:bg-green-50",
          )}
        >
          {toggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Power className="h-3 w-3" />
          )}
          {quinta.activa ? "Desactivar" : "Activar"}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input {...register("nombre")} className={inputCls(errors.nombre?.message)} />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Capacidad adultos
            </label>
            <input
              type="number"
              inputMode="numeric"
              {...register("capacidadAdultos", { valueAsNumber: true })}
              className={inputCls(errors.capacidadAdultos?.message)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Capacidad niños
            </label>
            <input
              type="number"
              inputMode="numeric"
              {...register("capacidadNinos", { valueAsNumber: true })}
              className={inputCls(errors.capacidadNinos?.message)}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea
              {...register("descripcion")}
              rows={2}
              className={cn(inputCls(), "resize-none")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                {...register("colorHex")}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-300 p-0.5"
              />
              <input
                {...register("colorHex")}
                maxLength={7}
                className={cn(inputCls(errors.colorHex?.message), "font-mono uppercase")}
              />
            </div>
            {errors.colorHex && (
              <p className="mt-1 text-xs text-red-500">{errors.colorHex.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-40"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

export function QuintasSection({ quintas }: { quintas: QuintaRow[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {quintas.map((q) => (
        <QuintaCard key={q.id} quinta={q} />
      ))}
    </div>
  );
}
