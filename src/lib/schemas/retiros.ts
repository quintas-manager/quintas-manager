import { z } from "zod";

export const retiroSchema = z.object({
  quintaId:     z.string().min(1, "Seleccioná una quinta"),
  realizadoPor: z.enum(["GRACIELA", "MATIAS", "ROCIO"], { required_error: "Seleccioná quién retira" }),
  monto:        z.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha:        z.string().min(1, "La fecha es requerida"),
  notas:        z.string().optional(),
});

export type RetiroFormValues = z.infer<typeof retiroSchema>;
