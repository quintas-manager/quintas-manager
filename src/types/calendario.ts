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
  sena: number | null;
  notas: string | null;
  motivoEvento: string | null;
};

export type QuintaBasic = {
  id: string;
  nombre: string;
  colorHex: string;
};
