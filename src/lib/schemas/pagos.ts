import { z } from "zod";

export const pagoSchema = z.object({
  reservaId:  z.string().min(1, "Seleccioná una reserva"),
  monto:      z.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha:      z.string().min(1, "La fecha es requerida"),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "MERCADOPAGO"], {
    error: "Seleccioná un método de pago",
  }),
  notas:      z.string().optional(),
  moneda:     z.enum(["USD", "ARS"]).default("USD").optional(),
  tipoCambio: z.number().min(0).optional(),
  montoARS:   z.number().min(0).optional(),
});

export type PagoFormValues = z.infer<typeof pagoSchema>;
