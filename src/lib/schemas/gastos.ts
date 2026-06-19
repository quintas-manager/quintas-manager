import { z } from "zod";

export const gastoSchema = z.object({
  quintaId:    z.string().min(1, "Seleccioná una quinta"),
  categoriaId: z.string().min(1, "Seleccioná una categoría"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  monto:       z.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha:       z.string().min(1, "La fecha es requerida"),
  pagadoPor:   z.enum(["CAJA", "GRACIELA", "MATIAS", "ROCIO"]),
  notas:       z.string().optional(),
  tipoCambio:  z.number().min(0).optional(),
  montoARS:    z.number().min(0).optional(),
});
export type GastoFormValues = z.infer<typeof gastoSchema>;

export const reintegroSchema = z.object({
  fechaReintegro: z.string().min(1, "La fecha de reintegro es requerida"),
});
export type ReintegroFormValues = z.infer<typeof reintegroSchema>;
