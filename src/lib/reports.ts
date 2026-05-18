import { jsPDF } from 'jspdf'
import { formatFecha, semaforoLabel, calcularSemaforo } from './metrologia'

/**
 * Genera una Ficha Técnica profesional en formato PDF para un equipo específico.
 */
export async function generateTechnicalSheetPDF(equipo: any) {
  // Crear documento A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  // --- Encabezado ---
  doc.setFillColor(15, 23, 42) // Fondo oscuro premium
  doc.rect(0, 0, pageWidth, 45, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('FICHA TÉCNICA', margin, 25)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('SISTEMA INTEGRAL DE GESTIÓN QMS PRO', margin, 32)
  doc.text(`ID DE DOCUMENTO: FT-${equipo.Codigo_Interno}`, margin, 37)

  // --- Sección de Identificación ---
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('1. IDENTIFICACIÓN DEL ACTIVO', margin, 60)
  
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, 63, pageWidth - margin, 63)

  doc.setFontSize(11)
  let y = 75
  const leftCol = margin
  const rightCol = pageWidth / 2

  const infoGeneral = [
    { label: 'Nombre Equipo:', value: equipo.Nombre_Equipo },
    { label: 'Código Interno:', value: equipo.Codigo_Interno },
    { label: 'Tipo de Activo:', value: equipo.Tipo },
    { label: 'Área Asignada:', value: equipo.Area_Asignada || 'No definida' },
    { label: 'Responsable:', value: equipo.Responsable || 'No asignado' }
  ]

  infoGeneral.forEach(item => {
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, leftCol, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(item.value), leftCol + 40, y)
    y += 10
  })

  // --- Sección Técnica ---
  y = 135
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('2. ESPECIFICACIONES TÉCNICAS', margin, y)
  doc.line(margin, y + 3, pageWidth - margin, y + 3)

  y += 15
  const infoTecnica = [
    { label: 'Tolerancia Admitida:', value: `± ${equipo.Tolerancia_Aceptable} ${equipo.Unidad_Tolerancia || ''}` },
    { label: 'Periodicidad:', value: `${equipo.Periodicidad_Meses} Meses` },
    { label: 'Última Verificación:', value: formatFecha(equipo.Fecha_Ultima_Verificacion) },
    { label: 'Próxima Fecha Control:', value: formatFecha(equipo.Fecha_Proximo_Control) },
    { label: 'Estado Operativo:', value: semaforoLabel(calcularSemaforo(equipo.Fecha_Proximo_Control)) }
  ]

  infoTecnica.forEach(item => {
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, leftCol, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(item.value), leftCol + 45, y)
    y += 10
  })

  // --- Historial Reciente ---
  if (equipo.historiales && equipo.historiales.length > 0) {
    y += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('3. ÚLTIMAS VERIFICACIONES', margin, y)
    doc.line(margin, y + 3, pageWidth - margin, y + 3)

    y += 15
    // Header tabla historial
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, y - 5, pageWidth - (margin * 2), 7, 'F')
    doc.setFontSize(9)
    doc.text('Fecha', margin + 2, y)
    doc.text('Técnico', margin + 35, y)
    doc.text('Variación', margin + 85, y)
    doc.text('Resultado', margin + 120, y)

    y += 8
    equipo.historiales.slice(0, 5).forEach((h: any) => {
      doc.setFont('helvetica', 'normal')
      doc.text(formatFecha(h.Fecha_Ejecucion), margin + 2, y)
      doc.text(h.Tecnico_Ejecutor.substring(0, 20), margin + 35, y)
      doc.text(h.Variacion_Calculada?.toFixed(4) || '—', margin + 85, y)
      
      if (h.Resultado_Status === 'APTO') {
        doc.setTextColor(16, 185, 129)
      } else {
        doc.setTextColor(239, 68, 68)
      }
      doc.text(h.Resultado_Status, margin + 120, y)
      doc.setTextColor(0, 0, 0)
      y += 8
    })
  }

  // --- Pie de Página ---
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Certificado de integridad de datos generado por QMS Pro Metrología.', margin, footerY)
  doc.text('Este documento es una representación digital del registro centralizado.', margin, footerY + 4)
  doc.text(`Página 1 de 1`, pageWidth - margin - 20, footerY)

  // Guardar archivo
  doc.save(`FICHA_${equipo.Codigo_Interno}_${new Date().getTime()}.pdf`)
}

/**
 * Genera una Ficha Técnica profesional para un Patrón de Referencia.
 */
export async function generatePatronSheetPDF(patron: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  // Encabezado Púrpura (Color distintivo para patrones)
  doc.setFillColor(88, 28, 135) // Deep Purple 900
  doc.rect(0, 0, pageWidth, 45, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('CERTIFICADO DE PATRÓN', margin, 25)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('QMS PRO - CONTROL DE PATRONES DE REFERENCIA', margin, 32)
  doc.text(`ID SISTEMA: ${patron.ID_Patron}`, margin, 37)

  // Información del Patrón
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('1. INFORMACIÓN DEL PATRÓN', margin, 60)
  doc.line(margin, 63, pageWidth - margin, 63)

  doc.setFontSize(11)
  let y = 75
  const info = [
    { label: 'Nombre:', value: patron.Nombre_Patron },
    { label: 'Código Interno:', value: patron.Codigo },
    { label: 'Laboratorio de Calibración:', value: patron.Proveedor_Laboratorio || 'N/A' },
    { label: 'N° de Certificado:', value: patron.N_Certificado || 'N/A' },
    { label: 'Fecha Calibración:', value: formatFecha(patron.Fecha_Calibracion_Externa) },
    { label: 'Fecha Vencimiento:', value: formatFecha(patron.Fecha_Vencimiento_Certificado) },
    { label: 'Estado de Vigencia:', value: patron.Estado_Vigencia }
  ]

  info.forEach(item => {
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(item.value), margin + 55, y)
    y += 10
  })

  // Uso en Verificaciones (Historial)
  if (patron.historiales && patron.historiales.length > 0) {
    y += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('2. HISTORIAL DE USO EN SISTEMA', margin, y)
    doc.line(margin, y + 3, pageWidth - margin, y + 3)

    y += 15
    doc.setFillColor(243, 232, 255) // Purple dim
    doc.rect(margin, y - 5, pageWidth - (margin * 2), 7, 'F')
    doc.setFontSize(9)
    doc.text('Fecha', margin + 2, y)
    doc.text('Equipo Verificado', margin + 35, y)
    doc.text('Resultado', margin + 120, y)

    y += 8
    patron.historiales.slice(0, 10).forEach((h: any) => {
      doc.setFont('helvetica', 'normal')
      doc.text(formatFecha(h.Fecha_Ejecucion), margin + 2, y)
      // Si el equipo está presente en el include del historial
      doc.text(h.equipo?.Nombre_Equipo?.substring(0, 40) || 'Equipo no vinculado', margin + 35, y)
      doc.text(h.Resultado_Status, margin + 120, y)
      y += 8
    })
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Emitido por QMS Pro Cloud Metrology.', margin, footerY)
  doc.text(`Generado en: ${new Date().toLocaleString()}`, margin, footerY + 4)

  doc.save(`PATRON_${patron.Codigo}.pdf`)
}

/**
 * Genera un Reporte Ejecutivo Mensual consolidado del Dashboard.
 */
export async function generateExecutiveSummaryPDF(stats: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  // Header Azul Corporativo
  doc.setFillColor(30, 64, 175) // Blue 800
  doc.rect(0, 0, pageWidth, 50, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('REPORTE EJECUTIVO QMS', margin, 25)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text('GESTIÓN DE CALIDAD Y METROLOGÍA INDUSTRIAL', margin, 33)
  doc.text(`Período de Informe: ${new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}`, margin, 40)

  // Resumen de KPIs
  let y = 65
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('1. RESUMEN DE INDICADORES CLAVE (KPIs)', margin, y)
  doc.line(margin, y + 2, pageWidth - margin, y + 2)

  y += 15
  doc.setFontSize(11)
  const kpis = [
    { label: 'Cumplimiento Global del Sistema:', value: `${stats.complianceGlobal}%` },
    { label: 'Total Activos en Inventario:', value: stats.totalActivos },
    { label: 'Activos en Estado Óptimo (Verde):', value: stats.alDia },
    { label: 'Activos con Vencimiento Próximo (Amarillo):', value: stats.proximos },
    { label: 'Activos fuera de Vigencia (Rojo):', value: stats.vencidos }
  ]

  kpis.forEach(kpi => {
    doc.setFont('helvetica', 'bold')
    doc.text(kpi.label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(kpi.value), pageWidth - margin - 30, y, { align: 'right' })
    y += 10
  })

  // Análisis de Inventario
  y += 10
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('2. DISTRIBUCIÓN DE INVENTARIO', margin, y)
  doc.line(margin, y + 2, pageWidth - margin, y + 2)

  y += 15
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`El sistema cuenta con ${stats.totalEquipos} equipos principales y ${stats.totalPatrones} patrones de referencia vinculados.`, margin, y)
  
  // Alertas Críticas (Top 5)
  if (stats.alertasCriticas && stats.alertasCriticas.length > 0) {
    y += 20
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(185, 28, 28) // Red 700
    doc.text('3. ALERTAS DE ATENCIÓN INMEDIATA', margin, y)
    doc.setDrawColor(185, 28, 28)
    doc.line(margin, y + 2, pageWidth - margin, y + 2)
    doc.setTextColor(0, 0, 0)

    y += 12
    doc.setFontSize(10)
    stats.alertasCriticas.slice(0, 5).forEach((a: any) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`[!] ${a.codigo} - ${a.nombre}`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(`Motivo: ${a.status === 'ROJO' ? 'Vencimiento superado' : 'Estado NO APTO'}`, margin + 5, y + 5)
      y += 12
    })
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
  doc.text('Generado automáticamente por el motor de reportes QMS Pro.', margin, footerY)
  doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, margin, footerY + 4)
  doc.text('Confidencial - Uso Interno Solamente', pageWidth / 2, footerY + 4, { align: 'center' })

  doc.save(`REPORTE_EJECUTIVO_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`)
}
