import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; calId: string }> }
) {
  try {
    const { calId } = await params
    await prisma.historialCalibracionPatron.delete({
      where: { ID_Calibracion: calId }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE Calibracion Patron]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; calId: string }> }
) {
  try {
    const { calId } = await params
    const body = await request.json()

    const existing = await prisma.historialCalibracionPatron.findUnique({
      where: { ID_Calibracion: calId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const updated = await prisma.historialCalibracionPatron.update({
      where: { ID_Calibracion: calId },
      data: {
        Fecha_Calibracion: body.Fecha_Calibracion ? new Date(body.Fecha_Calibracion) : existing.Fecha_Calibracion,
        Fecha_Vencimiento: body.Fecha_Vencimiento !== undefined
          ? (body.Fecha_Vencimiento ? new Date(body.Fecha_Vencimiento) : null)
          : existing.Fecha_Vencimiento,
        N_Certificado: body.N_Certificado !== undefined ? body.N_Certificado : existing.N_Certificado,
        Laboratorio: body.Laboratorio !== undefined ? body.Laboratorio : existing.Laboratorio,
        PDF_Certificado: body.PDF_Certificado !== undefined ? body.PDF_Certificado : existing.PDF_Certificado,
        Resultado: body.Resultado || existing.Resultado,
        Observaciones: body.Observaciones !== undefined ? body.Observaciones : existing.Observaciones,
        Responsable: body.Responsable !== undefined ? body.Responsable : existing.Responsable
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[PUT Calibracion Patron]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
