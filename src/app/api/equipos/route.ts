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
      const prefix = tipo === 'EQUIPO' ? 'EQ' : 'INS'
      const year = new Date().getFullYear()
      const count = await prisma.instrumentoEquipo.count({ where: { Tipo: tipo } })
      const nextId = `${prefix}-${year}-${(count + 1).toString().padStart(3, '0')}`
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
    const equipo = await prisma.instrumentoEquipo.create({ data: body })
    return NextResponse.json(equipo, { status: 201 })
  } catch (error: any) {
    console.error('[API Equipos POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
