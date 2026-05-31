"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2, Check, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { actualizarUsuario } from "@/lib/actions/configuracion";
import { cn } from "@/lib/utils";

export interface UsuarioRow {
  id:        string;
  name:      string;
  email:     string;
  role:      string;
  createdAt: string;
}

const schema = z.object({
  name:     z.string().min(1, "Requerido"),
  password: z
    .string()
    .min(6, "Mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
    err
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-gray-400 focus:ring-gray-200",
  );

function UsuarioCard({ usuario }: { usuario: UsuarioRow }) {
  const router  = useRouter();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: usuario.name, password: "" },
  });

  const onSubmit = async (data: FormValues) => {
    const result = await actualizarUsuario(usuario.id, data);
    if (result.success) {
      toast.success("Usuario actualizado");
      router.refresh();
      setEditing(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleCancel = () => {
    reset({ name: usuario.name, password: "" });
    setEditing(false);
  };

  const isAdmin = usuario.role === "ADMIN";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            {isAdmin ? (
              <ShieldCheck className="h-5 w-5 text-gray-600" />
            ) : (
              <User className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{usuario.name}</p>
            <p className="text-xs text-gray-500">{usuario.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              isAdmin
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600",
            )}
          >
            {isAdmin ? "Admin" : "Operador"}
          </span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 transition"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input {...register("name")} className={inputCls(errors.name?.message)} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nueva contraseña{" "}
              <span className="font-normal text-gray-400">(dejar vacío para no cambiar)</span>
            </label>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputCls(errors.password?.message)}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Guardar
            </button>
          </div>
        </form>
      )}

      {!editing && (
        <p className="text-xs text-gray-400">
          Miembro desde{" "}
          {new Date(usuario.createdAt).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

export function UsuariosSection({ usuarios }: { usuarios: UsuarioRow[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Podés cambiar el nombre y contraseña de cada usuario. Los usuarios no se pueden eliminar.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {usuarios.map((u) => (
          <UsuarioCard key={u.id} usuario={u} />
        ))}
      </div>
    </div>
  );
}
