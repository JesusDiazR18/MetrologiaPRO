import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const suggest = searchParams.get('suggestId') === 'true'

    if (suggest) {
      const patrones = await prisma.patronReferencia.findMany({
        select: { ID_Patron: true }
      })
      let maxNum = 0
      patrones.forEach(p => {
        const parts = p.ID_Patron.split('-')
        if (parts.length === 2 && parts[0] === 'PAT') {
          const num = parseInt(parts[1], 10)
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      })
      const nextId = `PAT-${(maxNum + 1).toString().padStart(3, '0')}`
      return NextResponse.json({ nextId })
    }

    const patrones = await prisma.patronReferencia.findMany({ 
      include: { historiales: { orderBy: { Fecha_Ejecucion: 'desc' }, take: 10 } },
      orderBy: { ID_Patron: 'asc' } 
    })

    const processed = patrones.map(p => {
      let estado = p.Estado_Vigencia
      if (!p.PDF_Certificado || p.PDF_Certificado.trim() === '' || p.PDF_Certificado === 'null' || p.PDF_Certificado === 'undefined') {
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
  let body: any = null
  try {
    body = await request.json()
    
    let finalEstado = body.Estado_Vigencia || 'SIN CERTIFICADO'
    if (!body.PDF_Certificado || body.PDF_Certificado.trim() === '' || body.PDF_Certificado === 'null' || body.PDF_Certificado === 'undefined') {
      finalEstado = 'SIN CERTIFICADO'
    } else if (body.Fecha_Vencimiento_Certificado && new Date(body.Fecha_Vencimiento_Certificado).getTime() < Date.now()) {
      finalEstado = 'VENCIDO'
    } else {
      finalEstado = 'VIGENTE'
    }

    const dataToCreate = {
      ...body,
      Estado_Vigencia: finalEstado,
      Fecha_Calibracion_Externa: body.Fecha_Calibracion_Externa ? new Date(body.Fecha_Calibracion_Externa) : null,
      Fecha_Vencimiento_Certificado: body.Fecha_Vencimiento_Certificado ? new Date(body.Fecha_Vencimiento_Certificado) : null
    }

    const patron = await prisma.patronReferencia.create({ data: dataToCreate })
    return NextResponse.json(patron, { status: 201 })
  } catch (error: any) {
    console.error('[API Patrones POST Error]:', error)
    if (error.code === 'P2002' || error.message?.includes('Unique constraint') || error.message?.includes('ID_Patron') || error.message?.includes('Codigo')) {
      return NextResponse.json({ 
        error: `El ID o Código de patrón "${body?.ID_Patron || ''}" ya está registrado en el sistema. Por favor, asigne un identificador único.` 
      }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
