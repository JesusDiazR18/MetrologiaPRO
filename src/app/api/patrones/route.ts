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

    const selectLightPatron = {
      ID_Patron: true,
      Codigo: true,
      Nombre_Patron: true,
      Fecha_Calibracion_Externa: true,
      Fecha_Vencimiento_Certificado: true,
      N_Certificado: true,
      Proveedor_Laboratorio: true,
      Estado_Vigencia: true,
      Magnitud: true,
    }

    const [patrones, pdfCheck] = await Promise.all([
      prisma.patronReferencia.findMany({
        select: {
          ...selectLightPatron,
          historiales: {
            select: {
              ID_Log: true,
              Fecha_Ejecucion: true,
              Variacion_Calculada: true,
              Resultado_Status: true,
              Tecnico_Ejecutor: true,
              Observaciones: true,
            },
            orderBy: { Fecha_Ejecucion: 'desc' },
            take: 10
          }
        },
        orderBy: { ID_Patron: 'asc' }
      }),
      prisma.$queryRaw<Array<{ ID_Patron: string, Has_PDF: any, Has_Foto: any }>>`
        SELECT "ID_Patron", 
               ("PDF_Certificado" IS NOT NULL AND "PDF_Certificado" <> '') AS "Has_PDF", 
               ("Foto_Patron" IS NOT NULL AND "Foto_Patron" <> '') AS "Has_Foto" 
        FROM "PatronReferencia"
      `
    ])

    const patronPdfMap = new Map(pdfCheck.map(x => [x.ID_Patron, !!x.Has_PDF]))
    const patronFotoMap = new Map(pdfCheck.map(x => [x.ID_Patron, !!x.Has_Foto]))

    const processed = patrones.map(p => {
      const hasPDF = patronPdfMap.get(p.ID_Patron) || false
      const hasFoto = patronFotoMap.get(p.ID_Patron) || false
      const fakePdf = hasPDF ? 'dummy_exists' : null
      const fakeFoto = hasFoto ? 'dummy_exists' : null

      let estado = p.Estado_Vigencia
      if (!fakePdf) {
        estado = 'SIN CERTIFICADO'
      } else if (p.Fecha_Vencimiento_Certificado && new Date(p.Fecha_Vencimiento_Certificado).getTime() < Date.now()) {
        estado = 'VENCIDO'
      }
      return {
        ...p,
        PDF_Certificado: fakePdf,
        Foto_Patron: fakeFoto,
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
