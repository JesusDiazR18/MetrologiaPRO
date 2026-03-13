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
    return NextResponse.json({ error: error.message || 'Error al actualizar el equipo' }, { status: 500 })
  }
}
