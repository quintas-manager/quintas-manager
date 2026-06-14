import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanData() {
  console.log('Limpiando datos de prueba...')

  await prisma.$transaction([
    prisma.pago.deleteMany(),
    prisma.retiro.deleteMany(),
    prisma.gasto.deleteMany(),
    prisma.diaCronograma.deleteMany(),
    prisma.cronogramaLimpieza.deleteMany(),
    prisma.cierreMes.deleteMany(),
    prisma.reserva.deleteMany(),
    prisma.cliente.deleteMany(),
  ])

  console.log('✅ Datos eliminados correctamente.')
  console.log('✅ Se mantuvieron: usuarios, quintas, categorías, lugares de limpieza, configuración.')
}

cleanData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
