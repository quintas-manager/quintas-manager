import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getContactos } from "@/lib/actions/limpieza";
import { DetalleCronogramaClient } from "@/components/limpieza/DetalleCronogramaClient";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default async function DetalleCronogramaPage({
  params,
}: {
  params: { id: string };
}) {
  const [cronograma, contactos] = await Promise.all([
    prisma.cronogramaLimpieza.findUnique({
      where: { id: params.id },
      include: {
        creadoPor: { select: { name: true } },
        dias: {
          orderBy: { diaSemana: "asc" },
          include: {
            lugarPrincipal:  { select: { nombre: true } },
            lugarSecundario: { select: { nombre: true } },
          },
        },
      },
    }),
    getContactos(),
  ]);

  if (!cronograma) notFound();

  const lunes   = cronograma.semanaInicio;
  const viernes = addDays(lunes, 4);
  const preview = buildPreview(lunes, viernes, cronograma.dias);

  const diasSerializable = cronograma.dias.map((d) => ({
    diaSemana:       d.diaSemana,
    lugarPrincipal:  d.lugarPrincipal.nombre,
    lugarSecundario: d.lugarSecundario?.nombre ?? null,
    notasSilvana:    d.notasSilvana ?? null,
  }));

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/limpieza"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Semana del{" "}
            {format(lunes, "d 'de' MMMM", { locale: es })}
            {" "}al{" "}
            {format(viernes, "d 'de' MMMM yyyy", { locale: es })}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Creado por {cronograma.creadoPor.name}
            {" · "}
            {format(cronograma.createdAt, "d/MM/yyyy HH:mm", { locale: es })}
          </p>
        </div>
        {!cronograma.enviado && (
          <Link
            href={`/limpieza/${cronograma.id}/editar`}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </Link>
        )}
      </div>

      {/* Estado */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estado</p>
        {cronograma.enviado ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Enviado el {format(cronograma.fechaEnvio!, "d/MM/yyyy 'a las' HH:mm", { locale: es })}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Borrador
          </span>
        )}
      </div>

      {/* Tabla días */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Asignación por día</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {diasSerializable.map((d) => (
            <div
              key={d.diaSemana}
              className="grid grid-cols-[120px_1fr] items-center gap-4 px-5 py-3"
            >
              <span className="text-sm font-medium text-gray-700">
                {DIAS[d.diaSemana - 1]}
              </span>
              <div>
                <span className="text-sm text-gray-600">
                  {d.lugarPrincipal}
                  {d.lugarSecundario && (
                    <span className="text-gray-400"> + {d.lugarSecundario}</span>
                  )}
                </span>
                {d.notasSilvana && (
                  <p className="mt-0.5 text-xs text-orange-600">
                    ⚠️ {d.notasSilvana}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview WhatsApp */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
          Mensaje WhatsApp
        </p>
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
          {preview}
        </pre>
      </div>

      {/* Acciones */}
      <DetalleCronogramaClient
        cronogramaId={cronograma.id}
        enviado={cronograma.enviado}
        fechaEnvio={cronograma.fechaEnvio?.toISOString() ?? null}
        preview={preview}
        contactos={contactos}
      />
    </div>
  );
}

function buildPreview(
  lunes: Date,
  viernes: Date,
  dias: {
    diaSemana: number;
    lugarPrincipal: { nombre: string };
    lugarSecundario: { nombre: string } | null;
    notasSilvana?: string | null;
  }[],
) {
  const fmtD = (d: Date) => format(d, "d 'de' MMMM", { locale: es });
  const lineas = DIAS.map((nombre, i) => {
    const d = dias.find((x) => x.diaSemana === i + 1);
    if (!d) return `${nombre}: —`;
    const sec  = d.lugarSecundario ? ` (+ ${d.lugarSecundario.nombre})` : "";
    const nota = d.notasSilvana?.trim() ? ` ⚠️ Nota: ${d.notasSilvana.trim()}` : "";
    return `${nombre}: ${d.lugarPrincipal.nombre}${sec}${nota}`;
  });
  return `📅 Cronograma de limpieza - semana del ${fmtD(lunes)} al ${fmtD(viernes)}\n\n${lineas.join("\n")}\n\n¡Gracias! 🙏`;
}
