-- CreateTable
CREATE TABLE "CierreMes" (
    "id" TEXT NOT NULL,
    "quintaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "totalIngresos" DECIMAL(10,2) NOT NULL,
    "totalGastos" DECIMAL(10,2) NOT NULL,
    "resultado" DECIMAL(10,2) NOT NULL,
    "parteGraciela" DECIMAL(10,2) NOT NULL,
    "parteMatias" DECIMAL(10,2) NOT NULL,
    "reintegrosGraciela" DECIMAL(10,2) NOT NULL,
    "reintegrosMatias" DECIMAL(10,2) NOT NULL,
    "cobrarGraciela" DECIMAL(10,2) NOT NULL,
    "cobrarMatias" DECIMAL(10,2) NOT NULL,
    "cerradoPorId" TEXT NOT NULL,
    "fechaCierre" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreMes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CierreMes_quintaId_mes_anio_key" ON "CierreMes"("quintaId", "mes", "anio");

-- AddForeignKey
ALTER TABLE "CierreMes" ADD CONSTRAINT "CierreMes_quintaId_fkey" FOREIGN KEY ("quintaId") REFERENCES "Quinta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreMes" ADD CONSTRAINT "CierreMes_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
