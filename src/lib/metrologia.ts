import { differenceInDays } from 'date-fns'

export type SemaforoColor = 'VERDE' | 'AMARILLO' | 'ROJO'

export function calcularSemaforo(fechaProximo: Date | string | null | undefined): SemaforoColor {
  if (!fechaProximo) return 'ROJO'
  const dias = differenceInDays(new Date(fechaProximo), new Date())
  if (dias > 30) return 'VERDE'
  if (dias >= 0) return 'AMARILLO'
  return 'ROJO'
}

export function semaforoHex(s: SemaforoColor): string {
  if (s === 'VERDE') return '#22c55e'
  if (s === 'AMARILLO') return '#f59e0b'
  return '#ef4444'
}

export function semaforoLabel(s: SemaforoColor): string {
  if (s === 'VERDE') return 'Al día'
  if (s === 'AMARILLO') return 'Por vencer'
  return 'Vencido'
}

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

export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function diasRestantes(fecha: Date | string | null | undefined): string {
  if (!fecha) return 'Sin fecha'
  const dias = differenceInDays(new Date(fecha), new Date())
  if (dias < 0) return `Venció hace ${Math.abs(dias)}d`
  if (dias === 0) return 'Vence hoy'
  return `En ${dias} días`
}

export function calcularEstadisticas(equipos: Array<{
  Estado: string
  Fecha_Proximo_Control: Date | string | null
}>) {
  const total = equipos.length
  const operativos = equipos.filter(e => e.Estado === 'OPERATIVO').length
  const noAptos = equipos.filter(e => e.Estado === 'NO_APTO').length
  const baja = equipos.filter(e => e.Estado === 'BAJA').length
  const vencidos = equipos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control) === 'ROJO').length
  const proximos = equipos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control) === 'AMARILLO').length
  const alDia = equipos.filter(e => calcularSemaforo(e.Fecha_Proximo_Control) === 'VERDE').length
  const pctApto = total > 0 ? Math.round((operativos / total) * 100) : 0
  return { total, operativos, noAptos, baja, vencidos, proximos, alDia, pctApto }
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

export function getScanUrl(code: string): string {
  if (typeof window === 'undefined') {
    return `https://metrologia-plf.vercel.app/escaneo?q=${code}`
  }
  return `${window.location.origin}/escaneo?q=${code}`
}
