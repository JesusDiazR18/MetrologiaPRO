import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularProximoControl, evaluarPuntos } from '@/lib/metrologia'
import { getSessionFromRequest } from '@/lib/auth'

class ValidationError extends Error {}

function positiveOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Recalcula en servidor el resultado de una calibración/verificación a partir
 * de los puntos medidos. El dictamen del cliente nunca se usa directamente.
 */
function evaluarCalibracion(
  rawPoints: unknown,
  medidaInstrumento: unknown,
  medidaPatron: unknown,
  tolerancia: number
) {
  let puntos: Array<{ patron: unknown; instrumento: unknown }> = []
  if (typeof rawPoints === 'string' && rawPoints.trim()) {
    try { puntos = JSON.parse(rawPoints) } catch { throw new ValidationError('Mediciones_Puntos no es un JSON válido') }
  } else if (Array.isArray(rawPoints)) {
    puntos = rawPoints
  }
  if (!Array.isArray(puntos) || puntos.length === 0) {
    puntos = [{ patron: medidaPatron, instrumento: medidaInstrumento }]
  }

  const ev = evaluarPuntos(puntos, tolerancia)
  if (!ev) throw new ValidationError('Las mediciones del patrón y del instrumento deben ser numéricas')

  const points = ev.points.map(p => ({ ...p, tolerancia }))
  return {
    numInstr: ev.worstInstrumento,
    numPatr: ev.worstPatron,
    variacion: ev.worstVar,
    status: ev.status,
    pointsJson: JSON.stringify(points),
  }
}

/** Trazabilidad: el patrón debe existir y tener su certificado vigente a la fecha de la verificación. */
async function validarPatron(idPatron: unknown, fecha: Date) {
  if (!idPatron || typeof idPatron !== 'string') throw new ValidationError('Debe indicar el patrón de referencia utilizado')
  const patron = await prisma.patronReferencia.findUnique({
    where: { ID_Patron: idPatron },
    select: { Codigo: true, Estado_Vigencia: true, Fecha_Vencimiento_Certificado: true }
  })
  if (!patron) throw new ValidationError('El patrón de referencia indicado no existe')
  const vencido = patron.Fecha_Vencimiento_Certificado
    ? patron.Fecha_Vencimiento_Certificado.getTime() < fecha.getTime()
    : patron.Estado_Vigencia === 'VENCIDO'
  if (vencido) {
    throw new ValidationError(`El patrón ${patron.Codigo} tiene el certificado de calibración vencido; no asegura trazabilidad metrológica`)
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idEquipo = searchParams.get('equipo') ?? ''

    const where = idEquipo ? { FK_ID_Equipo: idEquipo } : {}

    const selectLightHistorial = {
      ID_Log: true,
      FK_ID_Equipo: true,
      Fecha_Ejecucion: true,
      FK_ID_Patron_Usado: true,
      Medida_Instrumento: true,
      Medida_Patron: true,
      Variacion_Calculada: true,
      Resultado_Status: true,
      Tecnico_Ejecutor: true,
      Observaciones: true,
      Tipo_Verificacion: true,
      Acciones_Pendientes: true,
      Estado_Seguimiento: true,
      Magnitud_Controlada: true,
      Mediciones_Puntos: true,
    }

    const [historiales, fileCheck] = await Promise.all([
      prisma.historialVerificacion.findMany({
        where,
        orderBy: { Fecha_Ejecucion: 'desc' },
        select: {
          ...selectLightHistorial,
          equipo: { select: { Nombre_Equipo: true, Codigo_Interno: true } },
          patron: { select: { Nombre_Patron: true, Codigo: true } },
        }
      }),
      prisma.$queryRaw<Array<{ ID_Log: string, Has_PDF: any, Has_Foto: any }>>`
        SELECT "ID_Log", 
               ("PDF_Certificado_interno" IS NOT NULL AND "PDF_Certificado_interno" <> '') AS "Has_PDF", 
               ("Evidencia_Foto" IS NOT NULL AND "Evidencia_Foto" <> '') AS "Has_Foto" 
        FROM "HistorialVerificacion"
      `
    ])

    const histPdfMap = new Map(fileCheck.map(x => [x.ID_Log, !!x.Has_PDF]))
    const histFotoMap = new Map(fileCheck.map(x => [x.ID_Log, !!x.Has_Foto]))

    const processed = historiales.map(h => ({
      ...h,
      PDF_Certificado_interno: histPdfMap.get(h.ID_Log) ? 'dummy_exists' : null,
      Evidencia_Foto: histFotoMap.get(h.ID_Log) ? 'dummy_exists' : null
    }))

    return NextResponse.json(processed)
  } catch (error: any) {
    console.error('[API Historial GET Error]:', error)
    return NextResponse.json({ error: error.message, data: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const session = getSessionFromRequest(request)
    // Firma electrónica: usuario autenticado que registra
    const firma = session
      ? `${session.nombre} <${session.email}> · ${new Date().toISOString()}`
      : null

    const equipo = await prisma.instrumentoEquipo.findUnique({
      where: { ID_Equipo: body.FK_ID_Equipo }
    })
    if (!equipo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

    let createdLog;
    let overallStatus = 'APTO';

    if (body.multimagnitudData && Array.isArray(body.multimagnitudData) && body.multimagnitudData.length > 0) {
      const createdLogs = []
      const tipoVerif = body.Tipo_Verificacion || 'CALIBRACION'
      const isHistorical = Boolean(body.isHistoricalLog)

      for (const item of body.multimagnitudData) {
        let variacion: number | null = null
        let status = 'APTO'
        let numInstr: number | null = null
        let numPatr: number | null = null
        let accionesPendientes = body.Acciones_Pendientes || null
        let estadoSeguimiento = 'N/A'

        if (isHistorical) {
          numInstr = item.Medida_Instrumento !== undefined && item.Medida_Instrumento !== null ? parseFloat(item.Medida_Instrumento) : null
          numPatr = item.Medida_Patron !== undefined && item.Medida_Patron !== null ? parseFloat(item.Medida_Patron) : null
          variacion = item.Variacion_Calculada !== undefined && item.Variacion_Calculada !== null ? parseFloat(item.Variacion_Calculada) : null
          status = item.Resultado_Status || 'APTO'
        } else {
          if (tipoVerif === 'CALIBRACION') {
            await validarPatron(item.FK_ID_Patron_Usado, new Date())
            let magTolerancia = equipo.Tolerancia_Aceptable
            if (equipo.Tolerancias_Multimagnitud) {
              try {
                const map = JSON.parse(equipo.Tolerancias_Multimagnitud)
                if (map[item.Magnitud_Controlada]?.tolerancia) {
                  magTolerancia = parseFloat(map[item.Magnitud_Controlada].tolerancia) || 0
                }
              } catch {}
            }
            const ev = evaluarCalibracion(item.Mediciones_Puntos, item.Medida_Instrumento, item.Medida_Patron, magTolerancia)
            ;({ numInstr, numPatr, variacion, status } = ev)
            item.Mediciones_Puntos = ev.pointsJson
          } else {
            status = item.Resultado_Status || 'OPERATIVO'
            if (accionesPendientes && accionesPendientes.trim().length > 0) {
              estadoSeguimiento = 'PENDIENTE'
              if (status === 'OPERATIVO') status = 'ACCION_PENDIENTE'
            }
          }
        }

        if (status === 'NO_APTO') {
          overallStatus = 'NO_APTO'
        } else if (status === 'ACCION_PENDIENTE' && overallStatus !== 'NO_APTO') {
          overallStatus = 'ACCION_PENDIENTE'
        } else if (status === 'OPERATIVO' && overallStatus !== 'NO_APTO' && overallStatus !== 'ACCION_PENDIENTE') {
          overallStatus = 'OPERATIVO'
        }

        const newLog = await prisma.historialVerificacion.create({
          data: {
            FK_ID_Equipo: body.FK_ID_Equipo,
            Fecha_Ejecucion: body.Fecha_Ejecucion ? new Date(body.Fecha_Ejecucion) : new Date(),
            FK_ID_Patron_Usado: item.FK_ID_Patron_Usado || null,
            Medida_Instrumento: numInstr,
            Medida_Patron: numPatr,
            Variacion_Calculada: variacion,
            Resultado_Status: status,
            Tecnico_Ejecutor: body.Tecnico_Ejecutor || 'Técnico Metrólogo',
            Observaciones: item.Observaciones || body.Observaciones || null,
            Firma_Digital: firma,
            Tipo_Verificacion: tipoVerif,
            Acciones_Pendientes: accionesPendientes,
            Estado_Seguimiento: estadoSeguimiento,
            Evidencia_Foto: body.Evidencia_Foto ?? null,
            Magnitud_Controlada: item.Magnitud_Controlada,
            Mediciones_Puntos: item.Mediciones_Puntos || null
          }
        })
        createdLogs.push(newLog)
      }
      createdLog = createdLogs[0]
    } else {
      if (body.isHistoricalLog) {
        let variacion = body.Variacion_Calculada !== undefined && body.Variacion_Calculada !== null ? parseFloat(body.Variacion_Calculada) : null
        let status = body.Resultado_Status || 'APTO'
        
        let magControlada = body.Magnitud_Controlada
        if (!magControlada && equipo.Magnitud && !equipo.Magnitud.includes(',')) {
          magControlada = equipo.Magnitud
        }

        createdLog = await prisma.historialVerificacion.create({
          data: {
            FK_ID_Equipo: body.FK_ID_Equipo,
            Fecha_Ejecucion: body.Fecha_Ejecucion ? new Date(body.Fecha_Ejecucion) : new Date(),
            FK_ID_Patron_Usado: body.FK_ID_Patron_Usado || null,
            Medida_Patron: body.Medida_Patron !== undefined && body.Medida_Patron !== null ? parseFloat(body.Medida_Patron) : null,
            Medida_Instrumento: body.Medida_Instrumento !== undefined && body.Medida_Instrumento !== null ? parseFloat(body.Medida_Instrumento) : null,
            Variacion_Calculada: variacion,
            Resultado_Status: status,
            Tecnico_Ejecutor: body.Tecnico_Ejecutor || 'Técnico Metrólogo',
            Observaciones: body.Observaciones || 'Registro Histórico / Anterior',
            Tipo_Verificacion: body.Tipo_Verificacion || 'CALIBRACION',
            Acciones_Pendientes: body.Acciones_Pendientes || null,
            Estado_Seguimiento: body.Acciones_Pendientes && body.Acciones_Pendientes.trim().length > 0 ? 'PENDIENTE' : 'N/A',
            Evidencia_Foto: body.Evidencia_Foto ?? null,
            Magnitud_Controlada: magControlada || null,
            Mediciones_Puntos: body.Mediciones_Puntos || null
          }
        })
        overallStatus = status
      } else {
        const tipoVerif = body.Tipo_Verificacion || 'CALIBRACION'
        let variacion: number | null = null
        let status = 'APTO'
        let numInstr: number | null = null
        let numPatr: number | null = null
        let accionesPendientes = body.Acciones_Pendientes || null
        let estadoSeguimiento = 'N/A'

        let pointsJson: string | null = body.Mediciones_Puntos || null
        if (tipoVerif === 'CALIBRACION') {
          await validarPatron(body.FK_ID_Patron_Usado, new Date())
          // Tolerancia aplicada: la indicada en la verificación (p. ej. tras conversión de unidades) o la del equipo
          const toleranciaAplicada = positiveOrNull(body.Tolerancia_Aplicada) || equipo.Tolerancia_Aceptable
          const ev = evaluarCalibracion(body.Mediciones_Puntos, body.Medida_Instrumento, body.Medida_Patron, toleranciaAplicada)
          ;({ numInstr, numPatr, variacion, status, pointsJson } = ev)
        } else {
          status = body.Resultado_Status || 'OPERATIVO'
          if (accionesPendientes && accionesPendientes.trim().length > 0) {
            estadoSeguimiento = 'PENDIENTE'
            if (status === 'OPERATIVO') status = 'ACCION_PENDIENTE'
          }
        }

        let magControlada = body.Magnitud_Controlada
        if (!magControlada && equipo.Magnitud && !equipo.Magnitud.includes(',')) {
          magControlada = equipo.Magnitud
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
            Firma_Digital: firma,
            Tipo_Verificacion: tipoVerif,
            Acciones_Pendientes: accionesPendientes,
            Estado_Seguimiento: estadoSeguimiento,
            Evidencia_Foto: body.Evidencia_Foto ?? null,
            Magnitud_Controlada: magControlada || null,
            Mediciones_Puntos: pointsJson
          }
        })
        overallStatus = status
      }
    }

    // --- RECALCULAR SIEMPRE FECHAS CON EL ÚLTIMO REGISTRO DE VERIFICACIÓN O INGRESO ---
    const lastLog = await prisma.historialVerificacion.findFirst({
      where: { FK_ID_Equipo: body.FK_ID_Equipo },
      orderBy: { Fecha_Ejecucion: 'desc' }
    })

    const ultimaFecha = lastLog ? lastLog.Fecha_Ejecucion : (equipo.Fecha_Ingreso || new Date())
    const proximoControl = calcularProximoControl(ultimaFecha, equipo.Periodicidad_Meses)
    let newEstado = equipo.Estado
    if (!body.isHistoricalLog) {
      newEstado = (overallStatus === 'APTO' || overallStatus === 'OPERATIVO' || overallStatus === 'ACCION_PENDIENTE') ? 'OPERATIVO' : 'NO_APTO'
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[API Historial POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
