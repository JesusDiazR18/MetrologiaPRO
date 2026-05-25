import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Iniciando Reparación de Magnitudes en el Historial ---')
  const logs = await prisma.historialVerificacion.findMany({
    where: { Magnitud_Controlada: null },
    include: { equipo: true }
  })
  
  console.log(`Encontrados ${logs.length} registros sin magnitud especificada.`)

  let updatedCount = 0
  for (const log of logs) {
    if (log.equipo.Magnitud && !log.equipo.Magnitud.includes(',')) {
      await prisma.historialVerificacion.update({
        where: { ID_Log: log.ID_Log },
        data: { Magnitud_Controlada: log.equipo.Magnitud }
      })
      updatedCount++
      console.log(`Registro ${log.ID_Log} de equipo ${log.FK_ID_Equipo} actualizado a Magnitud: ${log.equipo.Magnitud}`)
    }
  }

  console.log(`Reparación terminada. Se actualizaron ${updatedCount} registros.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
