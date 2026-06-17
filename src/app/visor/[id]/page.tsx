import { Metadata } from 'next'
import { PrismaClient } from '@prisma/client'
import { notFound } from 'next/navigation'
import { calcularSemaforo, semaforoLabel, semaforoHex, formatFecha, diasRestantes } from '@/lib/metrologia'
import VisorVerificationButton from '@/components/VisorVerificationButton'

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
    where: { OR: [{ Codigo_Interno: codeParam }, { ID_Equipo: codeParam }] },
    include: {
      historiales: {
        orderBy: { Fecha_Ejecucion: 'desc' },
        take: 1,
        select: {
          Fecha_Ejecucion: true,
          Resultado_Status: true,
          Tecnico_Ejecutor: true,
          Tipo_Verificacion: true,
          Observaciones: true,
        }
      }
    }
  })

  let isPatron = false
  let patronData: any = null

  // Si no está en equipos, buscar en patrones
  if (!assetFound) {
    const patron = await prisma.patronReferencia.findFirst({
      where: { OR: [{ Codigo: codeParam }, { ID_Patron: codeParam }] }
    })
    
    if (patron) {
      isPatron = true
      patronData = patron
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
        Detalles_Estado: null,
        Tiene_Solucion: null,
        Requiere_Seguimiento: null,
        historiales: [],
      } as any
    }
  }

  if (!assetFound) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 24, maxWidth: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 60, height: 60, background: '#fef2f2', borderRadius: 16, display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 28 }}>❌</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Activo No Encontrado</h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>El código <strong style={{ color: '#ef4444' }}>{codeParam}</strong> no existe en la base de datos.</p>
        </div>
      </div>
    )
  }

  const estado = assetFound.Estado
  const detallesEstado = (assetFound as any).Detalles_Estado
  const tieneSolucion = (assetFound as any).Tiene_Solucion
  const requiereSeguimiento = (assetFound as any).Requiere_Seguimiento
  const isOperativoConDetalles = estado === 'OPERATIVO_CON_DETALLES'
  
  const isFuera = estado === 'FUERA_DE_SERVICIO' || estado === 'OBSOLETO' || estado === 'NO_APTO' || estado === 'DE_BAJA_OBSOLETO'
  const semaforoBase = calcularSemaforo(assetFound.Fecha_Proximo_Control, estado)
  
  const sLabel = semaforoLabel(semaforoBase, estado)
  const sColor = semaforoHex(semaforoBase)

  // Último historial
  const ultimaVerificacion = (assetFound as any).historiales?.[0] || null

  // Función para formatear el estado humano
  function estadoHumano(est: string): string {
    const map: Record<string, string> = {
      'OPERATIVO': 'Operativo',
      'OPERATIVO_CON_DETALLES': 'Operativo con Detalles',
      'VENCIDO': 'Vencido',
      'MANTENIMIENTO': 'En Mantenimiento',
      'FUERA_DE_SERVICIO': 'Fuera de Servicio',
      'NO_APTO': 'No Apto',
      'DE_BAJA_OBSOLETO': 'Dado de Baja / Obsoleto',
      'OBSOLETO': 'Obsoleto',
      'BAJA': 'Baja'
    }
    return map[est] || est.replace(/_/g, ' ')
  }

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
          {assetFound.Area_Asignada && (
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              📍 {assetFound.Area_Asignada}
            </div>
          )}

          {/* Badge de Estado */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, background: `${sColor}10`, padding: '8px 16px', borderRadius: 30, border: `1px solid ${sColor}30` }}>
            <div style={{ background: sColor, width: 10, height: 10, borderRadius: '50%', boxShadow: `0 0 10px ${sColor}` }} />
            <span style={{ color: sColor, fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>{estadoHumano(estado)}</span>
          </div>
        </div>

        {/* Detalles del Estado (solo si OPERATIVO_CON_DETALLES) */}
        {isOperativoConDetalles && detallesEstado && (
          <div style={{ 
            margin: '0 24px 16px', 
            padding: '16px 20px', 
            background: '#fffbeb', 
            borderRadius: 16, 
            border: '1px solid #fde68a',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: 20, lineHeight: 1 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>
                Detalles del Estado
              </div>
              <div style={{ fontSize: 13, color: '#78350f', fontWeight: 600, lineHeight: 1.5 }}>
                {detallesEstado}
              </div>
              {tieneSolucion !== null && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                    background: tieneSolucion ? '#dcfce7' : '#fef2f2',
                    color: tieneSolucion ? '#166534' : '#991b1b'
                  }}>
                    {tieneSolucion ? '✅ Tiene solución' : '❌ Sin solución definida'}
                  </span>
                  {requiereSeguimiento && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: '#fff7ed', color: '#9a3412' }}>
                      🔄 Requiere seguimiento
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Responsable (prominente) */}
        {!isPatron && assetFound.Responsable && (
          <div style={{ 
            margin: '0 24px 16px',
            padding: '16px 20px',
            background: '#f0f9ff',
            borderRadius: 16,
            border: '1px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ width: 40, height: 40, background: '#0ea5e9', borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 18, fontWeight: 900 }}>
              {assetFound.Responsable.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responsable</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0c4a6e' }}>{assetFound.Responsable}</div>
            </div>
          </div>
        )}

        {/* Última verificación */}
        <div style={{ 
          background: '#f8fafc',
          margin: '0 24px 16px',
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

        {/* Info de la última verificación registrada */}
        {ultimaVerificacion && (
          <div style={{ margin: '0 24px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📋 Última Inspección Registrada
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Fecha</span>
                <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{formatFecha(ultimaVerificacion.Fecha_Ejecucion)}</span>
              </div>
              <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Tipo</span>
                <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 700 }}>{ultimaVerificacion.Tipo_Verificacion === 'OPERATIVIDAD' ? 'Operatividad' : 'Calibración'}</span>
              </div>
              <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Resultado</span>
                <span style={{ 
                  fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                  background: ultimaVerificacion.Resultado_Status === 'APTO' || ultimaVerificacion.Resultado_Status === 'OPERATIVO' ? '#dcfce7' : '#fef2f2',
                  color: ultimaVerificacion.Resultado_Status === 'APTO' || ultimaVerificacion.Resultado_Status === 'OPERATIVO' ? '#166534' : '#991b1b',
                  textTransform: 'uppercase'
                }}>
                  {ultimaVerificacion.Resultado_Status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Técnico</span>
                <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 700 }}>{ultimaVerificacion.Tecnico_Ejecutor}</span>
              </div>
              {ultimaVerificacion.Observaciones && (
                <>
                  <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                  <div>
                    <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observaciones</span>
                    <span style={{ color: '#475569', fontSize: 12, fontWeight: 600, lineHeight: 1.5, fontStyle: 'italic' }}>{ultimaVerificacion.Observaciones}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Detalles Técnicos */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px' }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🔧 Detalles Técnicos
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
                    <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Periodicidad</span>
                    <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>Cada {assetFound.Periodicidad_Meses} meses</span>
                  </div>
                  <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                  {(assetFound as any).Magnitud && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Magnitud</span>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{(assetFound as any).Magnitud}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                    </>
                  )}
                  {(assetFound as any).Marca && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Marca / Modelo</span>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{(assetFound as any).Marca}{(assetFound as any).Modelo ? ` / ${(assetFound as any).Modelo}` : ''}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                    </>
                  )}
                  {(assetFound as any).Serie && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>N° Serie</span>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{(assetFound as any).Serie}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                    </>
                  )}
                  {(assetFound as any).Rango_Medida && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Rango de Medida</span>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{(assetFound as any).Rango_Medida}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                    </>
                  )}
                </>
              )}

              {isPatron && patronData && (
                <>
                  {patronData.N_Certificado && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>N° Certificado</span>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{patronData.N_Certificado}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                    </>
                  )}
                  {patronData.Proveedor_Laboratorio && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Laboratorio</span>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{patronData.Proveedor_Laboratorio}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                    </>
                  )}
                  {patronData.Magnitud && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Magnitud</span>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{patronData.Magnitud}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#f1f5f9' }} />
                    </>
                  )}
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>ID Sistema</span>
                <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{assetFound.ID_Equipo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        {!isPatron && (
          <div style={{ padding: '0 24px 20px' }}>
            <VisorVerificationButton equipo={assetFound as any} />
          </div>
        )}
        
        <div style={{ background: '#f1f5f9', padding: '16px', textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderTop: '1px solid #e2e8f0' }}>
          POLIFUSION METROLOGY PRO — MODO LECTURA
        </div>

      </div>
    </div>
  )
}
