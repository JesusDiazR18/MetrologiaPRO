import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularProximoControl } from '@/lib/metrologia'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: logId } = await params

    // 1. Encontrar el log que queremos borrar
    const deleteLog = await prisma.historialVerificacion.findUnique({
      where: { ID_Log: logId },
      include: {
        equipo: true,
        patron: true
      }
    })

    if (!deleteLog) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const equipoId = deleteLog.FK_ID_Equipo
    const patronId = deleteLog.FK_ID_Patron_Usado

    // 2. Eliminar el log
    await prisma.historialVerificacion.delete({
      where: { ID_Log: logId }
    })

    // 3. Buscar el *último* log restante de este equipo
    const lastLog = await prisma.historialVerificacion.findFirst({
      where: { FK_ID_Equipo: equipoId },
      orderBy: { Fecha_Ejecucion: 'desc' }
    })

    // 4. Recalcular fechas para el Equipo
    const periodicidad = deleteLog.equipo.Periodicidad_Meses
    let newUltimaFecha = null
    let newProximaFecha = null
    let newStatus = deleteLog.equipo.Estado

    if (lastLog) {
      newUltimaFecha = lastLog.Fecha_Ejecucion
      newProximaFecha = calcularProximoControl(lastLog.Fecha_Ejecucion, periodicidad)
      newStatus = lastLog.Resultado_Status === 'APTO' ? 'OPERATIVO' : 'NO_APTO'
    } else {
      // Si ya no quedan registros
      newUltimaFecha = null
      newProximaFecha = null
      newStatus = 'NO_APTO' // Al no tener mantenimientos, cae en no apto o estado default
    }

    // 5. Actualizar el Equipo
    await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: equipoId },
      data: {
        Fecha_Ultima_Verificacion: newUltimaFecha,
        Fecha_Proximo_Control: newProximaFecha,
        Estado: newStatus,
      }
    })

    // (Opcional) Si el equipo que recibió mantenimiento fue un PATRON, el patron actualiza su propio historial?
    // Wait, FK_ID_Patron_Usado solo indica si se usó un patrón para calibrar un equipo. 
    // Las calibraciones a los propios Patrones se registran como si el patrón fuera el Equipo (en otro endpoint o flujo de la UI?).
    // De momento, nuestro sistema vincula el mantenimiento al InstrumentoEquipo. 

    return NextResponse.json({ message: 'Verificación eliminada y fechas restauradas exitosamente' })

  } catch (error) {
    console.error("Error al borrar historial:", error)
    return NextResponse.json({ error: 'Fallo interno al borrar' }, { status: 500 })
  }
}
