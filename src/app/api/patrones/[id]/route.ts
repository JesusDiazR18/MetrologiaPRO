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
      N_Certificado, Proveedor_Laboratorio, PDF_Certificado, Estado_Vigencia, Foto_Patron
    } = body

    const existing = await prisma.patronReferencia.findUnique({
      where: { ID_Patron: id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Patrón de referencia no encontrado' }, { status: 404 })
    }

    const resolvedPdf = PDF_Certificado !== undefined ? PDF_Certificado : existing.PDF_Certificado
    const resolvedVenc = Fecha_Vencimiento_Certificado !== undefined ? Fecha_Vencimiento_Certificado : existing.Fecha_Vencimiento_Certificado

    let finalEstado = Estado_Vigencia || existing.Estado_Vigencia
    if (!resolvedPdf || resolvedPdf.trim() === '' || resolvedPdf === 'null' || resolvedPdf === 'undefined') {
      finalEstado = 'SIN CERTIFICADO'
    } else if (resolvedVenc && new Date(resolvedVenc).getTime() < Date.now()) {
      finalEstado = 'VENCIDO'
    } else {
      finalEstado = 'VIGENTE'
    }

    const updated = await prisma.patronReferencia.update({
      where: { ID_Patron: id },
      data: {
        Codigo,
        Nombre_Patron,
        Fecha_Calibracion_Externa: Fecha_Calibracion_Externa !== undefined ? (Fecha_Calibracion_Externa ? new Date(Fecha_Calibracion_Externa) : null) : existing.Fecha_Calibracion_Externa,
        Fecha_Vencimiento_Certificado: Fecha_Vencimiento_Certificado !== undefined ? (Fecha_Vencimiento_Certificado ? new Date(Fecha_Vencimiento_Certificado) : null) : existing.Fecha_Vencimiento_Certificado,
        N_Certificado: N_Certificado !== undefined ? N_Certificado : existing.N_Certificado,
        Proveedor_Laboratorio: Proveedor_Laboratorio !== undefined ? Proveedor_Laboratorio : existing.Proveedor_Laboratorio,
        PDF_Certificado: resolvedPdf,
        Estado_Vigencia: finalEstado,
        Foto_Patron: Foto_Patron !== undefined ? Foto_Patron : existing.Foto_Patron
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
