import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const calibraciones = await prisma.historialCalibracionPatron.findMany({
      where: { FK_ID_Patron: id },
      orderBy: { Fecha_Calibracion: 'desc' }
    })
    return NextResponse.json(calibraciones)
  } catch (error: any) {
    console.error('[GET Historial Calibracion Patron]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const patron = await prisma.patronReferencia.findUnique({
      where: { ID_Patron: id }
    })
    if (!patron) {
      return NextResponse.json({ error: 'Patrón no encontrado' }, { status: 404 })
    }

    const calibracion = await prisma.historialCalibracionPatron.create({
      data: {
        FK_ID_Patron: id,
        Fecha_Calibracion: new Date(body.Fecha_Calibracion),
        Fecha_Vencimiento: body.Fecha_Vencimiento ? new Date(body.Fecha_Vencimiento) : null,
        N_Certificado: body.N_Certificado || null,
        Laboratorio: body.Laboratorio || null,
        PDF_Certificado: body.PDF_Certificado || null,
        Resultado: body.Resultado,
        Observaciones: body.Observaciones || null,
        Responsable: body.Responsable || null
      }
    })

    // If approved, update the patron's main cert data
    if (body.Resultado === 'APROBADO' && body.updatePatron) {
      const updData: any = {}
      if (body.Fecha_Calibracion) updData.Fecha_Calibracion_Externa = new Date(body.Fecha_Calibracion)
      if (body.Fecha_Vencimiento) updData.Fecha_Vencimiento_Certificado = new Date(body.Fecha_Vencimiento)
      if (body.N_Certificado) updData.N_Certificado = body.N_Certificado
      if (body.Laboratorio) updData.Proveedor_Laboratorio = body.Laboratorio
      if (body.PDF_Certificado) updData.PDF_Certificado = body.PDF_Certificado

      // Recalculate status
      if (body.PDF_Certificado && body.Fecha_Vencimiento) {
        const venc = new Date(body.Fecha_Vencimiento)
        updData.Estado_Vigencia = venc.getTime() < Date.now() ? 'VENCIDO' : 'VIGENTE'
      }

      if (Object.keys(updData).length > 0) {
        await prisma.patronReferencia.update({
          where: { ID_Patron: id },
          data: updData
        })
      }
    }

    return NextResponse.json(calibracion, { status: 201 })
  } catch (error: any) {
    console.error('[POST Historial Calibracion Patron]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
