import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const suggest = searchParams.get('suggestId') === 'true'

    if (suggest) {
      const count = await prisma.patronReferencia.count()
      const num = (count + 1).toString().padStart(3, '0')
      const nextId = `PAT-${num}`
      return NextResponse.json({ nextId })
    }

    const patrones = await prisma.patronReferencia.findMany({ 
      include: { historiales: { orderBy: { Fecha_Ejecucion: 'desc' }, take: 10 } },
      orderBy: { ID_Patron: 'asc' } 
    })

    const processed = patrones.map(p => {
      let estado = p.Estado_Vigencia
      if (!p.PDF_Certificado || p.PDF_Certificado.trim() === '') {
        estado = 'SIN CERTIFICADO'
      } else if (p.Fecha_Vencimiento_Certificado && new Date(p.Fecha_Vencimiento_Certificado).getTime() < Date.now()) {
        estado = 'VENCIDO'
      }
      return {
        ...p,
        Estado_Vigencia: estado
      }
    })

    return NextResponse.json(processed)
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
