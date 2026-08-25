import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, differenceInDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  getSmtpConfig, 
  sendQmsEmail, 
  generateWeeklyAlertsHtml, 
  generateMonthlyReportHtml, 
  WeeklyAlertsData, 
  MonthlyReportData,
  AssetAlertItem, 
  PatronAlertItem 
} from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = getSmtpConfig()
  return NextResponse.json({
    configured: config.isConfigured,
    smtpHost: config.host || 'No configurado',
    smtpPort: config.port,
    smtpUser: config.user || 'No configurado',
    targetEmails: config.targetEmails,
    ccEmails: config.ccEmails
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, recipientEmail, sendLive } = body
    const today = new Date()

    // 1. Obtener equipos y patrones
    const [equipos, patrones] = await Promise.all([
      prisma.instrumentoEquipo.findMany({
        where: { Estado: { notIn: ['OBSOLETO', 'DE_BAJA_OBSOLETO', 'BAJA'] } },
        orderBy: { Codigo_Interno: 'asc' }
      }),
      prisma.patronReferencia.findMany({
        orderBy: { Codigo: 'asc' }
      })
    ])

    if (type === 'mensual') {
      const currentMonthStart = startOfMonth(today)
      const currentMonthEnd = endOfMonth(today)
      const mesNombre = format(today, 'MMMM', { locale: es })
      const anio = today.getFullYear()

      const pendientesMesAnterior: AssetAlertItem[] = []
      const programadosMesActual: AssetAlertItem[] = []
      const activosSeguimiento: AssetAlertItem[] = []

      equipos.forEach((e: any) => {
        if (e.Requiere_Seguimiento) {
          activosSeguimiento.push({
            id: e.ID_Equipo,
            codigo: e.Codigo_Interno,
            nombre: e.Nombre_Equipo,
            tipo: e.Tipo,
            area: e.Area_Asignada,
            responsable: e.Responsable,
            fechaProximoControl: e.Fecha_Proximo_Control,
            diasRestantes: e.Fecha_Proximo_Control ? differenceInDays(new Date(e.Fecha_Proximo_Control), today) : 0,
            estado: e.Estado,
            requiereSeguimiento: e.Requiere_Seguimiento,
            periodicidadSeguimiento: e.Periodicidad_Seguimiento
          })
        }

        if (!e.Fecha_Proximo_Control) return

        const fProx = new Date(e.Fecha_Proximo_Control)
        const dias = differenceInDays(fProx, today)

        if (fProx < currentMonthStart || dias < 0 || e.Estado === 'VENCIDO' || e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO') {
          pendientesMesAnterior.push({
            id: e.ID_Equipo,
            codigo: e.Codigo_Interno,
            nombre: e.Nombre_Equipo,
            tipo: e.Tipo,
            area: e.Area_Asignada,
            responsable: e.Responsable,
            fechaProximoControl: e.Fecha_Proximo_Control,
            diasRestantes: dias,
            estado: e.Estado
          })
        } else if (fProx >= currentMonthStart && fProx <= currentMonthEnd) {
          programadosMesActual.push({
            id: e.ID_Equipo,
            codigo: e.Codigo_Interno,
            nombre: e.Nombre_Equipo,
            tipo: e.Tipo,
            area: e.Area_Asignada,
            responsable: e.Responsable,
            fechaProximoControl: e.Fecha_Proximo_Control,
            diasRestantes: dias,
            estado: e.Estado
          })
        }
      })

      const patronesMes: PatronAlertItem[] = []
      patrones.forEach((p: any) => {
        if (!p.Fecha_Vencimiento_Certificado) {
          if (p.Estado_Vigencia !== 'VIGENTE') {
            patronesMes.push({
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

        const fVenc = new Date(p.Fecha_Vencimiento_Certificado)
        const dias = differenceInDays(fVenc, today)

        if (fVenc <= currentMonthEnd || dias <= 30 || p.Estado_Vigencia !== 'VIGENTE') {
          patronesMes.push({
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

      const totalActivos = equipos.length
      const complianceGlobal = totalActivos > 0 ? Math.round(((totalActivos - pendientesMesAnterior.length) / totalActivos) * 100) : 100

      const reportData: MonthlyReportData = {
        mesNombre,
        anio,
        fechaGeneracion: today.toISOString(),
        kpis: {
          totalActivos,
          alDia: totalActivos - pendientesMesAnterior.length,
          pendientesMesAnterior: pendientesMesAnterior.length,
          programadosMesActual: programadosMesActual.length,
          patronesPorVencer: patronesMes.length,
          complianceGlobal
        },
        pendientesMesAnterior,
        programadosMesActual,
        patronesMes,
        activosSeguimiento
      }

      const html = generateMonthlyReportHtml(reportData)
      const subject = `[PRUEBA] 📅 Balance Mensual Metrológico: ${mesNombre.toUpperCase()} ${anio} · ${pendientesMesAnterior.length} Pendientes | ${programadosMesActual.length} Programados`

      let emailResult = null
      if (sendLive) {
        emailResult = await sendQmsEmail({
          to: recipientEmail,
          subject,
          html
        })
      }

      return NextResponse.json({
        success: true,
        type: 'mensual',
        subject,
        html,
        data: reportData,
        emailResult
      })
    } else {
      // type === 'alertas'
      const equiposVencidos: AssetAlertItem[] = []
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
            requiereSeguimiento: e.Requiere_Seguimiento,
            periodicidadSeguimiento: e.Periodicidad_Seguimiento
          })
        }

        if (!e.Fecha_Proximo_Control) return

        const dias = differenceInDays(new Date(e.Fecha_Proximo_Control), today)

        if (dias < 0 || e.Estado === 'VENCIDO' || e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO') {
          equiposVencidos.push({
            id: e.ID_Equipo,
            codigo: e.Codigo_Interno,
            nombre: e.Nombre_Equipo,
            tipo: e.Tipo,
            area: e.Area_Asignada,
            responsable: e.Responsable,
            fechaProximoControl: e.Fecha_Proximo_Control,
            diasRestantes: dias,
            estado: e.Estado
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
            estado: e.Estado
          })
        }
      })

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

      const alertsData: WeeklyAlertsData = {
        fechaGeneracion: today.toISOString(),
        equiposVencidos,
        equiposProximos,
        patronesProximos,
        equiposSeguimiento
      }

      const html = generateWeeklyAlertsHtml(alertsData)
      const subject = `[PRUEBA] ⚠️ Alertas Metrológicas: ${equiposVencidos.length} Vencidos · ${equiposProximos.length} Próximos (≤30d) · ${patronesProximos.length} Patrones`

      let emailResult = null
      if (sendLive) {
        emailResult = await sendQmsEmail({
          to: recipientEmail,
          subject,
          html
        })
      }

      return NextResponse.json({
        success: true,
        type: 'alertas',
        subject,
        html,
        data: alertsData,
        emailResult
      })
    }
  } catch (error: any) {
    console.error('Error en prueba de correo:', error)
    return NextResponse.json({ error: 'Fallo al procesar prueba de correo', details: error.message }, { status: 500 })
  }
}
