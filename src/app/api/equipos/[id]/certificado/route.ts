import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const equipo = await prisma.instrumentoEquipo.findUnique({
      where: { ID_Equipo: id },
      select: {
        ID_Equipo: true,
        Codigo_Interno: true,
        PDF_Certificado: true
      }
    })

    if (!equipo || !equipo.PDF_Certificado) {
      return new NextResponse('Certificado PDF no encontrado para este activo', { status: 404 })
    }

    const pdfData = equipo.PDF_Certificado

    // Si es una URL externa (http/https)
    if (pdfData.startsWith('http://') || pdfData.startsWith('https://')) {
      return NextResponse.redirect(pdfData)
    }

    // Si es base64
    let base64 = pdfData
    if (pdfData.includes(',')) {
      base64 = pdfData.split(',')[1]
    }

    const buffer = Buffer.from(base64, 'base64')
    const filename = `Certificado_${equipo.Codigo_Interno || equipo.ID_Equipo}.pdf`

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error: any) {
    console.error('[API Certificado Equipo Error]:', error)
    return new NextResponse('Error al cargar el certificado PDF', { status: 500 })
  }
}
