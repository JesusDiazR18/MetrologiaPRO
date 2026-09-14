import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { differenceInDays } from 'date-fns'
import { 
  sendQmsEmail, 
  generateWeeklyAlertsHtml, 
  WeeklyAlertsData, 
  AssetAlertItem, 
  PatronAlertItem 
} from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const today = new Date()

    // 1. Obtener equipos e instrumentos activos
    const equipos = await prisma.instrumentoEquipo.findMany({
      where: {
        Estado: { notIn: ['OBSOLETO', 'DE_BAJA_OBSOLETO', 'BAJA'] }
      },
      orderBy: { Codigo_Interno: 'asc' }
    })

    // 2. Obtener patrones de referencia
    const patrones = await prisma.patronReferencia.findMany({
      orderBy: { Codigo: 'asc' }
    })

    // 3. Filtrar Vencidos, Fuera de Servicio, Próximos a vencer (<= 30 días) y Seguimientos
    const equiposVencidos: AssetAlertItem[] = []
    const equiposFueraDeServicio: AssetAlertItem[] = []
    const equiposProximos: AssetAlertItem[] = []
    const equiposSeguimiento: AssetAlertItem[] = []

    equipos.forEach((e: any) => {
      if (e.Requiere_Seguimiento) {
        equiposSeguimiento.push({
          id: e.ID_Equipo,
          codigo: e.Codigo_Interno,
          nombre: e.Nombre_Equipo,
          tipo: e.Tipo,
          area: e.Area_Asignada,
          responsable: e.Responsable,
          fechaProximoControl: e.Fecha_Proximo_Control,
          diasRestantes: e.Fecha_Proximo_Control ? differenceInDays(new Date(e.Fecha_Proximo_Control), today) : 0,
          estado: e.Estado,
          detallesEstado: e.Detalles_Estado,
          requiereSeguimiento: e.Requiere_Seguimiento,
          periodicidadSeguimiento: e.Periodicidad_Seguimiento
        })
      }

      if (!e.Fecha_Proximo_Control) return

      const dias = differenceInDays(new Date(e.Fecha_Proximo_Control), today)

      // Activos fuera de servicio por falla mecánica o técnica (no vencidos por fecha)
      if (e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'NO_APTO') {
        equiposFueraDeServicio.push({
          id: e.ID_Equipo,
          codigo: e.Codigo_Interno,
          nombre: e.Nombre_Equipo,
          tipo: e.Tipo,
          area: e.Area_Asignada,
          responsable: e.Responsable,
          fechaProximoControl: e.Fecha_Proximo_Control,
          diasRestantes: dias,
          estado: e.Estado,
          detallesEstado: e.Detalles_Estado
        })
        return
      }

      if (dias < 0 || e.Estado === 'VENCIDO') {
        equiposVencidos.push({
          id: e.ID_Equipo,
          codigo: e.Codigo_Interno,
          nombre: e.Nombre_Equipo,
          tipo: e.Tipo,
          area: e.Area_Asignada,
          responsable: e.Responsable,
          fechaProximoControl: e.Fecha_Proximo_Control,
          diasRestantes: dias,
          estado: e.Estado,
          detallesEstado: e.Detalles_Estado
        })
      } else if (dias <= 30) {
        equiposProximos.push({
          id: e.ID_Equipo,
          codigo: e.Codigo_Interno,
          nombre: e.Nombre_Equipo,
          tipo: e.Tipo,
          area: e.Area_Asignada,
          responsable: e.Responsable,
          fechaProximoControl: e.Fecha_Proximo_Control,
          diasRestantes: dias,
          estado: e.Estado,
          detallesEstado: e.Detalles_Estado
        })
      }
    })

    // 4. Filtrar Patrones próximos a vencer (<= 45 días) o vencidos
    const patronesProximos: PatronAlertItem[] = []
    patrones.forEach((p: any) => {
      if (!p.Fecha_Vencimiento_Certificado) {
        if (p.Estado_Vigencia !== 'VIGENTE') {
          patronesProximos.push({
            id: p.ID_Patron,
            codigo: p.Codigo,
            nombre: p.Nombre_Patron,
            laboratorio: p.Proveedor_Laboratorio,
            nCertificado: p.N_Certificado,
            fechaVencimiento: null,
            diasRestantes: -1,
            estadoVigencia: p.Estado_Vigencia
          })
        }
        return
      }

      const dias = differenceInDays(new Date(p.Fecha_Vencimiento_Certificado), today)
      if (dias <= 45 || p.Estado_Vigencia !== 'VIGENTE') {
        patronesProximos.push({
          id: p.ID_Patron,
          codigo: p.Codigo,
          nombre: p.Nombre_Patron,
          laboratorio: p.Proveedor_Laboratorio,
          nCertificado: p.N_Certificado,
          fechaVencimiento: p.Fecha_Vencimiento_Certificado,
          diasRestantes: dias,
          estadoVigencia: p.Estado_Vigencia
        })
      }
    })

    const totalAlerts = equiposVencidos.length + equiposFueraDeServicio.length + equiposProximos.length + patronesProximos.length

    if (totalAlerts === 0 && equiposSeguimiento.length === 0) {
      return NextResponse.json({ 
        message: 'No hay alertas ni seguimientos pendientes en este periodo. No se envió correo.',
        count: 0
      })
    }

    const alertsData: WeeklyAlertsData = {
      fechaGeneracion: today.toISOString(),
      equiposVencidos,
      equiposFueraDeServicio,
      equiposProximos,
      patronesProximos,
      equiposSeguimiento
    }

    const html = generateWeeklyAlertsHtml(alertsData)
    const fueraServicioText = equiposFueraDeServicio.length > 0 ? ` · ${equiposFueraDeServicio.length} Fuera de Servicio` : ''
    const subject = `⚠️ Alertas Metrológicas: ${equiposVencidos.length} Vencidos · ${equiposProximos.length} Próximos (≤30d)${fueraServicioText} · ${patronesProximos.length} Patrones`

    const sendResult = await sendQmsEmail({
      subject,
      html
    })

    return NextResponse.json({
      success: true,
      data: alertsData,
      emailResult: sendResult
    })
  } catch (error: any) {
    console.error('Error en cron alertas:', error)
    return NextResponse.json({ error: 'Fallo al procesar las alertas de metrología', details: error.message }, { status: 500 })
  }
}
