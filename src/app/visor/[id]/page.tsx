import { Metadata } from 'next'
import { PrismaClient } from '@prisma/client'
import { notFound } from 'next/navigation'
import { FileDigit, Activity } from 'lucide-react'
import { calcularSemaforo, semaforoLabel, semaforoHex, formatFecha, diasRestantes } from '@/lib/metrologia'

const prisma = new PrismaClient()

export const metadata: Metadata = {
  title: 'Ficha Técnica - Sistema Metrológico',
  description: 'Visor público de ficha técnica de equipos, instrumentos y patrones',
}

export default async function VisorPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const codeParam = decodeURIComponent(id).trim().toUpperCase()

  // Buscar en equipos
  let assetFound = await prisma.instrumentoEquipo.findFirst({
    where: { OR: [{ Codigo_Interno: codeParam }, { ID_Equipo: codeParam }] }
  })

  let isPatron = false

  // Si no está en equipos, buscar en patrones
  if (!assetFound) {
    const patron = await prisma.patronReferencia.findFirst({
      where: { OR: [{ Codigo: codeParam }, { ID_Patron: codeParam }] }
    })
    
    if (patron) {
      isPatron = true
      assetFound = {
        ID_Equipo: patron.ID_Patron,
        Codigo_Interno: patron.Codigo,
        Nombre_Equipo: patron.Nombre_Patron,
        Tipo: 'PATRON',
        Estado: patron.Estado_Vigencia === 'VIGENTE' ? 'OPERATIVO' : 'VENCIDO',
        Fecha_Ultima_Verificacion: patron.Fecha_Calibracion_Externa,
        Fecha_Proximo_Control: patron.Fecha_Vencimiento_Certificado,
        Area_Asignada: patron.Proveedor_Laboratorio || '',
        Responsable: '',
        Tolerancia_Aceptable: 0,
        Periodicidad_Meses: 0,
      } as any
    }
  }

  if (!assetFound) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Activo No Encontrado</h2>
        <p>El código <strong>{codeParam}</strong> no existe en la base de datos.</p>
      </div>
    )
  }

  const isFuera = assetFound.Estado === 'FUERA_DE_SERVICIO' || assetFound.Estado === 'OBSOLETO' || assetFound.Estado === 'NO_APTO'
  const semaforoBase = calcularSemaforo(assetFound.Fecha_Proximo_Control)
  
  const sLabel = isFuera ? assetFound.Estado.replace(/_/g, ' ') : semaforoLabel(semaforoBase)
  const sColor = isFuera ? '#ef4444' : semaforoHex(semaforoBase)

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '500px', background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
        
        {/* Encabezado */}
        <div style={{ borderLeft: `8px solid ${sColor}`, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ background: '#f1f5f9', color: '#334155', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800, border: '1px solid #e2e8f0' }}>
              {assetFound.Codigo_Interno}
            </span>
            <span style={{ background: '#f8fafc', color: '#64748b', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
              {assetFound.Tipo}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '12px 0 8px', lineHeight: 1.2 }}>
            {assetFound.Nombre_Equipo}
          </h1>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {assetFound.Area_Asignada || 'Ubicación General'}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, background: '#f8fafc', padding: '6px 12px', borderRadius: 30, border: '1px solid #e2e8f0' }}>
            <div style={{ background: sColor, width: 10, height: 10, borderRadius: '50%', boxShadow: `0 0 10px ${sColor}` }} />
            <span style={{ color: sColor, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{sLabel}</span>
          </div>
        </div>

        {/* Bloque Próxima Revisión */}
        <div style={{ 
          background: `${sColor}0f`, 
          margin: '0 24px 16px', 
          padding: '24px', 
          borderRadius: 20, 
          border: `1px dashed ${sColor}40`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Próxima {isPatron ? 'Calibración' : 'Verificación'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: 8 }}>
            {formatFecha(assetFound.Fecha_Proximo_Control)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: sColor }}>
            {diasRestantes(assetFound.Fecha_Proximo_Control)}
          </div>
        </div>

        <div style={{ 
          background: '#f8fafc',
          margin: '0 24px 20px',
          padding: '16px',
          borderRadius: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Última {isPatron ? 'Calibración' : 'Verificación'}
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
            {formatFecha(assetFound.Fecha_Ultima_Verificacion) || 'No registrada'}
          </span>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px' }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <FileDigit size={16} color="#0ea5e9" /> Detalles Técnicos
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!isPatron && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Tolerancia Aceptable</span>
                    <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>±{assetFound.Tolerancia_Aceptable} {assetFound.Unidad_Tolerancia}</span>
                  </div>
                  <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Responsable</span>
                    <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{assetFound.Responsable || 'N/A'}</span>
                  </div>
                  <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>ID Sistema</span>
                <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{assetFound.ID_Equipo}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ background: '#f1f5f9', padding: '16px', textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderTop: '1px solid #e2e8f0' }}>
          POLIFUSION METROLOGY PRO — MODO LECTURA
        </div>

      </div>
    </div>
  )
}
