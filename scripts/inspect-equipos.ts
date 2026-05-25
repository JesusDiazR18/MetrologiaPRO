import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const equipos = await prisma.instrumentoEquipo.findMany({
    take: 10,
    select: {
      ID_Equipo: true,
      Tipo: true,
      Fecha_Ingreso: true,
      Fecha_Ultima_Verificacion: true,
      Fecha_Proximo_Control: true,
      Estado: true,
      Periodicidad_Meses: true
    }
  })
  console.log(JSON.stringify(equipos, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
