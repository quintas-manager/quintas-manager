export function formatUSD(amount: number): string {
  return `USD ${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatARS(amount: number): string {
  return `$${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_LARGOS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS_SEMANA  = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

/** Short UTC-safe date: "10 jun 2024" */
export function formatFechaReserva(fecha: Date | string): string {
  const d = new Date(fecha);
  return `${d.getUTCDate()} ${MESES_CORTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Long UTC-safe date: "viernes 10 de junio de 2024" */
export function formatFechaReservaLong(fecha: Date | string): string {
  const d    = new Date(fecha);
  const dia  = d.getUTCDate();
  const mes  = d.getUTCMonth();
  const anio = d.getUTCFullYear();
  const dow  = new Date(Date.UTC(anio, mes, dia)).getUTCDay();
  return `${DIAS_SEMANA[dow]} ${dia} de ${MESES_LARGOS[mes]} de ${anio}`;
}

/** "YYYY-MM-DD" from a UTC date, avoids timezone shift */
export function toIsoDateUTC(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}-${String(fecha.getUTCDate()).padStart(2, "0")}`;
}
