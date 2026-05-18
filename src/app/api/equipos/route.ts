import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const tipo = searchParams.get('tipo') ?? ''
    const estado = searchParams.get('estado') ?? ''
    const suggest = searchParams.get('suggestId') === 'true'

    if (suggest && tipo) {
      const prefix = tipo === 'EQUIPO' ? 'E' : 'I'
      const count = await prisma.instrumentoEquipo.count({ where: { Tipo: tipo } })
      const num = (count + 1).toString().padStart(2, '0')
      const nextId = `${prefix}-${num}`
      return NextResponse.json({ nextId })
    }

    console.log(`[API Equipos] GET q="${q}", tipo="${tipo}", estado="${estado}"`)

    const equipos = await prisma.instrumentoEquipo.findMany({
      where: {
        AND: [
          q ? {
            OR: [
              { Nombre_Equipo: { contains: q, mode: 'insensitive' as any } },
              { Codigo_Interno: { contains: q, mode: 'insensitive' as any } },
              { Responsable: { contains: q, mode: 'insensitive' as any } },
            ]
          } : {},
          tipo ? { Tipo: tipo } : {},
          estado ? { Estado: estado } : {},
        ]
      },
      orderBy: { Codigo_Interno: 'asc' },
      include: {
        historiales: {
          orderBy: { Fecha_Ejecucion: 'desc' },
          take: 5,
        }
      }
    })
    return NextResponse.json(equipos)
  } catch (error: any) {
    console.error('[API Equipos GET Error]:', error)
    // Devolvemos un array vacío para evitar que el frontend falle con .map()
    return NextResponse.json([], { 
      status: 500,
      statusText: error.message 
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[API Equipos] POST body:', body)
    
    // Si no tiene fecha de última verificación, le asignamos hoy
    const now = new Date()
    const ultima = body.Fecha_Ultima_Verificacion ? new Date(body.Fecha_Ultima_Verificacion) : now
    
    // Calculamos próxima fecha según la periodicidad
    const meses = parseInt(body.Periodicidad_Meses) || 12
    const proximo = body.Fecha_Proximo_Control ? new Date(body.Fecha_Proximo_Control) : new Date(ultima)
    if (!body.Fecha_Proximo_Control) {
      proximo.setMonth(proximo.getMonth() + meses)
    }

    const targetEstado = (body.Estado === 'OBSOLETO' || body.Estado === 'BAJA') ? 'DE_BAJA_OBSOLETO' : (body.Estado || 'OPERATIVO');

    const equipo = await prisma.instrumentoEquipo.create({ 
      data: {
        ...body,
        Estado: targetEstado,
        Detalles_Estado: body.Detalles_Estado ?? null,
        Tiene_Solucion: body.Tiene_Solucion !== undefined ? Boolean(body.Tiene_Solucion) : true,
        Requiere_Seguimiento: body.Requiere_Seguimiento !== undefined ? Boolean(body.Requiere_Seguimiento) : false,
        Fecha_Ultima_Verificacion: ultima,
        Fecha_Proximo_Control: proximo,
        Fecha_Ingreso: body.Fecha_Ingreso ? new Date(body.Fecha_Ingreso) : new Date(),
        Periodicidad_Meses: meses,
        Tolerancia_Aceptable: parseFloat(body.Tolerancia_Aceptable) || 0
      } 
    })
    return NextResponse.json(equipo, { status: 201 })
  } catch (error: any) {
    console.error('[API Equipos POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
