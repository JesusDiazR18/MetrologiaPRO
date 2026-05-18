import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const suggest = searchParams.get('suggestId') === 'true'

    if (suggest) {
      const count = await prisma.patronReferencia.count()
      const num = (count + 1).toString().padStart(2, '0')
      const nextId = `P-${num}`
      return NextResponse.json({ nextId })
    }

    const patrones = await prisma.patronReferencia.findMany({ 
      include: { historiales: { orderBy: { Fecha_Ejecucion: 'desc' }, take: 10 } },
      orderBy: { Codigo: 'asc' } 
    })
    return NextResponse.json(patrones)
  } catch (error: any) {
    console.error('[API Patrones GET Error]:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const patron = await prisma.patronReferencia.create({ data: body })
    return NextResponse.json(patron, { status: 201 })
  } catch (error: any) {
    console.error('[API Patrones POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
