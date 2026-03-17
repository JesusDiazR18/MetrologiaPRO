'use client'
import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, SlidersHorizontal, Plus, ChevronsDown, 
  ChevronsUp, CheckCircle2, XCircle, Calendar, User, QrCode, FileDigit, ShieldCheck, Activity 
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { calcularSemaforo, semaforoHex, semaforoLabel, formatFecha, diasRestantes, getScanUrl } from '@/lib/metrologia'
import VerificationModal from '@/components/VerificationModal'
import CreateEquipoModal from '@/components/CreateEquipoModal'
import QRLabelModal from '@/components/QRLabelModal'

interface Equipo {
  ID_Equipo: string
  Tipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Area_Asignada: string | null
  Responsable: string | null
  Periodicidad_Meses: number
  Fecha_Ultima_Verificacion: string | null
  Fecha_Proximo_Control: string | null
  Estado: string
  historiales: {
    ID_Log: string
    Fecha_Ejecucion: string
    Variacion_Calculada: number | null
    Resultado_Status: string
    Tecnico_Ejecutor: string
    Observaciones?: string | null
  }[]
}

export default function EquiposPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: '100px auto' }} />}>
      <EquiposContent />
    </Suspense>
  )
}

function EquiposContent() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modalEquipo, setModalEquipo] = useState<Equipo | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [qrLabelEquipo, setQrLabelEquipo] = useState<Equipo | null>(null)
  const searchParams = useSearchParams()

  const load = useCallback(async (query = '', tipoF = '') => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (tipoF) params.set('tipo', tipoF)
    try {
      const r = await fetch('/api/equipos?' + params.toString())
      const data = await r.json()
      setEquipos(data)
      
      // Auto-expand if exact match or single result
      if (query && data.length === 1) {
        setExpanded(data[0].ID_Equipo)
      } else if (query) {
        const exact = data.find((e: Equipo) => e.Codigo_Interno.toLowerCase() === query.toLowerCase())
        if (exact) setExpanded(exact.ID_Equipo)
      }
    } catch (e) {
      console.error("Error loading equipos", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const qParam = searchParams.get('q')
    if (qParam) {
      setQ(qParam)
      load(qParam)
    } else {
      load()
    }
  }, [searchParams, load])

  const handleDeBaja = async (id: string, nombre: string) => {
    const motivo = prompt(`¿Estás seguro de que deseas poner el equipo "${nombre}" FUERA DE SERVICIO? Por favor, indica el motivo:`)
    if (motivo === null) return 
    if (!motivo.trim()) return alert('Debes indicar un motivo para dar de baja el equipo.')
    
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: 'FUERA_DE_SERVICIO',
          observaciones: `MOTIVO DE BAJA: ${motivo}`
        })
      })
      if (res.ok) {
        load(q, tipo)
      } else {
        alert('Error al actualizar el estado')
      }
    } catch (e) {
      alert('Error de red')
    }
  }

  const handleHabilitar = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas volver a HABILITAR el equipo "${nombre}"?`)) return
    
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: 'OPERATIVO',
          observaciones: `EQUIPO RE-HABILITADO: El equipo vuelve a estar disponible para su uso.`
        })
      })
      if (res.ok) {
        load(q, tipo)
      } else {
        alert('Error al habilitar el equipo')
      }
    } catch (e) {
      alert('Error de red')
    }
  }

  const handleSearch = () => { load(q, tipo) }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon">
          <ClipboardList size={22} />
        </div>
        <div>
          <h1>Fichas Técnicas</h1>
          <p>Gestión y seguimiento de instrumentos del sistema QMS</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Añadir Activo
          </button>
          <button className="btn btn-cyan" onClick={() => setModalEquipo({} as Equipo)}>
            <Activity size={16} /> Nueva Verificación
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ marginRight: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtros de Vista</div>
            </div>
            <select 
              className="btn-scan" 
              style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', boxShadow: 'none' }}
              value={tipo} 
              onChange={e => { setTipo(e.target.value); load(q, e.target.value) }}
            >
              <option value="">Todos los tipos</option>
              <option value="EQUIPO">Equipos</option>
              <option value="INSTRUMENTO">Instrumentos</option>
            </select>
          </div>
        </div>
      </div>


      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-dim)' }}>Sincronizando base de datos...</p>
          </div>
        ) : equipos.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 80 }}>
            <ClipboardList size={48} opacity={0.2} style={{ margin: '0 auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 600 }}>No se encontraron registros</p>
            <p style={{ color: 'var(--text-dim)' }}>Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th>Identificación</th>
                  <th>Nombre del Equipo</th>
                  <th>Responsable / Estado</th>
                  <th>Próxima Verif.</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((e) => {
                  const semaforo = calcularSemaforo(e.Fecha_Proximo_Control)
                  const isExpanded = expanded === e.ID_Equipo
                  const isFuera = e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'OBSOLETO' || e.Estado === 'NO_APTO';
                  const statusColor = isFuera ? 'var(--danger)' : semaforoHex(semaforo);
                  
                  return (
                    <React.Fragment key={e.ID_Equipo}>
                      <tr 
                        onClick={() => setExpanded(isExpanded ? null : e.ID_Equipo)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="semaforo-dot" style={{ 
                            background: statusColor,
                            boxShadow: `0 0 15px ${statusColor}66`
                          }} />
                        </td>
                        <td>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: 700, 
                            color: 'var(--accent)',
                            background: 'rgba(0, 229, 255, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>{e.Codigo_Interno}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{e.Nombre_Equipo}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{e.Tipo} · {e.Area_Asignada ?? 'Sin área'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{e.Responsable ?? '—'}</div>
                          <div style={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            color: statusColor,
                            textTransform: 'uppercase',
                            marginTop: 4
                          }}>
                            {e.Estado === 'FUERA_DE_SERVICIO' ? '● FUERA DE SERVICIO' : `● ${semaforoLabel(semaforo)}`}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{formatFecha(e.Fecha_Proximo_Control)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{diasRestantes(e.Fecha_Proximo_Control)}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button 
                            className="btn-scan" 
                            style={{ padding: '6px 14px', fontSize: 11, background: 'var(--accent)', color: '#000', fontWeight: 800, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0, 229, 255, 0.3)' }}
                            onClick={(ev) => { ev.stopPropagation(); setModalEquipo(e); }}
                            >Verificar</button>
                            <div style={{ color: 'var(--text-dim)', padding: '0 8px' }}>
                              {isExpanded ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, background: 'rgba(0,0,0,0.1)' }}>
                            <div style={{ padding: '24px 40px', borderLeft: `4px solid ${statusColor}` }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 24, marginBottom: 24 }}>
                                <div className="expanded-details" style={{ animation: 'slideDown 0.3s ease-out' }}>
                                  <div 
                                    className="card" 
                                    style={{ padding: 24, display: 'flex', gap: 16, background: 'var(--page-bg-soft)', alignItems: 'center', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onClick={ev => { ev.stopPropagation(); setQrLabelEquipo(e) }}
                                    title="Haz clic para ver e imprimir la etiqueta"
                                  >
                                    <div style={{ background: '#fff', padding: 10, borderRadius: 14, display: 'inline-block', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' }}>
                                      <QRCodeSVG
                                        value={getScanUrl(e.Codigo_Interno)}
                                        size={100}
                                        bgColor="#ffffff"
                                        fgColor="#0f172a"
                                        level="H"
                                        style={{ display: 'block', borderRadius: 4 }}
                                      />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>CÓDIGO DIGITAL QR</div>
                                      <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, background: 'var(--accent-dim)', padding: '3px 10px', borderRadius: 999  }}>🖨️ Clic para imprimir etiqueta</div>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                  <div className="card" style={{ padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                      <FileDigit size={16} color="var(--accent)" />
                                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Especificaciones</span>
                                    </div>
                                    <div className="spec-row">
                                      <span className="spec-label">Modelo</span>
                                      <span className="spec-value">Standard Series v2</span>
                                    </div>
                                    <div className="spec-row">
                                      <span className="spec-label">Tolerancia</span>
                                      <span className="spec-value">±{e.Tolerancia_Aceptable} {e.Unidad_Tolerancia ?? 'un'}</span>
                                    </div>
                                    <div className="spec-row">
                                      <span className="spec-label">Próxima Verif.</span>
                                      <span className="spec-value" style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatFecha(e.Fecha_Proximo_Control)}</span>
                                    </div>
                                    <div className="spec-row" style={{ marginTop: -4 }}>
                                      <span className="spec-label">Intervalo</span>
                                      <span className="spec-value">{e.Periodicidad_Meses} Meses</span>
                                    </div>
                                  </div>

                                  <div className="card" style={{ padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                      <ShieldCheck size={16} color="var(--success)" />
                                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seguridad y Control</span>
                                    </div>
                                    <div className="spec-row">
                                      <span className="spec-label">Ubicación</span>
                                      <span className="spec-value">{e.Area_Asignada}</span>
                                    </div>
                                    <div className="spec-row">
                                      <span className="spec-label">Responsable</span>
                                      <span className="spec-value">{e.Responsable}</span>
                                    </div>
                                    <div className="spec-row">
                                      <span className="spec-label">Estado Sist.</span>
                                      <span className="spec-value" style={{ color: statusColor }}>{e.Estado}</span>
                                    </div>
                                    <div style={{ marginTop: 10, textAlign: 'right' }}>
                                      {e.Estado === 'FUERA_DE_SERVICIO' ? (
                                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--success)', padding: '0 4px' }} onClick={(ev) => { ev.stopPropagation(); handleHabilitar(e.ID_Equipo, e.Nombre_Equipo) }}>Re-habilitar Activo</button>
                                      ) : (
                                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)', padding: '0 4px' }} onClick={(ev) => { ev.stopPropagation(); handleDeBaja(e.ID_Equipo, e.Nombre_Equipo) }}>Dar de Baja</button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="card" style={{ overflow: 'hidden' }}>
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                    <th>Fecha</th>
                                    <th>Variación</th>
                                    <th>Resultado</th>
                                    <th>Técnico</th>
                                      <th>Observaciones</th>
                                     </tr>
                                  </thead>
                                  <tbody>
                                    {e.historiales.map(h => (
                                      <tr key={h.ID_Log}>
                                        <td>{formatFecha(h.Fecha_Ejecucion)}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{h.Variacion_Calculada?.toFixed(4) ?? '—'}</td>
                                        <td>
                                        <span className={`status-badge`} style={{ color: h.Resultado_Status === 'APTO' ? 'var(--success)' : 'var(--danger)' }}>
                                        {h.Resultado_Status}
                                        </span>
                                        </td>
                                        <td>{h.Tecnico_Ejecutor}</td>
                                         <td style={{ fontSize: 11, color: 'var(--text-soft)', maxWidth: 200, whiteSpace: 'normal' }}>{h.Observaciones || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .spec-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .spec-row:last-child {
          border-bottom: none;
        }
        .spec-label {
          font-size: 12px;
          color: var(--text-dim);
        }
        .spec-value {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-main);
        }
        .btn-xs {
          font-size: 10px;
          padding: 4px 8px;
        }
      `}</style>

      {modalEquipo !== null && (
        <VerificationModal
          equipo={modalEquipo.ID_Equipo ? modalEquipo : null}
          equipos={equipos}
          onClose={() => setModalEquipo(null)}
          onSaved={() => { setModalEquipo(null); load(q, tipo) }}
        />
      )}
      {showCreateModal && (
        <CreateEquipoModal 
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); load(q, tipo) }}
        />
      )}
      {qrLabelEquipo && (
        <QRLabelModal
          asset={{
            id: qrLabelEquipo.ID_Equipo,
            code: qrLabelEquipo.Codigo_Interno,
            name: qrLabelEquipo.Nombre_Equipo,
            status: qrLabelEquipo.Estado,
            statusLabel: semaforoLabel(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control)),
            statusColor: qrLabelEquipo.Estado === 'FUERA_DE_SERVICIO' ? '#ef4444' : semaforoHex(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control))
          }}
          onClose={() => setQrLabelEquipo(null)}
        />
      )}
    </div>
  )
}
