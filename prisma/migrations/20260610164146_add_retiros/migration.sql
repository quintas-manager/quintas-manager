-- CreateEnum
CREATE TYPE "RetiroPor" AS ENUM ('GRACIELA', 'MATIAS', 'ROCIO');

-- CreateTable
CREATE TABLE "Retiro" (
    "id" TEXT NOT NULL,
    "quintaId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "realizadoPor" "RetiroPor" NOT NULL,
    "notas" TEXT,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retiro_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Retiro" ADD CONSTRAINT "Retiro_quintaId_fkey" FOREIGN KEY ("quintaId") REFERENCES "Quinta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retiro" ADD CONSTRAINT "Retiro_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
