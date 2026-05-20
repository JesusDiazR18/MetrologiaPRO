import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSystemReport, calcularSemaforo } from '@/lib/metrologia'

export async function GET() {
  try {
    // Sincronización robusta: Verificar integridad antes de proceder
    await prisma.$queryRaw`SELECT 1`

    // Consulta consolidada y optimizada
    const [equipos, patrones, historiales] = await Promise.all([
      prisma.instrumentoEquipo.findMany({
        include: {
          historiales: {
            orderBy: { Fecha_Ejecucion: 'desc' },
            take: 5,
          }
        },
        orderBy: { Codigo_Interno: 'asc' }
      }),
      prisma.patronReferencia.findMany({
        include: {
          historiales: {
            orderBy: { Fecha_Ejecucion: 'desc' },
            take: 5,
          }
        },
        orderBy: { ID_Patron: 'asc' }
      }),
      prisma.historialVerificacion.findMany({
        orderBy: { Fecha_Ejecucion: 'desc' },
        take: 15,
        include: {
          equipo: { select: { Nombre_Equipo: true, Codigo_Interno: true, Tipo: true } },
        }
      })
    ])

    // Normalizar estado de vigencia para patrones
    const processedPatrones = patrones.map(p => {
      let estado = p.Estado_Vigencia
      if (!p.PDF_Certificado || p.PDF_Certificado.trim() === '') {
        estado = 'SIN CERTIFICADO'
      } else if (p.Fecha_Vencimiento_Certificado && new Date(p.Fecha_Vencimiento_Certificado).getTime() < Date.now()) {
        estado = 'VENCIDO'
      }
      return {
        ...p,
        Estado_Vigencia: estado
      }
    })

    // Generar reporte integral usando el motor de reglas centralizado
    const report = generateSystemReport(equipos, processedPatrones)

    // Identificar Alertas Críticas (Activos que requieren acción inmediata)
    const alertasCriticas = equipos
      .filter(e => (calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'ROJO') || e.Estado === 'NO_APTO')
      .sort((a, b) => {
        return new Date(a.Fecha_Proximo_Control || 0).getTime() - new Date(b.Fecha_Proximo_Control || 0).getTime()
      })
      .slice(0, 5)
      .map(e => ({
        id: e.ID_Equipo,
        codigo: e.Codigo_Interno,
        nombre: e.Nombre_Equipo,
        area: e.Area_Asignada,
        status: calcularSemaforo(e.Fecha_Proximo_Control, e.Estado)
      }))

    const equiposByTipo = [
      { name: 'Equipos', value: equipos.filter(e => e.Tipo === 'EQUIPO').length },
      { name: 'Instrumentos', value: equipos.filter(e => e.Tipo === 'INSTRUMENTO').length },
    ]

    return NextResponse.json({
      ...report,
      equiposByTipo,
      alertasCriticas,
      ultimasVerificaciones: historiales,
      equipos,
      patrones: processedPatrones,
      // Retrocompatibilidad con UI actual
      porciento: report.pctApto,
      alDia: report.alDia,
      proximos: report.proximos,
      vencidos: report.vencidos
    })
  } catch (error: any) {
    console.error('[API Statistics Master Error]:', error)
    return NextResponse.json({ 
      error: 'Anomalía en la generación de reporte estratégico', 
      details: error.message 
    }, { status: 500 })
  }
}

