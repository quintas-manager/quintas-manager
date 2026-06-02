import { PrismaClient, TipoAlquiler } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const tiposAlquiler: TipoAlquiler[] = [
  TipoAlquiler.DIA,
  TipoAlquiler.FIN_DE_SEMANA,
  TipoAlquiler.SEMANA,
  TipoAlquiler.QUINCENA,
  TipoAlquiler.MES,
];

// Precios en ARS por quinta / temporada / tipo
const PRECIOS = {
  elDescanso: {
    ALTA: { DIA: 50000, FIN_DE_SEMANA: 120000, SEMANA: 350000, QUINCENA: 600000, MES: 1000000 },
    BAJA: { DIA: 30000, FIN_DE_SEMANA:  80000, SEMANA: 220000, QUINCENA: 380000, MES:  650000 },
  },
  laTranquila: {
    ALTA: { DIA: 35000, FIN_DE_SEMANA:  90000, SEMANA: 250000, QUINCENA: 420000, MES:  700000 },
    BAJA: { DIA: 20000, FIN_DE_SEMANA:  55000, SEMANA: 150000, QUINCENA: 270000, MES:  450000 },
  },
} as const;

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Quintas ──────────────────────────────────────────────────────────────
  const elDescanso = await prisma.quinta.upsert({
    where: { id: "quinta-el-descanso" },
    update: {},
    create: {
      id: "quinta-el-descanso",
      nombre: "El Descanso",
      descripcion: "Quinta espaciosa ideal para grupos grandes, rodeada de naturaleza.",
      capacidadAdultos: 6,
      capacidadNinos: 0,
      colorHex: "#16a34a",
      activa: true,
    },
  });

  const laTranquila = await prisma.quinta.upsert({
    where: { id: "quinta-la-tranquila" },
    update: {},
    create: {
      id: "quinta-la-tranquila",
      nombre: "La Tranquila",
      descripcion: "Quinta íntima y acogedora, perfecta para parejas o familias pequeñas.",
      capacidadAdultos: 2,
      capacidadNinos: 1,
      colorHex: "#2563eb",
      activa: true,
    },
  });

  console.log(`  ✔ Quintas: "${elDescanso.nombre}", "${laTranquila.nombre}"`);

  // ── Usuarios ─────────────────────────────────────────────────────────────
  const usuarios = [
    { id: "user-matias",  name: "Matias",  email: "matias@quintas.com",  pass: "matias123",  role: "ADMIN"    as const },
    { id: "user-graciela",name: "Graciela",email: "graciela@quintas.com",pass: "graciela123",role: "OPERATOR" as const },
    { id: "user-rocio",   name: "Rocio",   email: "rocio@quintas.com",   pass: "rocio123",   role: "OPERATOR" as const },
  ];

  for (const u of usuarios) {
    const password = await bcrypt.hash(u.pass, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { id: u.id, name: u.name, email: u.email, password, role: u.role },
    });
    console.log(`  ✔ Usuario: ${u.name} (${u.role})`);
  }

  // ── Temporadas ───────────────────────────────────────────────────────────
  const tempAlta = await prisma.temporada.upsert({
    where: { id: "temp-alta-2025" },
    update: {},
    create: {
      id: "temp-alta-2025",
      nombre: "Temporada Alta 2025",
      tipo: "ALTA",
      fechaInicio: new Date("2025-12-15"),
      fechaFin:    new Date("2026-02-28"),
    },
  });

  const tempBaja = await prisma.temporada.upsert({
    where: { id: "temp-baja-2026" },
    update: {},
    create: {
      id: "temp-baja-2026",
      nombre: "Temporada Baja 2026",
      tipo: "BAJA",
      fechaInicio: new Date("2026-03-01"),
      fechaFin:    new Date("2026-12-14"),
    },
  });

  console.log(`  ✔ Temporadas: "${tempAlta.nombre}", "${tempBaja.nombre}"`);

  // ── Relaciones Temporada ↔ Quinta ─────────────────────────────────────────
  const relaciones = [
    { temporadaId: tempAlta.id, quintaId: elDescanso.id },
    { temporadaId: tempAlta.id, quintaId: laTranquila.id },
    { temporadaId: tempBaja.id, quintaId: elDescanso.id },
    { temporadaId: tempBaja.id, quintaId: laTranquila.id },
  ];

  for (const rel of relaciones) {
    await prisma.temporadaQuinta.upsert({
      where: { temporadaId_quintaId: rel },
      update: {},
      create: rel,
    });
  }

  console.log("  ✔ Relaciones temporada-quinta creadas");

  // ── Precios ───────────────────────────────────────────────────────────────
  const configPrecios = [
    { quintaId: elDescanso.id,  temporadaId: tempAlta.id, tabla: PRECIOS.elDescanso.ALTA  },
    { quintaId: elDescanso.id,  temporadaId: tempBaja.id, tabla: PRECIOS.elDescanso.BAJA  },
    { quintaId: laTranquila.id, temporadaId: tempAlta.id, tabla: PRECIOS.laTranquila.ALTA },
    { quintaId: laTranquila.id, temporadaId: tempBaja.id, tabla: PRECIOS.laTranquila.BAJA },
  ];

  for (const { quintaId, temporadaId, tabla } of configPrecios) {
    for (const tipo of tiposAlquiler) {
      await prisma.precioTemporada.upsert({
        where: { quintaId_temporadaId_tipoAlquiler: { quintaId, temporadaId, tipoAlquiler: tipo } },
        update: {},
        create: {
          quintaId,
          temporadaId,
          tipoAlquiler: tipo,
          precio: tabla[tipo],
        },
      });
    }
  }

  console.log("  ✔ Precios por temporada y tipo de alquiler creados");

  // ── Categorías de gasto ───────────────────────────────────────────────────
  const categorias = [
    "Mantenimiento",
    "Limpieza",
    "Servicios públicos",
    "Insumos y consumibles",
    "Impuestos y tasas",
    "Publicidad",
    "Otros",
  ];

  for (const nombre of categorias) {
    await prisma.categoriaGasto.upsert({
      where: { nombre },
      update: {},
      create: { nombre, activa: true },
    });
  }

  console.log(`  ✔ Categorías de gasto: ${categorias.length} creadas`);

  // ── Lugares de limpieza ───────────────────────────────────────────────────
  const lugaresData = [
    { id: "lugar-el-descanso",   nombre: "El Descanso",   orden: 1 },
    { id: "lugar-la-tranquila",  nombre: "La Tranquila",  orden: 2 },
    { id: "lugar-casa-graciela", nombre: "Casa Graciela", orden: 3 },
    { id: "lugar-casa-matias",   nombre: "Casa Matías",   orden: 4 },
    { id: "lugar-casa-german",   nombre: "Casa Germán",   orden: 5 },
    { id: "lugar-casa-martin",   nombre: "Casa Martín",   orden: 6 },
  ];

  for (const l of lugaresData) {
    await prisma.lugarLimpieza.upsert({
      where: { id: l.id },
      update: {},
      create: { id: l.id, nombre: l.nombre, orden: l.orden, activo: true },
    });
  }

  console.log(`  ✔ Lugares de limpieza: ${lugaresData.length} creados`);

  // ── Configuración app ─────────────────────────────────────────────────────
  await prisma.configuracionApp.upsert({
    where: { clave: "whatsapp_silvana" },
    update: {},
    create: { clave: "whatsapp_silvana", valor: "" },
  });

  console.log("  ✔ Configuración inicial creada");
  console.log("\n✅ Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
