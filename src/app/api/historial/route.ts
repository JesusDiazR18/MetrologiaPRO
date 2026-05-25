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
            numInstr = parseFloat(item.Medida_Instrumento)
            numPatr = parseFloat(item.Medida_Patron)
            variacion = calcularVariacion(numInstr, numPatr)
            
            let magTolerancia = equipo.Tolerancia_Aceptable
            if (equipo.Tolerancias_Multimagnitud) {
              try {
                const map = JSON.parse(equipo.Tolerancias_Multimagnitud)
                if (map[item.Magnitud_Controlada]?.tolerancia) {
                  magTolerancia = parseFloat(map[item.Magnitud_Controlada].tolerancia) || 0
                }
              } catch (e) {}
            }
            status = calcularStatus(variacion, magTolerancia)
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
            Firma_Digital: body.Firma_Digital ?? null,
            Tipo_Verificacion: tipoVerif,
            Acciones_Pendientes: accionesPendientes,
            Estado_Seguimiento: estadoSeguimiento,
            Evidencia_Foto: body.Evidencia_Foto ?? null,
            Magnitud_Controlada: item.Magnitud_Controlada
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
            Magnitud_Controlada: magControlada || null
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
            Firma_Digital: body.Firma_Digital ?? null,
            Tipo_Verificacion: tipoVerif,
            Acciones_Pendientes: accionesPendientes,
            Estado_Seguimiento: estadoSeguimiento,
            Evidencia_Foto: body.Evidencia_Foto ?? null,
            Magnitud_Controlada: magControlada || null
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
    console.error('[API Historial POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
