import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getClientesConDeuda } from "@/lib/actions/pagos";
import { RegistrarPagoForm } from "@/components/pagos/RegistrarPagoForm";

export default async function NuevoPagoPage() {
  const clientes = await getClientesConDeuda();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/reservas"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Registrar pago</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Aplicá un pago a una reserva con saldo pendiente
          </p>
        </div>
      </div>

      <RegistrarPagoForm clientes={clientes} />
    </div>
  );
}
