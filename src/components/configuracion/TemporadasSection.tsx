"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  crearTemporada,
  actualizarTemporada,
  eliminarTemporada,
} from "@/lib/actions/configuracion";
import { cn } from "@/lib/utils";

export interface TemporadaRow {
  id:          string;
  nombre:      string;
  tipo:        "ALTA" | "BAJA";
  fechaInicio: string; // ISO date string
  fechaFin:    string;
  quintaIds:   string[];
}

export interface QuintaBasic {
  id:     string;
  nombre: string;
}

const schema = z
  .object({
    nombre:      z.string().min(1, "Requerido"),
    tipo:        z.enum(["ALTA", "BAJA"]),
    fechaInicio: z.string().min(1, "Requerido"),
    fechaFin:    z.string().min(1, "Requerido"),
    quintaIds:   z.array(z.string()),
  })
  .refine((d) => new Date(d.fechaFin) >= new Date(d.fechaInicio), {
    message: "La fecha fin debe ser posterior al inicio",
    path: ["fechaFin"],
  });
type FormValues = z.infer<typeof schema>;

const inputCls = (err?: boolean) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

interface FormProps {
  quintas:      QuintaBasic[];
  initialData?: TemporadaRow;
  onSuccess:    () => void;
  onCancel:     () => void;
}

function TemporadaForm({ quintas, initialData, onSuccess, onCancel }: FormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:      initialData?.nombre ?? "",
      tipo:        initialData?.tipo ?? "ALTA",
      fechaInicio: initialData?.fechaInicio ?? "",
      fechaFin:    initialData?.fechaFin ?? "",
      quintaIds:   initialData?.quintaIds ?? [],
    },
  });

  const quintaIds = watch("quintaIds") as string[];

  const toggleQuinta = (qId: string) => {
    const current = quintaIds ?? [];
    setValue(
      "quintaIds",
      current.includes(qId) ? current.filter((id) => id !== qId) : [...current, qId],
    );
  };

  const onSubmit = async (data: FormValues) => {
    const result = initialData
      ? await actualizarTemporada(initialData.id, data)
      : await crearTemporada(data);

    if (result.success) {
      toast.success(initialData ? "Temporada actualizada" : "Temporada creada");
      router.refresh();
      onSuccess();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
          <input {...register("nombre")} className={inputCls(!!errors.nombre)} />
          {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select {...register("tipo")} className={inputCls()}>
            <option value="ALTA">Alta temporada</option>
            <option value="BAJA">Baja temporada</option>
          </select>
        </div>

        <div />

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
          <input type="date" {...register("fechaInicio")} className={inputCls(!!errors.fechaInicio)} />
          {errors.fechaInicio && (
            <p className="mt-1 text-xs text-red-500">{errors.fechaInicio.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
          <input type="date" {...register("fechaFin")} className={inputCls(!!errors.fechaFin)} />
          {errors.fechaFin && (
            <p className="mt-1 text-xs text-red-500">{errors.fechaFin.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Quintas</label>
        <div className="flex flex-wrap gap-2">
          {quintas.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => toggleQuinta(q.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                quintaIds?.includes(q.id)
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-400",
              )}
            >
              {q.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {initialData ? "Actualizar" : "Crear"}
        </button>
      </div>
    </div>
  );
}

const tipoBadge = {
  ALTA: "bg-orange-100 text-orange-700",
  BAJA: "bg-blue-100 text-blue-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TemporadasSection({
  temporadas,
  quintas,
}: {
  temporadas: TemporadaRow[];
  quintas:    QuintaBasic[];
}) {
  const router  = useRouter();
  const [creating, setCreating]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta temporada? También se eliminarán sus precios asociados.")) return;
    setDeletingId(id);
    const result = await eliminarTemporada(id);
    setDeletingId(null);
    if (result.success) {
      toast.success("Temporada eliminada");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setCreating(true); setEditingId(null); }}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva temporada
        </button>
      </div>

      {creating && (
        <TemporadaForm
          quintas={quintas}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}

      {temporadas.length === 0 && !creating && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No hay temporadas. Creá la primera.
        </div>
      )}

      <div className="space-y-3">
        {temporadas.map((t) => (
          <div key={t.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {editingId === t.id ? (
              <div className="p-4">
                <TemporadaForm
                  quintas={quintas}
                  initialData={t}
                  onSuccess={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{t.nombre}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${tipoBadge[t.tipo]}`}
                    >
                      {t.tipo === "ALTA" ? "Alta" : "Baja"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {fmtDate(t.fechaInicio)} — {fmtDate(t.fechaFin)}
                  </p>
                  {t.quintaIds.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.quintaIds.length === quintas.length
                        ? "Todas las quintas"
                        : `${t.quintaIds.length} quinta${t.quintaIds.length !== 1 ? "s" : ""}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingId(t.id); setCreating(false); }}
                    className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {deletingId === t.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
