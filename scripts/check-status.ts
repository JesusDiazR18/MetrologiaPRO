import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const totalEquipos = await prisma.instrumentoEquipo.count()
  const totalInstrumentos = await prisma.instrumentoEquipo.count({ where: { Tipo: 'INSTRUMENTO' } })
  const totalEquiposSolo = await prisma.instrumentoEquipo.count({ where: { Tipo: 'EQUIPO' } })
  const totalHistorial = await prisma.historialVerificacion.count()
  
  console.log('--- Resumen de la Base de Datos ---')
  console.log(`Total Equipos/Instrumentos (InstrumentoEquipo): ${totalEquipos}`)
  console.log(` - De Tipo 'INSTRUMENTO': ${totalInstrumentos}`)
  console.log(` - De Tipo 'EQUIPO': ${totalEquiposSolo}`)
  console.log(`Total Historial de Verificaciones: ${totalHistorial}`)

  const estados = await prisma.instrumentoEquipo.groupBy({
    by: ['Estado'],
    _count: true
  })
  console.log('\nEquipos por Estado:')
  estados.forEach(e => {
    console.log(` - ${e.Estado}: ${e._count}`)
  })
  
  const ultimosHistoriales = await prisma.historialVerificacion.findMany({
    take: 5,
    orderBy: { Fecha_Ejecucion: 'desc' },
    select: {
      ID_Log: true,
      FK_ID_Equipo: true,
      Fecha_Ejecucion: true,
      Resultado_Status: true,
      Tipo_Verificacion: true
    }
  })
  console.log('\nÚltimos 5 registros en el historial:')
  ultimosHistoriales.forEach(h => {
    console.log(` - [${h.Fecha_Ejecucion.toISOString()}] Equipo: ${h.FK_ID_Equipo}, Status: ${h.Resultado_Status}, Tipo: ${h.Tipo_Verificacion}`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
