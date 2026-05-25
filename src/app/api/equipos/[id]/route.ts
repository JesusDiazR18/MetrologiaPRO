import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularProximoControl } from '@/lib/metrologia'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { estado, observaciones, detalles_estado, tiene_solucion, requiere_seguimiento } = body

    const targetEstado = (estado === 'OBSOLETO' || estado === 'BAJA') ? 'DE_BAJA_OBSOLETO' : estado

    const updated = await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: id },
      data: { 
        Estado: targetEstado,
        Detalles_Estado: detalles_estado !== undefined ? detalles_estado : null,
        Tiene_Solucion: tiene_solucion !== undefined ? Boolean(tiene_solucion) : true,
        Requiere_Seguimiento: requiere_seguimiento !== undefined ? Boolean(requiere_seguimiento) : false,
        // Registramos eventos significativos en el historial
        historiales: (targetEstado === 'FUERA_DE_SERVICIO' || targetEstado === 'DE_BAJA_OBSOLETO' || targetEstado === 'OPERATIVO') ? {
          create: {
            Resultado_Status: targetEstado === 'OPERATIVO' ? 'APTO' : 'NO_APTO',
            Observaciones: observaciones || (targetEstado === 'OPERATIVO' ? 'Equipo re-habilitado a Operativo' : `Cambio de estado a ${targetEstado}`),
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
      Responsable, Periodicidad_Meses, Foto_Equipo, Estado, PDF_Certificado, 
      Fecha_Vencimiento_Certificado, N_Certificado, Proveedor_Servicio, 
      Magnitud, Accesorios, Insumos, Detalles_Estado, Tiene_Solucion, 
      Requiere_Seguimiento, Periodicidad_Seguimiento, Fecha_Ingreso, Tolerancias_Multimagnitud
    } = body

    const targetEstado = (Estado === 'OBSOLETO' || Estado === 'BAJA') ? 'DE_BAJA_OBSOLETO' : Estado;
    const meses = parseInt(Periodicidad_Meses) || 12;
    const targetIngreso = Fecha_Ingreso ? new Date(Fecha_Ingreso) : null;

    const lastLog = await prisma.historialVerificacion.findFirst({
      where: { FK_ID_Equipo: id },
      orderBy: { Fecha_Ejecucion: 'desc' }
    });

    let ultima: Date | null = lastLog ? lastLog.Fecha_Ejecucion : targetIngreso;
    if (!ultima) {
      const eq = await prisma.instrumentoEquipo.findUnique({ where: { ID_Equipo: id }, select: { Fecha_Ingreso: true } });
      ultima = eq?.Fecha_Ingreso || new Date();
    }
    const proximo = calcularProximoControl(ultima || new Date(), meses);

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
        Periodicidad_Meses: meses,
        Fecha_Ultima_Verificacion: ultima,
        Fecha_Proximo_Control: proximo,
        Fecha_Ingreso: targetIngreso,
        Foto_Equipo,
        Estado: targetEstado,
        Detalles_Estado: Detalles_Estado ?? null,
        Tiene_Solucion: Tiene_Solucion !== undefined ? Boolean(Tiene_Solucion) : true,
        Requiere_Seguimiento: Requiere_Seguimiento !== undefined ? Boolean(Requiere_Seguimiento) : false,
        Periodicidad_Seguimiento: Periodicidad_Seguimiento !== undefined ? (Periodicidad_Seguimiento !== null ? parseInt(Periodicidad_Seguimiento) || null : null) : undefined,
        PDF_Certificado,
        Fecha_Vencimiento_Certificado: Fecha_Vencimiento_Certificado ? new Date(Fecha_Vencimiento_Certificado) : null,
        N_Certificado,
        Proveedor_Servicio,
        Magnitud,
        Accesorios,
        Insumos,
        Tolerancias_Multimagnitud
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
