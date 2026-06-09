import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TrendingUp, ArrowRight } from "lucide-react";

export default async function FinanzasPage() {
  const quintas = await prisma.quinta.findMany({
    where:   { activa: true },
    orderBy: { nombre: "asc" },
    select:  { id: true, nombre: true, descripcion: true, colorHex: true, capacidadAdultos: true },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Resumen financiero por quinta</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quintas.map((q) => (
          <Link
            key={q.id}
            href={`/finanzas/${q.id}`}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div
              className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.09] transition-opacity"
              style={{ backgroundColor: q.colorHex }}
            />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white text-lg font-bold shadow-sm"
                    style={{ backgroundColor: q.colorHex }}
                  >
                    {q.nombre.charAt(0)}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{q.nombre}</h2>
                    {q.descripcion && (
                      <p className="text-xs text-gray-500 mt-0.5">{q.descripcion}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>Ver ingresos, gastos y cierres mensuales</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
