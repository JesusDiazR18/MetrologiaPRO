import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      Codigo, Nombre_Patron, Fecha_Calibracion_Externa, Fecha_Vencimiento_Certificado,
      N_Certificado, Proveedor_Laboratorio, PDF_Certificado, Estado_Vigencia
    } = body

    const updated = await prisma.patronReferencia.update({
      where: { ID_Patron: id },
      data: {
        Codigo,
        Nombre_Patron,
        Fecha_Calibracion_Externa: Fecha_Calibracion_Externa ? new Date(Fecha_Calibracion_Externa) : null,
        Fecha_Vencimiento_Certificado: Fecha_Vencimiento_Certificado ? new Date(Fecha_Vencimiento_Certificado) : null,
        N_Certificado,
        Proveedor_Laboratorio,
        PDF_Certificado,
        Estado_Vigencia
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PUT Patron Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar el patrón' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Desvinculamos del historial si fue usado
    await prisma.historialVerificacion.updateMany({
      where: { FK_ID_Patron_Usado: id },
      data: { FK_ID_Patron_Usado: null }
    })
    await prisma.patronReferencia.delete({ where: { ID_Patron: id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE Patron Error:', error)
    return NextResponse.json({ error: error.message || 'Error al eliminar el patrón' }, { status: 500 })
  }
}
