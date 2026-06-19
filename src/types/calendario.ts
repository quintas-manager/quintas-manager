export type ReservaEvento = {
  id: string;
  clienteNombre: string;
  clienteApellido: string;
  quintaId: string;
  quintaNombre: string;
  quintaColor: string;
  fechaInicio: string;
  fechaFin: string;
  tipoAlquiler: string;
  estado: string;
  montoTotal: number;
  montoTotalARS: number | null;
  tipoCambioReserva: number | null;
  monedaIngreso: string;
  sena: number | null;
  senaARS: number | null;
  tipoCambioSena: number | null;
  notas: string | null;
  motivoEvento: string | null;
  cantidadPersonas: number | null;
  tieneMascota: boolean;
};

export type QuintaBasic = {
  id: string;
  nombre: string;
  colorHex: string;
};
