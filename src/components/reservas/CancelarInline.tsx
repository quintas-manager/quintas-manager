"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CancelarModal } from "./CancelarModal";

export function CancelarInline({
  reservaId,
  clienteNombre,
}: {
  reservaId: string;
  clienteNombre: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white transition"
      >
        Cancelar reserva
      </button>

      {open && (
        <CancelarModal
          reservaId={reservaId}
          clienteNombre={clienteNombre}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.push("/reservas");
          }}
        />
      )}
    </>
  );
}
