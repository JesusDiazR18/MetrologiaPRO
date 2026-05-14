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

    const variacion = calcularVariacion(
      parseFloat(body.Medida_Instrumento),
      parseFloat(body.Medida_Patron)
    )
    const status = calcularStatus(variacion, equipo.Tolerancia_Aceptable)

    const proximoControl = calcularProximoControl(new Date(), equipo.Periodicidad_Meses)

    const log = await prisma.historialVerificacion.create({
      data: {
        FK_ID_Equipo: body.FK_ID_Equipo,
        FK_ID_Patron_Usado: body.FK_ID_Patron_Usado || null,
        Medida_Instrumento: parseFloat(body.Medida_Instrumento),
        Medida_Patron: parseFloat(body.Medida_Patron),
        Variacion_Calculada: variacion,
        Resultado_Status: status,
        Tecnico_Ejecutor: body.Tecnico_Ejecutor,
        Observaciones: body.Observaciones ?? null,
        Firma_Digital: body.Firma_Digital ?? null,
      }
    })

    // Update equipo's dates
    await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: body.FK_ID_Equipo },
      data: {
        Fecha_Ultima_Verificacion: new Date(),
        Fecha_Proximo_Control: proximoControl,
        Estado: status === 'APTO' ? 'OPERATIVO' : 'NO_APTO',
      }
    })

    return NextResponse.json({ ...log, Resultado_Status: status, Variacion_Calculada: variacion }, { status: 201 })
  } catch (error: any) {
    console.error('[API Historial POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
