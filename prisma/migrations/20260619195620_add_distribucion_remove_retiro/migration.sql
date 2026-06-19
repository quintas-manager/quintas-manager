/*
  Warnings:

  - You are about to drop the `Retiro` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Retiro" DROP CONSTRAINT "Retiro_creadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "Retiro" DROP CONSTRAINT "Retiro_quintaId_fkey";

-- DropTable
DROP TABLE "Retiro";

-- DropEnum
DROP TYPE "RetiroPor";

-- CreateTable
CREATE TABLE "Distribucion" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "montoTotalUSD" DECIMAL(10,2) NOT NULL,
    "reintegroMatias" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reintegroGraciela" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "parteMatias" DECIMAL(10,2) NOT NULL,
    "parteGraciela" DECIMAL(10,2) NOT NULL,
    "notas" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Distribucion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Distribucion_pagoId_key" ON "Distribucion"("pagoId");

-- AddForeignKey
ALTER TABLE "Distribucion" ADD CONSTRAINT "Distribucion_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distribucion" ADD CONSTRAINT "Distribucion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
