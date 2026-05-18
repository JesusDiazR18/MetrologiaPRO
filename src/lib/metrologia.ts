import { differenceInDays } from 'date-fns'

// --- Umbrales Configurables (Motor de Reglas) ---
export const THRESHOLDS = {
  WARNING_DAYS: 30,  // Días para pasar a Amarillo
  CRITICAL_DAYS: 0   // Días para pasar a Rojo (Vencido)
}

export type SemaforoColor = 'VERDE' | 'AMARILLO' | 'ROJO'

/**
 * Calcula el color del semáforo basado en la fecha de próximo control y el estado actual.
 */
export function calcularSemaforo(fechaProximo: Date | string | null | undefined, estado?: string): SemaforoColor {
  // Prioridad 1: Estados críticos de gestión
  if (estado === 'DE_BAJA_OBSOLETO' || estado === 'OBSOLETO' || estado === 'BAJA' || estado === 'FUERA_DE_SERVICIO' || estado === 'VENCIDO' || estado === 'NO_APTO') return 'ROJO'
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
 */
export function calcularVariacion(instrumento: number, patron: number): number {
  return parseFloat((instrumento - patron).toFixed(6))
}

export function calcularStatus(variacion: number, tolerancia: number): 'APTO' | 'NO_APTO' {
  return Math.abs(variacion) <= tolerancia ? 'APTO' : 'NO_APTO'
}

export function calcularProximoControl(from: Date, meses: number): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() + meses)
  return d
}

/**
 * Formateo de fechas estandarizado.
 */
export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
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
  const operativos = equipos.filter(e => e.Estado === 'OPERATIVO' || e.Estado === 'OPERATIVO_CON_DETALLES').length
  const noAptos = equipos.filter(e => e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'VENCIDO').length
  const fueraDeServicio = equipos.filter(e => e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'BAJA' || e.Estado === 'OBSOLETO' || e.Estado === 'DE_BAJA_OBSOLETO').length
  
  const alDia = equipos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'VERDE' && e.Estado !== 'DE_BAJA_OBSOLETO' && e.Estado !== 'OBSOLETO' && e.Estado !== 'BAJA').length
  const vencidos = equipos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'ROJO').length
  const proximos = equipos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control, e.Estado) === 'AMARILLO').length
  
  const pctApto = total > 0 ? Math.round((operativos / total) * 100) : 0

  return { total, operativos, noAptos, fueraDeServicio, vencidos, proximos, alDia, pctApto }
}

/**
 * Genera un reporte sistémico integral (Plan Maestro).
 */
export function generateSystemReport(equipos: any[], patrones: any[]) {
  const stats = calcularEstadisticas(equipos)
  const totalPatrones = patrones.length
  const patronesVigentes = patrones.filter(p => p.Estado_Vigencia === 'VIGENTE').length
  const patronesVencidos = totalPatrones - patronesVigentes
  
  const complianceGlobal = Math.round(((stats.alDia + patronesVigentes) / (equipos.length + totalPatrones || 1)) * 100)

  return {
    ...stats,
    patronesVigentes,
    patronesVencidos,
    totalActivos: equipos.length + totalPatrones,
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
