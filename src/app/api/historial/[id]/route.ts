import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularProximoControl } from '@/lib/metrologia'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: logId } = await params
    const body = await request.json()

    // 1. Encontrar el log existente
    const currentLog = await prisma.historialVerificacion.findUnique({
      where: { ID_Log: logId },
      include: { equipo: true }
    })

    if (!currentLog) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const {
      Fecha_Ejecucion,
      FK_ID_Patron_Usado,
      Medida_Instrumento,
      Medida_Patron,
      Resultado_Status,
      Tecnico_Ejecutor,
      Observaciones,
      Tipo_Verificacion,
      Acciones_Pendientes,
      Evidencia_Foto,
      Magnitud_Controlada,
      Mediciones_Puntos
    } = body

    // Calcular variación y estatus si es calibración y vienen las medidas
    let finalStatus = Resultado_Status || 'APTO'
    let variacion = null
    if (Tipo_Verificacion === 'CALIBRACION') {
      if (Medida_Instrumento !== null && Medida_Patron !== null && Medida_Instrumento !== '' && Medida_Patron !== '') {
        const numInstr = parseFloat(Medida_Instrumento)
        const numPatr = parseFloat(Medida_Patron)
        variacion = parseFloat((numInstr - numPatr).toFixed(6))
        
        let magTolerancia = currentLog.equipo.Tolerancia_Aceptable
        const checkMag = Magnitud_Controlada || currentLog.Magnitud_Controlada
        if (currentLog.equipo.Tolerancias_Multimagnitud && checkMag) {
          try {
            const map = JSON.parse(currentLog.equipo.Tolerancias_Multimagnitud)
            if (map[checkMag]?.tolerancia) {
              magTolerancia = parseFloat(map[checkMag].tolerancia) || 0
            }
          } catch (e) {}
        }
        finalStatus = Math.abs(variacion) <= magTolerancia ? 'APTO' : 'NO_APTO'
      }
    } else {
      // Si es de operatividad y tiene acciones pendientes, su estado puede ser ACCION_PENDIENTE
      if (Acciones_Pendientes && Acciones_Pendientes.trim().length > 0) {
        if (finalStatus === 'OPERATIVO') {
          finalStatus = 'ACCION_PENDIENTE'
        }
      }
    }

    let estadoSeguimiento = 'N/A'
    if (Acciones_Pendientes && Acciones_Pendientes.trim().length > 0) {
      estadoSeguimiento = 'PENDIENTE'
    }

    // 2. Actualizar el log en la base de datos
    const updatedLog = await prisma.historialVerificacion.update({
      where: { ID_Log: logId },
      data: {
        Fecha_Ejecucion: Fecha_Ejecucion ? new Date(Fecha_Ejecucion) : undefined,
        FK_ID_Patron_Usado: FK_ID_Patron_Usado !== undefined ? FK_ID_Patron_Usado : undefined,
        Medida_Instrumento: Medida_Instrumento !== undefined ? (Medida_Instrumento !== null && Medida_Instrumento !== '' ? parseFloat(Medida_Instrumento) : null) : undefined,
        Medida_Patron: Medida_Patron !== undefined ? (Medida_Patron !== null && Medida_Patron !== '' ? parseFloat(Medida_Patron) : null) : undefined,
        Variacion_Calculada: variacion,
        Resultado_Status: finalStatus,
        Tecnico_Ejecutor: Tecnico_Ejecutor !== undefined ? Tecnico_Ejecutor : undefined,
        Observaciones: Observaciones !== undefined ? Observaciones : undefined,
        Tipo_Verificacion: Tipo_Verificacion !== undefined ? Tipo_Verificacion : undefined,
        Acciones_Pendientes: Acciones_Pendientes !== undefined ? Acciones_Pendientes : undefined,
        Estado_Seguimiento: estadoSeguimiento,
        Evidencia_Foto: Evidencia_Foto !== undefined ? Evidencia_Foto : undefined,
        Magnitud_Controlada: Magnitud_Controlada !== undefined ? Magnitud_Controlada : undefined,
        Mediciones_Puntos: Mediciones_Puntos !== undefined ? Mediciones_Puntos : undefined
      }
    })

    // 3. Buscar el *último* log de este equipo (después de la actualización)
    const lastLog = await prisma.historialVerificacion.findFirst({
      where: { FK_ID_Equipo: currentLog.FK_ID_Equipo },
      orderBy: { Fecha_Ejecucion: 'desc' }
    })

    // 4. Recalcular fechas para el Equipo
    const periodicidad = currentLog.equipo.Periodicidad_Meses
    let newUltimaFecha = null
    let newProximaFecha = null
    let newStatus = currentLog.equipo.Estado

    if (lastLog) {
      newUltimaFecha = lastLog.Fecha_Ejecucion
      newProximaFecha = calcularProximoControl(lastLog.Fecha_Ejecucion, periodicidad)
      newStatus = (lastLog.Resultado_Status === 'APTO' || lastLog.Resultado_Status === 'OPERATIVO' || lastLog.Resultado_Status === 'ACCION_PENDIENTE') ? 'OPERATIVO' : 'NO_APTO'
    } else {
      newUltimaFecha = currentLog.equipo.Fecha_Ingreso || new Date()
      newProximaFecha = calcularProximoControl(newUltimaFecha, periodicidad)
      newStatus = 'OPERATIVO'
    }

    // 5. Actualizar el Equipo
    await prisma.instrumentoEquipo.update({
      where: { ID_Equipo: currentLog.FK_ID_Equipo },
      data: {
        Fecha_Ultima_Verificacion: newUltimaFecha,
        Fecha_Proximo_Control: newProximaFecha,
        Estado: newStatus,
      }
    })

    return NextResponse.json(updatedLog)

  } catch (error: any) {
    console.error("Error al actualizar historial:", error)
    return NextResponse.json({ error: error.message || 'Fallo interno al actualizar' }, { status: 500 })
  }
}

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
      newStatus = (lastLog.Resultado_Status === 'APTO' || lastLog.Resultado_Status === 'OPERATIVO' || lastLog.Resultado_Status === 'ACCION_PENDIENTE') ? 'OPERATIVO' : 'NO_APTO'
    } else {
      // Si ya no quedan registros, usamos Fecha_Ingreso o fecha actual
      newUltimaFecha = deleteLog.equipo.Fecha_Ingreso || new Date()
      newProximaFecha = calcularProximoControl(newUltimaFecha, periodicidad)
      newStatus = 'OPERATIVO'
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

    return NextResponse.json({ message: 'Verificación eliminada y fechas restauradas exitosamente' })

  } catch (error) {
    console.error("Error al borrar historial:", error)
    return NextResponse.json({ error: 'Fallo interno al borrar' }, { status: 500 })
  }
}
