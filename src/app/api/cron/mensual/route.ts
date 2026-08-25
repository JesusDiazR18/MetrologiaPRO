import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, differenceInDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  sendQmsEmail, 
  generateMonthlyReportHtml, 
  MonthlyReportData, 
  AssetAlertItem, 
  PatronAlertItem 
} from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const today = new Date()
    const currentMonthStart = startOfMonth(today)
    const currentMonthEnd = endOfMonth(today)
    const prevMonthStart = startOfMonth(subMonths(today, 1))
    const prevMonthEnd = endOfMonth(subMonths(today, 1))

    const mesNombre = format(today, 'MMMM', { locale: es })
    const anio = today.getFullYear()

    // 1. Obtener todos los equipos e instrumentos activos
    const equipos = await prisma.instrumentoEquipo.findMany({
      where: {
        Estado: { notIn: ['OBSOLETO', 'DE_BAJA_OBSOLETO', 'BAJA'] }
      },
      orderBy: { Codigo_Interno: 'asc' }
    })

    // 2. Obtener patrones
    const patrones = await prisma.patronReferencia.findMany({
      orderBy: { Codigo: 'asc' }
    })

    // 3. Identificar PENDIENTES del mes anterior o anteriores
    const pendientesMesAnterior: AssetAlertItem[] = []
    const programadosMesActual: AssetAlertItem[] = []
    const activosSeguimiento: AssetAlertItem[] = []

    let alDiaCount = 0

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

      // Si la fecha programada era anterior al inicio del mes actual y el equipo no está verificado/al día
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
        // Programado para el mes actual
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
      } else {
        alDiaCount++
      }
    })

    // 4. Identificar Patrones que vencen este mes o ya están vencidos
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

    // 5. KPIs y Métricas
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

    // 6. Generar HTML y Enviar Correo
    const html = generateMonthlyReportHtml(reportData)
    const subject = `📅 Balance Mensual Metrológico: ${mesNombre.toUpperCase()} ${anio} · ${pendientesMesAnterior.length} Pendientes | ${programadosMesActual.length} Programados`

    const sendResult = await sendQmsEmail({
      subject,
      html
    })

    return NextResponse.json({
      success: true,
      data: reportData,
      emailResult: sendResult
    })
  } catch (error: any) {
    console.error('Error en cron mensual:', error)
    return NextResponse.json({ error: 'Fallo al procesar el reporte mensual', details: error.message }, { status: 500 })
  }
}
