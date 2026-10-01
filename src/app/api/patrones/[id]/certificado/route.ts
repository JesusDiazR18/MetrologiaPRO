import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const patron = await prisma.patronReferencia.findUnique({
      where: { ID_Patron: id },
      select: {
        ID_Patron: true,
        Codigo: true,
        PDF_Certificado: true
      }
    })

    if (!patron || !patron.PDF_Certificado) {
      return new NextResponse('Certificado PDF no encontrado para este patrón', { status: 404 })
    }

    const pdfData = patron.PDF_Certificado

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
    const filename = `Certificado_${patron.Codigo || patron.ID_Patron}.pdf`

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
    console.error('[API Certificado Patron Error]:', error)
    return new NextResponse('Error al cargar el certificado PDF', { status: 500 })
  }
}
