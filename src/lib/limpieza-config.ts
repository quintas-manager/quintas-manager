export interface ContactoConfig {
  key:    string;
  nombre: string;
  numero: string;
}

export const CONTACTOS_KEYS: { key: string; nombre: string }[] = [
  { key: "whatsapp_silvana", nombre: "Silvana" },
  { key: "whatsapp_martin",  nombre: "Martín" },
  { key: "whatsapp_matias",  nombre: "Matías" },
  { key: "whatsapp_rocio",   nombre: "Rocío" },
  { key: "whatsapp_german",  nombre: "Germán" },
];
