import path from 'path'
import type { PrismaConfig } from 'prisma'

export default {
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  migrate: {
    async adapter() {
      const { Pool } = await import('pg')
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const pool = new Pool({ connectionString: process.env.DIRECT_URL })
      return new PrismaPg(pool)
    }
  }
} satisfies PrismaConfig
