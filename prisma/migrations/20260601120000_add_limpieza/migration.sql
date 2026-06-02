-- CreateTable
CREATE TABLE "LugarLimpieza" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    CONSTRAINT "LugarLimpieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronogramaLimpieza" (
    "id" TEXT NOT NULL,
    "semanaInicio" TIMESTAMP(3) NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvio" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CronogramaLimpieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaCronograma" (
    "id" TEXT NOT NULL,
    "cronogramaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "lugarPrincipalId" TEXT NOT NULL,
    "lugarSecundarioId" TEXT,
    CONSTRAINT "DiaCronograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionApp" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    CONSTRAINT "ConfiguracionApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionApp_clave_key" ON "ConfiguracionApp"("clave");

-- AddForeignKey
ALTER TABLE "CronogramaLimpieza" ADD CONSTRAINT "CronogramaLimpieza_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaCronograma" ADD CONSTRAINT "DiaCronograma_cronogramaId_fkey" FOREIGN KEY ("cronogramaId") REFERENCES "CronogramaLimpieza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaCronograma" ADD CONSTRAINT "DiaCronograma_lugarPrincipalId_fkey" FOREIGN KEY ("lugarPrincipalId") REFERENCES "LugarLimpieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaCronograma" ADD CONSTRAINT "DiaCronograma_lugarSecundarioId_fkey" FOREIGN KEY ("lugarSecundarioId") REFERENCES "LugarLimpieza"("id") ON DELETE SET NULL ON UPDATE CASCADE;
