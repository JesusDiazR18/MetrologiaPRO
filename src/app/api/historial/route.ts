import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularVariacion, calcularStatus, calcularProximoControl } from '@/lib/metrologia'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idEquipo = searchParams.get('equipo') ?? ''

    const where = idEquipo ? { FK_ID_Equipo: idEquipo } : {}
    const historiales = await prisma.historialVerificacion.findMany({
      where,
      orderBy: { Fecha_Ejecucion: 'desc' },
      include: {
        equipo: { select: { Nombre_Equipo: true, Codigo_Interno: true } },
        patron: { select: { Nombre_Patron: true, Codigo: true } },
      }
    })
    return NextResponse.json(historiales)
  } catch (error: any) {
    console.error('[API Historial GET Error]:', error)
    return NextResponse.json({ error: error.message, data: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const equipo = await prisma.instrumentoEquipo.findUnique({
      where: { ID_Equipo: body.FK_ID_Equipo }
    })
    if (!equipo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    let createdLog;
    if (body.isHistoricalLog) {
      createdLog = await prisma.historialVerificacion.create({
        data: {
          FK_ID_Equipo: body.FK_ID_Equipo,
          Fecha_Ejecucion: body.Fecha_Ejecucion ? new Date(body.Fecha_Ejecucion) : new Date(),
          Variacion_Calculada: body.Variacion_Calculada !== undefined ? parseFloat(body.Variacion_Calculada) : null,
          Resultado_Status: body.Resultado_Status || 'APTO',
          Tecnico_Ejecutor: body.Tecnico_Ejecutor || 'Técnico Metrólogo',
          Observaciones: body.Observaciones || 'Registro Histórico / Anterior',
          Tipo_Verificacion: body.Tipo_Verificacion || 'CALIBRACION',
          Estado_Seguimiento: 'N/A'
        }
      })
    } else {
      const tipoVerif = body.Tipo_Verificacion || 'CALIBRACION'
      let variacion: number | null = null
      let status = 'APTO'
      let numInstr: number | null = null
      let numPatr: number | null = null
      let accionesPendientes = body.Acciones_Pendientes || null
      let estadoSeguimiento = 'N/A'

      if (tipoVerif === 'CALIBRACION') {
        numInstr = parseFloat(body.Medida_Instrumento)
        numPatr = parseFloat(body.Medida_Patron)
        variacion = calcularVariacion(numInstr, numPatr)
        status = calcularStatus(variacion, equipo.Tolerancia_Aceptable)
      } else {
        status = body.Resultado_Status || 'OPERATIVO'
        if (accionesPendientes && accionesPendientes.trim().length > 0) {
          estadoSeguimiento = 'PENDIENTE'
          if (status === 'OPERATIVO') status = 'ACCION_PENDIENTE'
        }
      }

      createdLog = await prisma.historialVerificacion.create({
        data: {
          FK_ID_Equipo: body.FK_ID_Equipo,
          FK_ID_Patron_Usado: body.FK_ID_Patron_Usado || null,
          Medida_Instrumento: numInstr,
          Medida_Patron: numPatr,
          Variacion_Calculada: variacion,
          Resultado_Status: status,
          Tecnico_Ejecutor: body.Tecnico_Ejecutor || 'Técnico Metrólogo',
          Observaciones: body.Observaciones ?? null,
          Firma_Digital: body.Firma_Digital ?? null,
          Tipo_Verificacion: tipoVerif,
          Acciones_Pendientes: accionesPendientes,
          Estado_Seguimiento: estadoSeguimiento
        }
      })
    }

    // --- RECALCULAR SIEMPRE FECHAS CON EL ÚLTIMO REGISTRO DE VERIFICACIÓN O INGRESO ---
    const lastLog = await prisma.historialVerificacion.findFirst({
      where: { FK_ID_Equipo: body.FK_ID_Equipo },
      orderBy: { Fecha_Ejecucion: 'desc' }
    })

    const ultimaFecha = lastLog ? lastLog.Fecha_Ejecucion : (equipo.Fecha_Ingreso || new Date())
    const proximoControl = calcularProximoControl(ultimaFecha, equipo.Periodicidad_Meses)
    let newEstado = equipo.Estado
    if (lastLog && !body.isHistoricalLog) {
      newEstado = (lastLog.Resultado_Status === 'APTO' || lastLog.Resultado_Status === 'OPERATIVO' || lastLog.Resultado_Status === 'ACCION_PENDIENTE') ? 'OPERATIVO' : 'NO_APTO'
    }

    await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: body.FK_ID_Equipo },
      data: {
        Fecha_Ultima_Verificacion: ultimaFecha,
        Fecha_Proximo_Control: proximoControl,
        Estado: newEstado,
      }
    })

    return NextResponse.json(createdLog, { status: 201 })
  } catch (error: any) {
    console.error('[API Historial POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
