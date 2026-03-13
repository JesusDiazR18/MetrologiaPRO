import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Iniciando reparación de estados de equipos ---')
  
  // Buscar equipos que deberían estar fuera de servicio buscando en el historial
  // Si tienen un historial reciente con "MOTIVO DE BAJA" o "BAJA MANUAL", deben estar FUERA_DE_SERVICIO
  const historialesBaja = await prisma.historialVerificacion.findMany({
    where: {
      OR: [
        { Observaciones: { contains: 'MOTIVO DE BAJA' } },
        { Observaciones: { contains: 'BAJA MANUAL' } }
      ]
    },
    select: {
      FK_ID_Equipo: true
    }
  })

  const idsEquiposBaja = [...new Set(historialesBaja.map(h => h.FK_ID_Equipo))]
  
  if (idsEquiposBaja.length === 0) {
    console.log('No se encontraron equipos con registros de baja en el historial.')
  } else {
    console.log(`Encontrados ${idsEquiposBaja.length} equipos para marcar como FUERA_DE_SERVICIO: ${idsEquiposBaja.join(', ')}`)
    
    const result = await prisma.instrumentoEquipo.updateMany({
      where: {
        ID_Equipo: { in: idsEquiposBaja }
      },
      data: {
        Estado: 'FUERA_DE_SERVICIO'
      }
    })
    
    console.log(`Actualización completada: ${result.count} equipos actualizados.`)
  }

  // Verificar estado de E-29 específicamente si existe
  const e29 = await prisma.instrumentoEquipo.findUnique({
    where: { ID_Equipo: 'E-29' }
  })
  if (e29) {
    console.log(`Estado actual de E-29: ${e29.Estado}`)
  }

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
