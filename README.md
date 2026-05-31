# Quintas Manager

Sistema de gestión de reservas para alquileres de quintas/casas de campo. Construido con Next.js 14 App Router, Prisma 7, NextAuth v5 y Tailwind CSS.

## Requisitos

- Node.js 18+
- PostgreSQL (local o Supabase)
- npm

## Instalación local

```bash
# 1. Clonar e instalar dependencias
git clone <repo-url>
cd quintas-manager
npm install

# 2. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Generar cliente Prisma
npx prisma generate

# 4. Ejecutar migraciones
npx prisma migrate dev --name init

# 5. Poblar con datos de prueba
npm run seed

# 6. Iniciar en desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) — serás redirigido a `/login`.

## Configuración del .env

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/quintas_manager"

# NextAuth — generá un secreto con: openssl rand -base64 32
NEXTAUTH_SECRET="tu-secreto-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

### Con Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings → Database → Connection string → URI**
3. Copiá la cadena de conexión del pooler (puerto 6543):
   ```
   DATABASE_URL="postgresql://postgres.xxx:password@aws-0-xx.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   ```

## Usuarios por defecto (seed)

| Email                  | Contraseña | Rol      |
|------------------------|------------|----------|
| admin@quintas.com      | admin123   | ADMIN    |
| operador@quintas.com   | op123      | OPERATOR |
| supervisor@quintas.com | sup123     | OPERATOR |

**Cambiar contraseñas en Configuración → Usuarios después del primer login.**

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run start      # Servidor de producción
npm run seed       # Poblar base de datos con datos de prueba
npm run db:reset   # Resetear BD y re-sembrar (¡BORRA TODOS LOS DATOS!)
```

## Deploy en Vercel + Supabase

### 1. Preparar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. En **Settings → Database**, copiá la URI del pooler (puerto 6543)

### 2. Deploy en Vercel

Importá el repositorio desde [vercel.com/new](https://vercel.com/new) o usá la CLI:

```bash
npm i -g vercel
vercel login
vercel
```

### 3. Variables de entorno en Vercel

Configurá en el dashboard → Settings → Environment Variables:

| Variable          | Valor                                    |
|-------------------|------------------------------------------|
| `DATABASE_URL`    | URI del pooler de Supabase (puerto 6543) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32`                |
| `NEXTAUTH_URL`    | `https://tu-dominio.vercel.app`          |

### 4. Migraciones en producción

Después del primer deploy, corré las migraciones apuntando a la DB de producción:

```bash
# Con DATABASE_URL de producción en tu .env local
npx prisma migrate deploy
npm run seed
```

## Estructura del proyecto

```
src/
├── app/
│   ├── (dashboard)/          # Rutas autenticadas
│   │   ├── dashboard/        # Métricas y resumen
│   │   ├── reservas/         # CRUD de reservas
│   │   ├── clientes/         # Gestión de clientes
│   │   ├── calendario/       # Vista de calendario (FullCalendar)
│   │   └── configuracion/    # Configuración (solo ADMIN)
│   ├── api/
│   │   ├── auth/             # NextAuth handlers
│   │   ├── clientes/         # Búsqueda autocomplete
│   │   ├── reservas/         # Reservas + disponibilidad
│   │   └── temporadas/       # Consulta de temporada activa
│   └── login/
├── components/
│   ├── calendario/
│   ├── clientes/
│   ├── configuracion/
│   ├── layout/
│   └── reservas/
└── lib/
    ├── actions/              # Server Actions
    ├── auth.ts               # NextAuth config
    ├── prisma.ts             # Prisma client singleton
    └── schemas/              # Esquemas Zod
```

## Stack técnico

- **Framework**: Next.js 14 (App Router, Server Components, Server Actions)
- **Base de datos**: PostgreSQL + Prisma 7
- **Auth**: NextAuth v5 beta — CredentialsProvider + JWT
- **UI**: Tailwind CSS, lucide-react, sonner
- **Forms**: react-hook-form + zod v4
- **Calendario**: FullCalendar v6
- **Deploy**: Vercel + Supabase
