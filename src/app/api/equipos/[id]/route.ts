import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const text = await request.text()
    const body = JSON.parse(text)
    const { estado, observaciones } = body

    const targetEstado = estado === 'OBSOLETO' ? 'FUERA_DE_SERVICIO' : estado

    const updated = await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: id },
      data: { 
        Estado: targetEstado,
        // Registramos eventos significativos en el historial
        historiales: (targetEstado === 'FUERA_DE_SERVICIO' || targetEstado === 'OPERATIVO') ? {
          create: {
            Resultado_Status: targetEstado === 'FUERA_DE_SERVICIO' ? 'NO_APTO' : 'APTO',
            Observaciones: observaciones || (targetEstado === 'FUERA_DE_SERVICIO' ? 'Equipo puesto fuera de servicio' : 'Equipo re-habilitado'),
            Tecnico_Ejecutor: 'SISTEMA',
            Fecha_Ejecucion: new Date()
          }
        } : undefined
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar el estado' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      Nombre_Equipo, Codigo_Interno, Marca, Modelo, Serie, Rango_Medida,
      Resolucion, Tolerancia_Aceptable, Unidad_Tolerancia, Area_Asignada,
      Responsable, Periodicidad_Meses, Fecha_Ultima_Verificacion, Fecha_Proximo_Control,
      Foto_Equipo, Estado, PDF_Certificado, Fecha_Vencimiento_Certificado,
      N_Certificado, Proveedor_Servicio, Magnitud, Accesorios, Insumos
    } = body

    const updated = await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: id },
      data: {
        Nombre_Equipo,
        Codigo_Interno,
        Marca,
        Modelo,
        Serie,
        Rango_Medida,
        Resolucion,
        Tolerancia_Aceptable: parseFloat(Tolerancia_Aceptable) || 0,
        Unidad_Tolerancia,
        Area_Asignada,
        Responsable,
        Periodicidad_Meses: parseInt(Periodicidad_Meses) || 12,
        Fecha_Ultima_Verificacion: Fecha_Ultima_Verificacion ? new Date(Fecha_Ultima_Verificacion) : null,
        Fecha_Proximo_Control: Fecha_Proximo_Control ? new Date(Fecha_Proximo_Control) : null,
        Foto_Equipo,
        Estado,
        PDF_Certificado,
        Fecha_Vencimiento_Certificado: Fecha_Vencimiento_Certificado ? new Date(Fecha_Vencimiento_Certificado) : null,
        N_Certificado,
        Proveedor_Servicio,
        Magnitud,
        Accesorios,
        Insumos
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PUT Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar el equipo' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Primero eliminamos los historiales para no violar la llave foránea
    await prisma.historialVerificacion.deleteMany({ where: { FK_ID_Equipo: id } })
    await prisma.instrumentoEquipo.delete({ where: { ID_Equipo: id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Error al eliminar el equipo' }, { status: 500 })
  }
}
