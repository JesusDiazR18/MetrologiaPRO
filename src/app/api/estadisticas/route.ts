import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularSemaforo } from '@/lib/metrologia'

export async function GET() {
  const equipos = await prisma.instrumentoEquipo.findMany()
  const patrones = await prisma.patronReferencia.findMany()
  const historiales = await prisma.historialVerificacion.findMany({
    orderBy: { Fecha_Ejecucion: 'desc' },
    take: 50,
    include: {
      equipo: { select: { Nombre_Equipo: true, Codigo_Interno: true } },
    }
  })

  const total = equipos.length
  const operativos = equipos.filter(e => e.Estado === 'OPERATIVO').length
  const obsoletos = equipos.filter(e => 
    ['OBSOLETO', 'BAJA', 'FUERA DE USO', 'FUERA_DE_SERVICIO'].includes(e.Estado)
  ).length
  const noAptos = equipos.filter(e => e.Estado === 'NO_APTO' || e.Estado === 'NO APTO').length
  const vencidos = equipos.filter(e => e.Estado === 'OPERATIVO' && calcularSemaforo(e.Fecha_Proximo_Control) === 'ROJO').length
  const proximos = equipos.filter(e => e.Estado === 'OPERATIVO' && calcularSemaforo(e.Fecha_Proximo_Control) === 'AMARILLO').length
  const alDia = equipos.filter(e => e.Estado === 'OPERATIVO' && calcularSemaforo(e.Fecha_Proximo_Control) === 'VERDE').length
  
  const totalActivos = total - obsoletos
  const pctApto = totalActivos > 0 ? Math.round(((totalActivos - noAptos) / totalActivos) * 100) : 0
  const porciento = pctApto // Unificar
  const equiposByTipo = [
    { name: 'Equipos', value: equipos.filter(e => e.Tipo === 'EQUIPO').length },
    { name: 'Instrumentos', value: equipos.filter(e => e.Tipo === 'INSTRUMENTO').length },
  ]

  return NextResponse.json({
    total, operativos, noAptos, vencidos, proximos, alDia, pctApto, porciento,
    equiposByTipo,
    ultimasVerificaciones: historiales.slice(0, 10),
    patronesVigentes: patrones.filter(p => p.Estado_Vigencia === 'VIGENTE').length,
    patronesVencidos: patrones.filter(p => p.Estado_Vigencia === 'VENCIDO').length,
  })
}
