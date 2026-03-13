import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const tipo = searchParams.get('tipo') ?? ''
  const estado = searchParams.get('estado') ?? ''

  const equipos = await prisma.instrumentoEquipo.findMany({
    where: {
      AND: [
        q ? {
          OR: [
            { Nombre_Equipo: { contains: q } },
            { Codigo_Interno: { contains: q } },
            { Responsable: { contains: q } },
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
}

export async function POST(request: Request) {
  const body = await request.json()
  const equipo = await prisma.instrumentoEquipo.create({ data: body })
  return NextResponse.json(equipo, { status: 201 })
}
