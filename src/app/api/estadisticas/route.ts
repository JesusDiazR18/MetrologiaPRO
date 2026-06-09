import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSystemReport, calcularSemaforo } from '@/lib/metrologia'

const selectLightEquipo = {
  ID_Equipo: true,
  Tipo: true,
  Codigo_Interno: true,
  Nombre_Equipo: true,
  Marca: true,
  Modelo: true,
  Serie: true,
  Rango_Medida: true,
  Resolucion: true,
  Tolerancia_Aceptable: true,
  Unidad_Tolerancia: true,
  Area_Asignada: true,
  Responsable: true,
  Periodicidad_Meses: true,
  Fecha_Ultima_Verificacion: true,
  Fecha_Proximo_Control: true,
  Fecha_Ingreso: true,
  Estado: true,
  Detalles_Estado: true,
  Tiene_Solucion: true,
  Requiere_Seguimiento: true,
  Periodicidad_Seguimiento: true,
  Fecha_Vencimiento_Certificado: true,
  N_Certificado: true,
  Proveedor_Servicio: true,
  Magnitud: true,
  Tolerancias_Multimagnitud: true,
  Accesorios: true,
  Insumos: true,
}

const selectLightPatron = {
  ID_Patron: true,
  Codigo: true,
  Nombre_Patron: true,
  Fecha_Calibracion_Externa: true,
  Fecha_Vencimiento_Certificado: true,
  N_Certificado: true,
  Proveedor_Laboratorio: true,
  Estado_Vigencia: true,
  Magnitud: true,
}

const selectLightHistorial = {
  ID_Log: true,
  FK_ID_Equipo: true,
  Fecha_Ejecucion: true,
  FK_ID_Patron_Usado: true,
  Medida_Instrumento: true,
  Medida_Patron: true,
  Variacion_Calculada: true,
  Resultado_Status: true,
  Tecnico_Ejecutor: true,
  Observaciones: true,
  Tipo_Verificacion: true,
  Acciones_Pendientes: true,
  Estado_Seguimiento: true,
  Magnitud_Controlada: true,
  Mediciones_Puntos: true,
}

export async function GET() {
  try {
    // Sincronización robusta: Verificar integridad antes de proceder
    await prisma.$queryRaw`SELECT 1`

    // Consulta consolidada y optimizada
    const [equipos, patrones, historiales, patronPdfCheck, equipoPdfCheck] = await Promise.all([
      prisma.instrumentoEquipo.findMany({
        select: {
          ...selectLightEquipo,
          historiales: {
            select: selectLightHistorial,
            orderBy: { Fecha_Ejecucion: 'desc' },
            take: 5,
          }
        },
        orderBy: { Codigo_Interno: 'asc' }
      }),
      prisma.patronReferencia.findMany({
        select: {
          ...selectLightPatron,
          historiales: {
            select: selectLightHistorial,
            orderBy: { Fecha_Ejecucion: 'desc' },
            take: 5,
          }
        },
        orderBy: { ID_Patron: 'asc' }
      }),
      prisma.historialVerificacion.findMany({
        orderBy: { Fecha_Ejecucion: 'desc' },
        take: 15,
        select: {
          ...selectLightHistorial,
          equipo: { select: { Nombre_Equipo: true, Codigo_Interno: true, Tipo: true } },
        }
      }),
      prisma.$queryRaw<Array<{ ID_Patron: string, Has_PDF: any, Has_Foto: any }>>`
        SELECT "ID_Patron", 
               ("PDF_Certificado" IS NOT NULL AND "PDF_Certificado" <> '') AS "Has_PDF", 
               ("Foto_Patron" IS NOT NULL AND "Foto_Patron" <> '') AS "Has_Foto" 
        FROM "PatronReferencia"
      `,
      prisma.$queryRaw<Array<{ ID_Equipo: string, Has_PDF: any, Has_Foto: any }>>`
        SELECT "ID_Equipo", 
               ("PDF_Certificado" IS NOT NULL AND "PDF_Certificado" <> '') AS "Has_PDF", 
               ("Foto_Equipo" IS NOT NULL AND "Foto_Equipo" <> '') AS "Has_Foto" 
        FROM "InstrumentoEquipo"
      `
    ])

    const patronPdfMap = new Map(patronPdfCheck.map(p => [p.ID_Patron, !!p.Has_PDF]))
    const patronFotoMap = new Map(patronPdfCheck.map(p => [p.ID_Patron, !!p.Has_Foto]))
    const equipoPdfMap = new Map(equipoPdfCheck.map(e => [e.ID_Equipo, !!e.Has_PDF]))
    const equipoFotoMap = new Map(equipoPdfCheck.map(e => [e.ID_Equipo, !!e.Has_Foto]))

    // Normalizar estado de vigencia para patrones
    const processedPatrones = patrones.map(p => {
      const hasPDF = patronPdfMap.get(p.ID_Patron) || false
      const hasFoto = patronFotoMap.get(p.ID_Patron) || false
      const fakePdf = hasPDF ? 'dummy_exists' : null
      const fakeFoto = hasFoto ? 'dummy_exists' : null

      let estado = p.Estado_Vigencia
      if (!fakePdf) {
        estado = 'SIN CERTIFICADO'
      } else if (p.Fecha_Vencimiento_Certificado && new Date(p.Fecha_Vencimiento_Certificado).getTime() < Date.now()) {
        estado = 'VENCIDO'
      }
      return {
        ...p,
        PDF_Certificado: fakePdf,
        Foto_Patron: fakeFoto,
        Estado_Vigencia: estado
      }
    })

    const processedEquipos = equipos.map(e => {
      const hasPDF = equipoPdfMap.get(e.ID_Equipo) || false
      const hasFoto = equipoFotoMap.get(e.ID_Equipo) || false
      return {
        ...e,
        PDF_Certificado: hasPDF ? 'dummy_exists' : null,
        Foto_Equipo: hasFoto ? 'dummy_exists' : null
      }
    })

    // Generar reporte integral usando el motor de reglas centralizado
    const report = generateSystemReport(processedEquipos, processedPatrones)

    // Identificar Alertas Críticas (Activos activos que requieren acción inmediata)
    const alertasCriticas = processedEquipos
      .filter(e => {
        // Excluir activos dados de baja
        if (e.Estado === 'DE_BAJA_OBSOLETO' || e.Estado === 'OBSOLETO' || e.Estado === 'BAJA') {
          return false
        }
        return (calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'ROJO') || e.Estado === 'NO_APTO'
      })
      .sort((a, b) => {
        return new Date(a.Fecha_Proximo_Control || 0).getTime() - new Date(b.Fecha_Proximo_Control || 0).getTime()
      })
      .slice(0, 5)
      .map(e => ({
        id: e.ID_Equipo,
        codigo: e.Codigo_Interno,
        nombre: e.Nombre_Equipo,
        area: e.Area_Asignada,
        status: calcularSemaforo(e.Fecha_Proximo_Control, e.Estado)
      }))

    const activeEquipos = processedEquipos.filter(e => e.Estado !== 'DE_BAJA_OBSOLETO' && e.Estado !== 'OBSOLETO' && e.Estado !== 'BAJA')
    const equiposByTipo = [
      { name: 'Equipos', value: activeEquipos.filter(e => e.Tipo === 'EQUIPO').length },
      { name: 'Instrumentos', value: activeEquipos.filter(e => e.Tipo === 'INSTRUMENTO').length },
    ]

    return NextResponse.json({
      ...report,
      equiposByTipo,
      alertasCriticas,
      ultimasVerificaciones: historiales,
      equipos: processedEquipos,
      patrones: processedPatrones,
      // Retrocompatibilidad con UI actual
      porciento: report.pctApto,
      alDia: report.alDia,
      proximos: report.proximos,
      vencidos: report.vencidos
    })
  } catch (error: any) {
    console.error('[API Statistics Master Error]:', error)
    return NextResponse.json({ 
      error: 'Anomalía en la generación de reporte estratégico', 
      details: error.message 
    }, { status: 500 })
  }
}

