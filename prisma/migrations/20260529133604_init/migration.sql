-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "TipoTemporada" AS ENUM ('ALTA', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoAlquiler" AS ENUM ('DIA', 'FIN_DE_SEMANA', 'SEMANA', 'QUINCENA', 'MES');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "GastoPagador" AS ENUM ('CAJA', 'GRACIELA', 'MATIAS', 'ROCIO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quinta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "capacidadAdultos" INTEGER NOT NULL,
    "capacidadNinos" INTEGER NOT NULL DEFAULT 0,
    "colorHex" TEXT NOT NULL DEFAULT '#3b82f6',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quinta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "dni" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Temporada" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoTemporada" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Temporada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporadaQuinta" (
    "temporadaId" TEXT NOT NULL,
    "quintaId" TEXT NOT NULL,

    CONSTRAINT "TemporadaQuinta_pkey" PRIMARY KEY ("temporadaId","quintaId")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "quintaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "tipoAlquiler" "TipoAlquiler" NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "seña" DECIMAL(10,2),
    "notas" TEXT,
    "motivoEvento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioTemporada" (
    "id" TEXT NOT NULL,
    "quintaId" TEXT NOT NULL,
    "temporadaId" TEXT NOT NULL,
    "tipoAlquiler" "TipoAlquiler" NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PrecioTemporada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaGasto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategoriaGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "quintaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "pagadoPor" "GastoPagador" NOT NULL,
    "reintegrado" BOOLEAN NOT NULL DEFAULT false,
    "fechaReintegro" TIMESTAMP(3),
    "comprobante" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PrecioTemporada_quintaId_temporadaId_tipoAlquiler_key" ON "PrecioTemporada"("quintaId", "temporadaId", "tipoAlquiler");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaGasto_nombre_key" ON "CategoriaGasto"("nombre");

-- AddForeignKey
ALTER TABLE "TemporadaQuinta" ADD CONSTRAINT "TemporadaQuinta_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporadaQuinta" ADD CONSTRAINT "TemporadaQuinta_quintaId_fkey" FOREIGN KEY ("quintaId") REFERENCES "Quinta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_quintaId_fkey" FOREIGN KEY ("quintaId") REFERENCES "Quinta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioTemporada" ADD CONSTRAINT "PrecioTemporada_quintaId_fkey" FOREIGN KEY ("quintaId") REFERENCES "Quinta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioTemporada" ADD CONSTRAINT "PrecioTemporada_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_quintaId_fkey" FOREIGN KEY ("quintaId") REFERENCES "Quinta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaGasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
