'use client'
import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, SlidersHorizontal, Plus, ChevronsDown, 
  ChevronsUp, CheckCircle2, XCircle, Calendar, User, QrCode, FileDigit, ShieldCheck, Activity, Trash2, FileText, Edit, RefreshCw, RotateCcw
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { calcularSemaforo, semaforoHex, semaforoLabel, formatFecha, diasRestantes, getScanUrl } from '@/lib/metrologia'
import { generateTechnicalSheetPDF } from '@/lib/reports'
import VerificationModal from '@/components/VerificationModal'
import CreateEquipoModal from '@/components/CreateEquipoModal'
import EditEquipoModal from '@/components/EditEquipoModal'
import RenewCertModal from '@/components/RenewCertModal'
import QRLabelModal from '@/components/QRLabelModal'
import HistoricalVerificationModal from '@/components/HistoricalVerificationModal'
import { toast } from 'react-hot-toast'

interface Equipo {
  ID_Equipo: string
  Tipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Marca?: string
  Modelo?: string
  Serie?: string
  Rango_Medida?: string
  Resolucion?: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Area_Asignada: string | null
  Responsable: string | null
  Periodicidad_Meses: number
  Fecha_Ultima_Verificacion: string | null
  Fecha_Proximo_Control: string | null
  Fecha_Ingreso?: string | null
  Estado: string
  Detalles_Estado?: string | null
  Tiene_Solucion?: boolean | null
  Requiere_Seguimiento?: boolean | null
  Magnitud?: string | null
  Accesorios?: string | null
  Insumos?: string | null
  N_Certificado?: string | null
  Proveedor_Servicio?: string | null
  Fecha_Vencimiento_Certificado?: string | null
  PDF_Certificado?: string | null
  Foto_Equipo?: string | null
  historiales: {
    ID_Log: string
    Fecha_Ejecucion: string
    Variacion_Calculada: number | null
    Resultado_Status: string
    Tecnico_Ejecutor: string
    Observaciones?: string | null
    Evidencia_Foto?: string | null
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
  const [editEquipo, setEditEquipo] = useState<Equipo | null>(null)
  const [renewEquipo, setRenewEquipo] = useState<Equipo | null>(null)
  const [qrLabelEquipo, setQrLabelEquipo] = useState<Equipo | null>(null)
  const [modalHistorical, setModalHistorical] = useState<Equipo | null>(null)
  const [showHistoricalModal, setShowHistoricalModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const load = useCallback(async (query = '', tipoF = '') => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (tipoF) params.set('tipo', tipoF)
    try {
      const r = await fetch('/api/equipos?' + params.toString())
      const data = await r.json()
      
      if (Array.isArray(data)) {
        setEquipos(data)
        if (query && data.length === 1) {
          setExpanded(data[0].ID_Equipo)
        } else if (query) {
          const exact = data.find((e: Equipo) => 
            e.Codigo_Interno.toLowerCase() === query.toLowerCase() ||
            e.ID_Equipo.toLowerCase() === query.toLowerCase()
          )
          if (exact) setExpanded(exact.ID_Equipo)
        }
      } else {
        console.error("API returned non-array data:", data)
        setEquipos([])
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
    const motivo = prompt(`¿Estás seguro de que deseas dar de baja o marcar como obsoleto el equipo "${nombre}"? Por favor, indica el motivo:`)
    if (motivo === null) return 
    if (!motivo.trim()) return toast.error('Debes indicar un motivo para dar de baja el equipo.')
    
    const updatePromise = fetch(`/api/equipos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: 'DE_BAJA_OBSOLETO',
        detalles_estado: `Motivo de Baja / Obsoleto: ${motivo}`,
        tiene_solucion: false,
        requiere_seguimiento: false,
        observaciones: `Baja / Obsoleto: ${motivo}`
      })
    }).then(res => {
      if (!res.ok) throw new Error('Error al actualizar el estado')
      load(q, tipo)
    })

    toast.promise(updatePromise, {
      loading: 'Procesando...',
      success: 'Equipo dado de baja correctamente',
      error: 'Error de red o servidor'
    })
  }

  const handleHabilitar = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas volver a HABILITAR el equipo "${nombre}"?`)) return
    
    const updatePromise = fetch(`/api/equipos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: 'OPERATIVO',
        detalles_estado: null,
        tiene_solucion: true,
        requiere_seguimiento: false,
        observaciones: `EQUIPO RE-HABILITADO: El equipo vuelve a estar disponible para su uso.`
      })
    }).then(res => {
      if (!res.ok) throw new Error('Error al habilitar el equipo')
      load(q, tipo)
    })

    toast.promise(updatePromise, {
      loading: 'Habilitando...',
      success: 'Equipo restaurado a Operativo',
      error: 'Error de red o servidor'
    })
  }

  const handleEliminarActivo = async (id: string, nombre: string) => {
    if (!confirm(`🚨 ADVERTENCIA: ¿Estás completamente seguro de que deseas ELIMINAR el activo "${nombre}" (${id}) y todo su historial de verificaciones?\n\nEsta acción no se puede deshacer.`)) return
    
    const deletePromise = fetch(`/api/equipos/${id}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar')
      load(q, tipo)
    })

    toast.promise(deletePromise, {
      loading: 'Eliminando activo...',
      success: 'Activo e historial eliminados correctamente',
      error: 'Error al eliminar el activo'
    })
  }

  const handleEliminarHistorial = async (idLog: string, activoNombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente esta verificación del historial de "${activoNombre}"?\n\nLas fechas de próxima verificación se recalcularán automáticamente.`)) return
    
    const deletePromise = fetch(`/api/historial/${idLog}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar el registro')
      load(q, tipo)
    })

    toast.promise(deletePromise, {
      loading: 'Eliminando registro...',
      success: 'Verificación eliminada y fechas actualizadas',
      error: 'Error al eliminar el registro'
    })
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon">
          <ClipboardList size={22} />
        </div>
        <div>
          <h1>Fichas Técnicas e Instrumentos</h1>
          <p>Catálogo centralizado de activos metrológicos del sistema QMS</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Añadir Activo
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--accent)', border: '1px solid rgba(0, 229, 255, 0.2)' }} onClick={() => setShowHistoricalModal(true)}>
            <RotateCcw size={16} /> Verificación Anterior
          </button>
          <button className="btn btn-cyan" onClick={() => setModalEquipo({} as Equipo)}>
            <Activity size={16} /> Nueva Verificación
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 280px' }}>
              <Search size={18} color="var(--text-dim)" />
              <input 
                type="text" 
                placeholder="Buscar por ID, nombre o código QR..." 
                value={q} 
                onChange={e => { setQ(e.target.value); load(e.target.value, tipo) }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: 14 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Filtro:</span>
              <select 
                style={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
      </div>


      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-dim)' }}>Sincronizando base de datos metrológica...</p>
          </div>
        ) : equipos.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 80 }}>
            <ClipboardList size={48} opacity={0.2} style={{ margin: '0 auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 600 }}>No se encontraron registros</p>
            <p style={{ color: 'var(--text-dim)' }}>Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}></th>
                  <th className="desktop-only" style={{ width: '15%' }}>Identificación</th>
                  <th style={{ width: '30%' }}>Nombre del Equipo</th>
                  <th className="desktop-only" style={{ width: '20%' }}>Responsable / Estado</th>
                  <th style={{ width: '15%' }}>Próxima Verif.</th>
                  <th style={{ textAlign: 'right', width: '15%', minWidth: '150px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((e) => {
                  const semaforo = calcularSemaforo(e.Fecha_Proximo_Control, e.Estado)
                  const isExpanded = expanded === e.ID_Equipo
                  const statusColor = semaforoHex(semaforo)
                  
                  return (
                    <React.Fragment key={e.ID_Equipo}>
                      <tr 
                        onClick={() => setExpanded(isExpanded ? null : e.ID_Equipo)}
                        style={{ cursor: 'pointer' }}
                        className="mobile-card-row"
                      >
                        <td className="mobile-hide">
                          <div className="semaforo-dot" style={{ 
                            background: statusColor,
                            boxShadow: `0 0 15px ${statusColor}66`
                          }} />
                        </td>
                        <td className="desktop-only">
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: 700, 
                            color: 'var(--accent)',
                            background: 'rgba(0, 229, 255, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>{e.ID_Equipo}</span>
                        </td>
                        <td className="mobile-card-title">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div className="mobile-only semaforo-dot" style={{ background: statusColor, boxShadow: `0 0 15px ${statusColor}66` }} />
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{e.Nombre_Equipo}</div>
                            {e.Magnitud && (
                              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 12, color: 'var(--accent)', border: '1px solid rgba(0, 229, 255, 0.2)', fontWeight: 600 }}>
                                {e.Magnitud}
                              </span>
                            )}
                          </div>
                          <div className="desktop-only" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{e.Tipo} · {e.Area_Asignada ?? 'Sin área'}</div>
                          <div className="mobile-only" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{e.ID_Equipo} · {e.Area_Asignada ?? 'Sin área'}</div>
                        </td>
                        <td className="desktop-only">
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{e.Responsable ?? '—'}</div>
                          <div style={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            color: statusColor,
                            textTransform: 'uppercase',
                            marginTop: 4
                          }}>
                            ● {semaforoLabel(semaforo, e.Estado)}
                          </div>
                        </td>
                        <td className="mobile-card-info">
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{formatFecha(e.Fecha_Proximo_Control)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{diasRestantes(e.Fecha_Proximo_Control)}</div>
                        </td>
                        <td style={{ textAlign: 'right', minWidth: '150px' }} className="mobile-card-actions">
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                            className="btn-scan" 
                            style={{ padding: '6px 14px', fontSize: 11, background: 'var(--accent)', color: 'var(--oxford-blue-dark)', fontWeight: 800, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px var(--accent-glow)' }}
                            onClick={(ev) => { ev.stopPropagation(); setModalEquipo(e); }}
                            >Verificar</button>
                            <div style={{ color: 'var(--text-dim)', padding: '0 4px' }}>
                              {isExpanded ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, background: 'rgba(0,0,0,0.1)' }}>
                            <div style={{ padding: 'clamp(12px, 2vw, 24px) clamp(16px, 3vw, 40px)', borderLeft: `4px solid ${statusColor}` }}>
                              {(e.Detalles_Estado || e.Requiere_Seguimiento || e.Tiene_Solucion === false) && (
                                <div style={{ 
                                  background: e.Tiene_Solucion !== false ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                  border: `1px solid ${e.Tiene_Solucion !== false ? '#f59e0b' : '#ef4444'}`, 
                                  borderRadius: 12, 
                                  padding: '14px 20px', 
                                  marginBottom: 20, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 16, 
                                  flexWrap: 'wrap',
                                  animation: 'fadeIn 0.3s' 
                                }}>
                                  <div style={{ fontSize: 24 }}>{e.Tiene_Solucion !== false ? '⚠️' : '🚨'}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: e.Tiene_Solucion !== false ? '#f59e0b' : '#ef4444', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                      <span>ESTADO: {semaforoLabel(semaforo, e.Estado).toUpperCase()}</span>
                                      {e.Requiere_Seguimiento && (
                                        <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>SEGUIMIENTO ACTIVO</span>
                                      )}
                                      {e.Tiene_Solucion === false && (
                                        <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>SIN SOLUCIÓN TÉCNICA</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-color)', marginTop: 4 }}>
                                      {e.Detalles_Estado || 'Sin detalles especificados.'}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, width: '100%', animation: 'slideDown 0.3s ease-out' }}>
                                <div 
                                  className="card" 
                                  style={{ padding: 20, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', minHeight: 180 }}
                                  onClick={ev => { ev.stopPropagation(); setQrLabelEquipo(e) }}
                                  title="Haz clic para ver e imprimir la etiqueta"
                                >
                                  <div style={{ background: '#fff', padding: 10, borderRadius: 14, boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' }}>
                                    <QRCodeSVG
                                      value={getScanUrl(e.ID_Equipo)}
                                      size={84}
                                      bgColor="#ffffff"
                                      fgColor="#0f172a"
                                      level="H"
                                      style={{ display: 'block', borderRadius: 4 }}
                                    />
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>CÓDIGO DIGITAL QR</div>
                                    <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 600, background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 999, marginBottom: 8 }}>🖨️ Clic para imprimir etiqueta</div>
                                    <button 
                                      className="btn btn-ghost btn-xs" 
                                      style={{ fontSize: 10, color: 'var(--accent)', border: '1px solid var(--accent-dim)' }}
                                      onClick={(ev) => { ev.stopPropagation(); generateTechnicalSheetPDF(e); }}
                                    >
                                      📄 Descargar Ficha PDF
                                    </button>
                                  </div>
                                </div>

                                <div className="card" style={{ padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <FileDigit size={16} color="var(--accent)" />
                                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Especificaciones</span>
                                  </div>
                                  {(e.Modelo || e.Serie) && (e.Modelo !== '—' || e.Serie !== '—') && (
                                    <div className="spec-row">
                                      <span className="spec-label">Modelo / Serie</span>
                                      <span className="spec-value">{e.Modelo || '—'} / {e.Serie || '—'}</span>
                                    </div>
                                  )}
                                  {e.Tolerancia_Aceptable != null && (
                                    <div className="spec-row">
                                      <span className="spec-label">Tolerancia</span>
                                      <span className="spec-value">±{e.Tolerancia_Aceptable} {e.Unidad_Tolerancia ?? 'un'}</span>
                                    </div>
                                  )}
                                  {e.Fecha_Ingreso && (
                                    <div className="spec-row">
                                      <span className="spec-label">Fecha Ingreso</span>
                                      <span className="spec-value">{formatFecha(e.Fecha_Ingreso)}</span>
                                    </div>
                                  )}
                                  <div className="spec-row">
                                    <span className="spec-label">Próxima Verif.</span>
                                    <span className="spec-value" style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatFecha(e.Fecha_Proximo_Control)}</span>
                                  </div>
                                  <div className="spec-row" style={{ marginTop: -4 }}>
                                    <span className="spec-label">Intervalo</span>
                                    <span className="spec-value">{e.Periodicidad_Meses} Meses</span>
                                  </div>
                                  {e.Accesorios && e.Accesorios.trim() !== '' && e.Accesorios.trim() !== '—' && (
                                    <div className="spec-row" style={{ alignItems: 'flex-start' }}>
                                      <span className="spec-label" style={{ marginTop: 2 }}>Accesorios</span>
                                      <span className="spec-value" style={{ fontSize: 11, whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'right', lineHeight: 1.3 }}>{e.Accesorios}</span>
                                    </div>
                                  )}
                                  {e.Insumos && e.Insumos.trim() !== '' && e.Insumos.trim() !== '—' && (
                                    <div className="spec-row" style={{ alignItems: 'flex-start' }}>
                                      <span className="spec-label" style={{ marginTop: 2 }}>Insumos</span>
                                      <span className="spec-value" style={{ fontSize: 11, whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'right', lineHeight: 1.3 }}>{e.Insumos}</span>
                                    </div>
                                  )}
                                  {e.Foto_Equipo && (
                                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                      <span className="spec-label" style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Foto del Equipo</span>
                                      <img 
                                        src={e.Foto_Equipo} 
                                        alt={e.Nombre_Equipo} 
                                        style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                                        onClick={(ev) => { ev.stopPropagation(); setSelectedPhoto(e.Foto_Equipo || null) }}
                                        title="Clic para ampliar foto"
                                      />
                                    </div>
                                  )}
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
                                  <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }} onClick={(ev) => { ev.stopPropagation(); setEditEquipo(e) }}>
                                      <Edit size={12} style={{ display: 'inline', marginRight: 4 }} /> Editar Activo
                                    </button>
                                    {(e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'DE_BAJA_OBSOLETO' || e.Estado === 'OBSOLETO' || e.Estado === 'BAJA') ? (
                                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--success)' }} onClick={(ev) => { ev.stopPropagation(); handleHabilitar(e.ID_Equipo, e.Nombre_Equipo) }}>Re-habilitar</button>
                                    ) : (
                                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--warning)' }} onClick={(ev) => { ev.stopPropagation(); handleDeBaja(e.ID_Equipo, e.Nombre_Equipo) }}>Dar de Baja</button>
                                    )}
                                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={(ev) => { ev.stopPropagation(); handleEliminarActivo(e.ID_Equipo, e.Nombre_Equipo) }}>
                                      <Trash2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="card" style={{ overflow: 'hidden', marginTop: 24, background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <FileDigit size={16} color="var(--accent)" />
                                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historial de Verificaciones</span>
                                  </div>
                                  <button 
                                    className="btn btn-cyan btn-xs" 
                                    style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent)', border: '1px solid rgba(0, 229, 255, 0.2)', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
                                    onClick={(ev) => { ev.stopPropagation(); setModalHistorical(e) }}
                                  >
                                    ➕ Agregar Verificación Anterior
                                  </button>
                                </div>
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>Fecha</th>
                                      <th>Variación</th>
                                      <th>Resultado</th>
                                      <th>Técnico</th>
                                      <th>Observaciones</th>
                                      <th style={{ textAlign: 'center' }}>Evidencia</th>
                                      <th style={{ textAlign: 'center' }}>Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {e.historiales.map(h => (
                                      <tr key={h.ID_Log}>
                                        <td>{formatFecha(h.Fecha_Ejecucion)}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{h.Variacion_Calculada?.toFixed(4) ?? '—'}</td>
                                        <td>
                                          <span className="status-badge" style={{ color: h.Resultado_Status === 'APTO' ? 'var(--success)' : 'var(--danger)' }}>
                                            {h.Resultado_Status}
                                          </span>
                                        </td>
                                        <td>{h.Tecnico_Ejecutor}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-soft)', maxWidth: 200, whiteSpace: 'normal' }}>{h.Observaciones || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                          {h.Evidencia_Foto ? (
                                            <button 
                                              className="btn btn-ghost btn-xs"
                                              style={{ color: 'var(--accent)', border: '1px solid var(--accent-dim)', padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                                              onClick={(ev) => { ev.stopPropagation(); setSelectedPhoto(h.Evidencia_Foto ?? null) }}
                                              title="Ver Evidencia Fotográfica"
                                            >
                                              📸 Ver Foto
                                            </button>
                                          ) : (
                                            <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button 
                                            className="btn btn-ghost btn-xs" 
                                            style={{ color: 'var(--danger)', padding: '4px' }}
                                            onClick={(ev) => { ev.stopPropagation(); handleEliminarHistorial(h.ID_Log, e.Nombre_Equipo) }}
                                            title="Eliminar este registro"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {e.historiales.length === 0 && (
                                      <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: 12 }}>
                                          No hay verificaciones registradas para este activo.
                                        </td>
                                      </tr>
                                    )}
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
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          gap: 16px;
        }
        .spec-row:last-child {
          border-bottom: none;
        }
        .spec-label {
          font-size: 12px;
          color: var(--text-dim);
          flex-shrink: 0;
          min-width: 100px;
        }
        .spec-value {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-main);
          text-align: right;
          word-break: break-word;
          flex-grow: 1;
        }
        .btn-xs {
          font-size: 10px;
          padding: 4px 8px;
        }
        @media (max-width: 768px) {
          .mobile-only { display: block !important; }
          .desktop-only { display: none !important; }
          .page-header { 
            flex-direction: column; 
            align-items: flex-start !important; 
            gap: 16px;
            margin-bottom: 20px !important;
          }
          .page-header div:last-child {
            width: 100%;
            justify-content: space-between;
          }
          .table-container {
             border-radius: 12px;
             margin: 0 -4px;
          }
          .data-table th { padding: 12px 8px !important; font-size: 11px !important; }
          .data-table td { padding: 12px 8px !important; }
          .mobile-card-title { max-width: 140px; }
          .mobile-card-info { font-size: 12px !important; }
          .btn-scan {
            padding: 8px 10px !important;
            font-size: 10px !important;
          }
          .expanded-details .card {
            padding: 16px !important;
          }
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
      {editEquipo && (
        <EditEquipoModal
          equipo={editEquipo}
          onClose={() => setEditEquipo(null)}
          onSaved={() => { setEditEquipo(null); load(q, tipo) }}
        />
      )}
      {renewEquipo && (
        <RenewCertModal
          asset={{
            id: renewEquipo.ID_Equipo,
            name: renewEquipo.Nombre_Equipo,
            type: renewEquipo.Tipo as any,
            nCert: renewEquipo.N_Certificado ?? undefined,
            prov: renewEquipo.Proveedor_Servicio ?? undefined,
            fechaCal: renewEquipo.Fecha_Ultima_Verificacion ? new Date(renewEquipo.Fecha_Ultima_Verificacion).toISOString().split('T')[0] : undefined,
            fechaVenc: renewEquipo.Fecha_Vencimiento_Certificado ? new Date(renewEquipo.Fecha_Vencimiento_Certificado).toISOString().split('T')[0] : undefined
          }}
          onClose={() => setRenewEquipo(null)}
          onSaved={() => { setRenewEquipo(null); load(q, tipo) }}
        />
      )}
      {modalHistorical && (
        <HistoricalVerificationModal
          equipo={modalHistorical}
          equipos={equipos}
          onClose={() => setModalHistorical(null)}
          onSaved={() => { setModalHistorical(null); load(q, tipo) }}
        />
      )}
      {showHistoricalModal && (
        <HistoricalVerificationModal
          equipo={null}
          equipos={equipos}
          onClose={() => setShowHistoricalModal(false)}
          onSaved={() => { setShowHistoricalModal(false); load(q, tipo) }}
        />
      )}
      {qrLabelEquipo && (
        <QRLabelModal
          asset={{
            id: qrLabelEquipo.ID_Equipo,
            code: qrLabelEquipo.ID_Equipo,
            name: qrLabelEquipo.Nombre_Equipo,
            status: qrLabelEquipo.Estado,
            statusLabel: semaforoLabel(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control, qrLabelEquipo.Estado), qrLabelEquipo.Estado),
            statusColor: semaforoHex(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control, qrLabelEquipo.Estado))
          }}
          onClose={() => setQrLabelEquipo(null)}
        />
      )}
      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)} style={{ zIndex: 4000, display: 'grid', placeItems: 'center', padding: 24, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={ev => ev.stopPropagation()}>
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
              <button onClick={() => setSelectedPhoto(null)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: 20, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
            </div>
            <img src={selectedPhoto} alt="Evidencia ampliada" style={{ maxWidth: '100%', maxHeight: '85vh', display: 'block', objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  )
}
