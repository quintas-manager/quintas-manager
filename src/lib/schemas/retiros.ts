import { z } from "zod";

export const retiroSchema = z.object({
  quintaId:     z.string().min(1, "Seleccioná una quinta"),
  realizadoPor: z.enum(["GRACIELA", "MATIAS", "ROCIO"]),
  monto:        z.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha:        z.string().min(1, "La fecha es requerida"),
  notas:        z.string().optional(),
  tipoCambio:   z.number().min(0).optional(),
  montoARS:     z.number().min(0).optional(),
});

export type RetiroFormValues = z.infer<typeof retiroSchema>;
