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

    const proximoControl = calcularProximoControl(new Date(), equipo.Periodicidad_Meses)

    const log = await prisma.historialVerificacion.create({
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

    // Update equipo's dates and status
    const newEstado = (status === 'APTO' || status === 'OPERATIVO' || status === 'ACCION_PENDIENTE') ? 'OPERATIVO' : 'NO_APTO'
    await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: body.FK_ID_Equipo },
      data: {
        Fecha_Ultima_Verificacion: new Date(),
        Fecha_Proximo_Control: proximoControl,
        Estado: newEstado,
      }
    })

    return NextResponse.json({ ...log, Resultado_Status: status, Variacion_Calculada: variacion }, { status: 201 })
  } catch (error: any) {
    console.error('[API Historial POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
