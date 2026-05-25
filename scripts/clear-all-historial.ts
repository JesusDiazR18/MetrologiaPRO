import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Iniciando Limpieza de Historial de Verificaciones ---')
  
  // 1. Obtener conteo inicial
  const countBefore = await prisma.historialVerificacion.count()
  console.log(`Registros de historial encontrados antes del borrado: ${countBefore}`)

  // 2. Eliminar todos los registros del historial
  const deleteResult = await prisma.historialVerificacion.deleteMany()
  console.log(`¡Éxito! Se eliminaron ${deleteResult.count} registros de HistorialVerificacion.`)

  // 3. Resetear los campos de los equipos/instrumentos
  const updateResult = await prisma.instrumentoEquipo.updateMany({
    data: {
      Fecha_Ultima_Verificacion: null,
      Fecha_Proximo_Control: null,
      Estado: 'OPERATIVO',
      Detalles_Estado: null,
      Requiere_Seguimiento: false
    }
  })
  console.log(`¡Éxito! Se resetearon los campos de ${updateResult.count} equipos/instrumentos.`)
  
  console.log('--- Proceso de Limpieza Completado con Éxito ---')
}

main()
  .catch(e => {
    console.error('Error durante la limpieza del historial:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
