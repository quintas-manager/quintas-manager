-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "montoARS" DECIMAL(10,2),
ADD COLUMN     "montoUSD" DECIMAL(10,2),
ADD COLUMN     "tipoCambio" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "moneda" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "montoARS" DECIMAL(10,2),
ADD COLUMN     "montoUSD" DECIMAL(10,2),
ADD COLUMN     "tipoCambio" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "monedaIngreso" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "montoTotalARS" DECIMAL(10,2),
ADD COLUMN     "montoTotalUSD" DECIMAL(10,2),
ADD COLUMN     "senaARS" DECIMAL(10,2),
ADD COLUMN     "senaUSD" DECIMAL(10,2),
ADD COLUMN     "tipoCambioReserva" DECIMAL(10,2),
ADD COLUMN     "tipoCambioSena" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Retiro" ADD COLUMN     "montoARS" DECIMAL(10,2),
ADD COLUMN     "montoUSD" DECIMAL(10,2),
ADD COLUMN     "tipoCambio" DECIMAL(10,2);
