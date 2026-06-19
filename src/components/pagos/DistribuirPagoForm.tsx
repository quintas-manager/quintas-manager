"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearDistribucionParaPago, type GastoPendienteItem, type DistribucionInput } from "@/lib/actions/pagos";
import { DistribucionStep } from "@/components/pagos/DistribucionStep";

interface Props {
  pagoId: string;
  montoTotalUSD: number;
  gastosPendientes: GastoPendienteItem[];
  reservaId: string;
}

export function DistribuirPagoForm({ pagoId, montoTotalUSD, gastosPendientes, reservaId }: Props) {
  const router = useRouter();

  async function confirmar(dist: DistribucionInput) {
    const result = await crearDistribucionParaPago(pagoId, dist);
    if (result.success) {
      toast.success("Distribución registrada");
      router.push(`/reservas/${result.data.reservaId}`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <DistribucionStep
      montoTotalUSD={montoTotalUSD}
      gastosPendientes={gastosPendientes}
      onConfirmar={confirmar}
      onVolver={() => router.push(`/reservas/${reservaId}`)}
    />
  );
}
