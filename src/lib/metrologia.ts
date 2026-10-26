import { addMonths, differenceInDays } from 'date-fns'

// --- Umbrales Configurables (Motor de Reglas) ---
export const THRESHOLDS = {
  WARNING_DAYS: 30,  // Días para pasar a Amarillo
  CRITICAL_DAYS: 0   // Días para pasar a Rojo (Vencido)
}

export type SemaforoColor = 'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS'

/**
 * Calcula el color del semáforo basado en la fecha de próximo control y el estado actual.
 */
export function calcularSemaforo(fechaProximo: Date | string | null | undefined, estado?: string): SemaforoColor {
  // Prioridad 1: Estados de baja (Gris)
  if (estado === 'DE_BAJA_OBSOLETO' || estado === 'OBSOLETO' || estado === 'BAJA') return 'GRIS'

  // Prioridad 2: Estados críticos activos (Rojo)
  if (estado === 'FUERA_DE_SERVICIO' || estado === 'VENCIDO' || estado === 'NO_APTO') return 'ROJO'
  if (estado === 'MANTENIMIENTO' || estado === 'OPERATIVO_CON_DETALLES') return 'AMARILLO'
  
  if (!fechaProximo) return 'ROJO'
  
  // Normalizar fecha para asegurar parseo correcto
  let d: Date
  if (typeof fechaProximo === 'string') {
    d = new Date(fechaProximo)
  } else {
    d = fechaProximo
  }

  if (isNaN(d.getTime())) return 'ROJO'

  const dias = differenceInDays(d, new Date())
  
  if (dias > THRESHOLDS.WARNING_DAYS) return 'VERDE'
  if (dias >= THRESHOLDS.CRITICAL_DAYS) return 'AMARILLO'
  return 'ROJO'
}

/**
 * Retorna el color hexadecimal para el semáforo.
 */
export function semaforoHex(s: SemaforoColor): string {
  switch (s) {
    case 'VERDE': return '#10b981' // Success Emerald
    case 'AMARILLO': return '#f59e0b' // Warning Amber
    case 'ROJO': return '#ef4444' // Error Red
    case 'GRIS': return '#94a3b8' // Slate / Gray
    default: return '#94a3b8'
  }
}

/**
 * Retorna la etiqueta amigable del estado.
 */
export function semaforoLabel(s: SemaforoColor, estado?: string): string {
  if (estado === 'DE_BAJA_OBSOLETO' || estado === 'OBSOLETO' || estado === 'BAJA') return 'Baja / Obsoleto'
  if (estado === 'FUERA_DE_SERVICIO' || estado === 'NO_APTO') return 'Fuera de Servicio'
  if (estado === 'MANTENIMIENTO') return 'En Mantenimiento'
  if (estado === 'OPERATIVO_CON_DETALLES') return 'Operativo con Detalles'
  if (estado === 'VENCIDO') return 'Vencido'

  switch (s) {
    case 'VERDE': return 'Operativo / Al día'
    case 'AMARILLO': return 'Próximo a vencer'
    case 'ROJO': return 'Vencido / Crítico'
    default: return 'No definido'
  }
}

/**
 * Lógica de validación técnica.
 * E = lectura del instrumento − valor del patrón. Conforme si |E| ≤ EMP (tolerancia).
 */
export function calcularVariacion(instrumento: number, patron: number): number {
  return parseFloat((instrumento - patron).toFixed(6))
}

export function calcularStatus(variacion: number, tolerancia: number): 'APTO' | 'NO_APTO' {
  // Pequeño margen para evitar falsos NO_APTO por representación binaria (p. ej. 0.1 + 0.2)
  return Math.abs(variacion) <= tolerancia + 1e-9 ? 'APTO' : 'NO_APTO'
}

export interface PuntoEvaluado {
  patron: number
  instrumento: number
  variacion: number
  [extra: string]: unknown
}

export interface EvaluacionPuntos {
  points: PuntoEvaluado[]
  worstVar: number
  worstPatron: number
  worstInstrumento: number
  status: 'APTO' | 'NO_APTO'
}

/**
 * Evalúa una serie de puntos de medición (patrón vs. instrumento) y devuelve
 * el punto con mayor error absoluto y el dictamen global. Los valores no
 * numéricos se descartan; si no queda ningún punto válido retorna null.
 */
export function evaluarPuntos(
  puntos: Array<{ patron: unknown; instrumento: unknown; [extra: string]: unknown }>,
  tolerancia: number
): EvaluacionPuntos | null {
  const points: PuntoEvaluado[] = []
  for (const p of puntos) {
    const patron = typeof p.patron === 'number' ? p.patron : parseFloat(String(p.patron ?? ''))
    const instrumento = typeof p.instrumento === 'number' ? p.instrumento : parseFloat(String(p.instrumento ?? ''))
    if (!Number.isFinite(patron) || !Number.isFinite(instrumento)) continue
    points.push({ ...p, patron, instrumento, variacion: calcularVariacion(instrumento, patron) })
  }
  if (points.length === 0) return null

  const worst = points.reduce((a, b) => (Math.abs(b.variacion) >= Math.abs(a.variacion) ? b : a))
  return {
    points,
    worstVar: worst.variacion,
    worstPatron: worst.patron,
    worstInstrumento: worst.instrumento,
    status: calcularStatus(worst.variacion, tolerancia),
  }
}

/** Suma meses respetando fin de mes (31-ene + 1 mes = 28/29-feb, no 3-mar). */
export function calcularProximoControl(from: Date, meses: number): Date {
  return addMonths(new Date(from), meses)
}

/**
 * Formateo de fechas estandarizado.
 */
export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}-${month}-${year}`
}

export function formatFechaLarga(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date)).replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * Utilidades de tiempo restante.
 */
export function diasRestantes(fecha: Date | string | null | undefined): string {
  if (!fecha) return 'Sin fecha'
  const dias = differenceInDays(new Date(fecha), new Date())
  if (dias < 0) return `Venció hace ${Math.abs(dias)}d`
  if (dias === 0) return 'Vence hoy'
  return `En ${dias} días`
}

/**
 * Motor de Estadísticas Consolidado.
 */
export function calcularEstadisticas(equipos: any[]) {
  const total = equipos.length
  const dadosDeBaja = equipos.filter(e => e.Estado === 'DE_BAJA_OBSOLETO' || e.Estado === 'OBSOLETO' || e.Estado === 'BAJA').length
  const activos = equipos.filter(e => e.Estado !== 'DE_BAJA_OBSOLETO' && e.Estado !== 'OBSOLETO' && e.Estado !== 'BAJA')
  const totalActivos = activos.length

  const operativos = activos.filter(e => e.Estado === 'OPERATIVO' || e.Estado === 'OPERATIVO_CON_DETALLES').length
  const noAptos = activos.filter(e => e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'VENCIDO').length
  const fueraDeServicio = activos.filter(e => e.Estado === 'FUERA_DE_SERVICIO').length
  
  const alDia = activos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'VERDE').length
  const vencidos = activos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'ROJO').length
  const proximos = activos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'AMARILLO').length
  
  const pctApto = totalActivos > 0 ? Math.round((operativos / totalActivos) * 100) : 0

  return { total, totalActivos, dadosDeBaja, operativos, noAptos, fueraDeServicio, vencidos, proximos, alDia, pctApto }
}

/**
 * Genera un reporte sistémico integral (Plan Maestro).
 */
export function generateSystemReport(equipos: any[], patrones: any[]) {
  const stats = calcularEstadisticas(equipos)
  const totalPatrones = patrones.length
  
  // Normalizar vigencia internamente para garantizar seguridad matemática
  const patronesVigentes = patrones.filter(p => {
    let estado = p.Estado_Vigencia
    if (!p.PDF_Certificado || p.PDF_Certificado.trim() === '') {
      estado = 'SIN CERTIFICADO'
    } else if (p.Fecha_Vencimiento_Certificado && new Date(p.Fecha_Vencimiento_Certificado).getTime() < Date.now()) {
      estado = 'VENCIDO'
    } else {
      estado = 'VIGENTE'
    }
    return estado === 'VIGENTE'
  }).length

  const patronesVencidos = totalPatrones - patronesVigentes
  
  const complianceGlobal = Math.round(((stats.alDia + patronesVigentes) / (stats.totalActivos + totalPatrones || 1)) * 100)

  return {
    ...stats,
    patronesVigentes,
    patronesVencidos,
    totalActivos: stats.totalActivos + totalPatrones,
    complianceGlobal
  }
}

/**
 * Generador de URLs de escaneo universales.
 */
export function getScanUrl(code: string): string {
  if (typeof window === 'undefined') {
    // Fallback para SSR o entornos sin window
    return `https://metrologiapro.vercel.app/visor/${code}`
  }
  return `${window.location.origin}/visor/${code}`
}
