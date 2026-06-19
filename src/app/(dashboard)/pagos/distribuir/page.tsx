import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPagoParaDistribucion, getGastosPendientesPorQuinta } from "@/lib/actions/pagos";
import { DistribuirPagoForm } from "@/components/pagos/DistribuirPagoForm";

interface SearchParams { pagoId?: string }

export default async function DistribuirPagoPage({ searchParams }: { searchParams: SearchParams }) {
  const pagoId = searchParams.pagoId;
  if (!pagoId) redirect("/dashboard");

  const pago = await getPagoParaDistribucion(pagoId);
  if (!pago) notFound();

  if (pago.yaDistribuido) redirect(`/reservas/${pago.reservaId}`);

  const gastosPendientes = await getGastosPendientesPorQuinta(pago.quintaId);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/reservas/${pago.reservaId}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Distribuir seña</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pago.clienteNombre} · {pago.quintaNombre}
          </p>
        </div>
      </div>

      <DistribuirPagoForm
        pagoId={pago.id}
        montoTotalUSD={pago.montoUSD}
        gastosPendientes={gastosPendientes}
        reservaId={pago.reservaId}
      />
    </div>
  );
}
