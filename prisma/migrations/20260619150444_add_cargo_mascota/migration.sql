-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "cargoMascotaARS" DECIMAL(10,2),
ADD COLUMN     "cargoMascotaPagado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cargoMascotaUSD" DECIMAL(10,2),
ADD COLUMN     "fechaPagoMascota" TIMESTAMP(3);
