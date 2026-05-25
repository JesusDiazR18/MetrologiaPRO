import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const lastLogs = await prisma.historialVerificacion.findMany({
    take: 5,
    orderBy: { Fecha_Ejecucion: 'desc' },
    include: {
      equipo: true,
      patron: true
    }
  })
  console.log(JSON.stringify(lastLogs, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
