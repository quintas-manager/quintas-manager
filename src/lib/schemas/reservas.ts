import { z } from "zod";

export const reservaSchema = z
  .object({
    quintaId:         z.string().min(1, "Seleccioná una quinta"),
    clienteId:        z.string().min(1, "Seleccioná un cliente"),
    fechaInicio:      z.string().min(1, "La fecha de inicio es requerida"),
    fechaFin:         z.string().min(1, "La fecha de fin es requerida"),
    tipoAlquiler:     z.enum(["DIA", "FIN_DE_SEMANA", "SEMANA", "QUINCENA", "MES"], {
      error: "Seleccioná un tipo de alquiler",
    }),
    estado:           z.enum(["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"]),
    montoTotal:       z.number().min(1, "El monto debe ser mayor a 0"),
    sena:             z.number().min(0).nullable().optional(),
    motivoEvento:     z.string().optional(),
    notas:            z.string().optional(),
    tieneMascota:     z.boolean().optional(),
    cantidadPersonas: z.number().int().min(1).nullable().optional(),
    metodoPagoSeña:   z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "MERCADOPAGO"]).optional(),
  })
  .refine((d) => new Date(d.fechaFin) >= new Date(d.fechaInicio), {
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
    path: ["fechaFin"],
  });

export type ReservaFormValues = z.infer<typeof reservaSchema>;

export const cancelarSchema = z.object({
  motivo: z.string().min(10, "Describí el motivo (mínimo 10 caracteres)"),
});
export type CancelarFormValues = z.infer<typeof cancelarSchema>;

export const clienteSchema = z.object({
  nombre:          z.string().min(1, "El nombre es requerido"),
  apellido:        z.string().min(1, "El apellido es requerido"),
  telefono:        z.string().min(1, "El teléfono es requerido"),
  email:           z.string().email("Email inválido").optional().or(z.literal("")),
  dni:             z.string().optional(),
  notas:           z.string().optional(),
  fechaCumpleanos: z.string().optional(),
});
export type ClienteFormValues = z.infer<typeof clienteSchema>;
