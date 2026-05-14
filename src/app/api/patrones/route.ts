import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const patrones = await prisma.patronReferencia.findMany({ 
    include: { historiales: { orderBy: { Fecha_Ejecucion: 'desc' }, take: 10 } },
    orderBy: { Codigo: 'asc' } 
  })
  return NextResponse.json(patrones)
}

export async function POST(request: Request) {
  const body = await request.json()
  const patron = await prisma.patronReferencia.create({ data: body })
  return NextResponse.json(patron, { status: 201 })
}
