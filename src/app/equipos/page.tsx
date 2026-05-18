'use client'
import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, SlidersHorizontal, Plus, ChevronsDown, 
  ChevronsUp, CheckCircle2, XCircle, Calendar, User, QrCode, FileDigit, ShieldCheck, Activity, Trash2, FileText, Edit, RefreshCw
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { calcularSemaforo, semaforoHex, semaforoLabel, formatFecha, diasRestantes, getScanUrl } from '@/lib/metrologia'
import { generateTechnicalSheetPDF } from '@/lib/reports'
import VerificationModal from '@/components/VerificationModal'
import CreateEquipoModal from '@/components/CreateEquipoModal'
import EditEquipoModal from '@/components/EditEquipoModal'
import RenewCertModal from '@/components/RenewCertModal'
import QRLabelModal from '@/components/QRLabelModal'
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
  Estado: string
  N_Certificado?: string | null
  Proveedor_Servicio?: string | null
  Fecha_Vencimiento_Certificado?: string | null
  PDF_Certificado?: string | null
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
  const [editEquipo, setEditEquipo] = useState<Equipo | null>(null)
  const [renewEquipo, setRenewEquipo] = useState<Equipo | null>(null)
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
      
      if (Array.isArray(data)) {
        setEquipos(data)
        if (query && data.length === 1) {
          setExpanded(data[0].ID_Equipo)
        } else if (query) {
          const exact = data.find((e: Equipo) => e.Codigo_Interno.toLowerCase() === query.toLowerCase())
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
    const motivo = prompt(`¿Estás seguro de que deseas poner el equipo "${nombre}" FUERA DE SERVICIO? Por favor, indica el motivo:`)
    if (motivo === null) return 
    if (!motivo.trim()) return toast.error('Debes indicar un motivo para dar de baja el equipo.')
    
    const updatePromise = fetch(`/api/equipos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: 'FUERA_DE_SERVICIO',
        observaciones: `MOTIVO DE BAJA: ${motivo}`
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
                style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: 14 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Filtro:</span>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th className="desktop-only">Identificación</th>
                  <th>Nombre del Equipo</th>
                  <th className="desktop-only">Responsable / Estado</th>
                  <th>Próxima Verif.</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
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
                          }}>{e.Codigo_Interno}</span>
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
                          <div className="mobile-only" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{e.Codigo_Interno} · {e.Area_Asignada ?? 'Sin área'}</div>
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
                        <td style={{ textAlign: 'right' }} className="mobile-card-actions">
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                            className="btn-scan" 
                            style={{ padding: '6px 14px', fontSize: 11, background: 'var(--accent)', color: '#000', fontWeight: 800, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0, 229, 255, 0.3)' }}
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
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, width: '100%', animation: 'slideDown 0.3s ease-out' }}>
                                <div 
                                  className="card" 
                                  style={{ padding: 20, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', minHeight: 180 }}
                                  onClick={ev => { ev.stopPropagation(); setQrLabelEquipo(e) }}
                                  title="Haz clic para ver e imprimir la etiqueta"
                                >
                                  <div style={{ background: '#fff', padding: 10, borderRadius: 14, boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' }}>
                                    <QRCodeSVG
                                      value={getScanUrl(e.Codigo_Interno)}
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
                                  <div className="spec-row">
                                    <span className="spec-label">Modelo / Serie</span>
                                    <span className="spec-value">{e.Modelo || '—'} / {e.Serie || '—'}</span>
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

                                {(e.Tipo === 'EQUIPO' && Boolean(e.N_Certificado || e.PDF_Certificado || e.Fecha_Vencimiento_Certificado)) ? (
                                <div className="card" style={{ padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <FileText size={16} color="var(--cyan)" />
                                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certificado Digital</span>
                                </div>
                                <div className="spec-row">
                                <span className="spec-label">N° Certificado</span>
                                <span className="spec-value">{e.N_Certificado || '—'}</span>
                                </div>
                                <div className="spec-row">
                                <span className="spec-label">Proveedor</span>
                                <span className="spec-value">{e.Proveedor_Servicio || '—'}</span>
                                </div>
                                <div className="spec-row">
                                <span className="spec-label">Vencimiento</span>
                                <span className="spec-value">{e.Fecha_Vencimiento_Certificado ? formatFecha(e.Fecha_Vencimiento_Certificado) : '—'}</span>
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                {e.PDF_Certificado && (
                                <a href={e.PDF_Certificado} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs" style={{ color: 'var(--cyan)', border: '1px solid var(--cyan-dim)' }}>
                                👁️ Ver PDF
                                </a>
                                )}
                                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--success)', border: '1px solid var(--success)' }} onClick={(ev) => { ev.stopPropagation(); setRenewEquipo(e) }}>
                                <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} /> Renovar Cert
                                </button>
                                </div>
                                </div>
                                ) : e.Tipo === 'EQUIPO' ? (
                                   <div className="card" style={{ padding: 20, background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, minHeight: 180 }}>
                                     <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center' }}>
                                       <FileText size={20} color="var(--text-dim)" style={{ opacity: 0.5 }} />
                                     </div>
                                     <div>
                                       <span style={{ fontSize: 12, fontWeight: 700, display: 'block', color: 'var(--text-dim)' }}>Sin Certificado Externo</span>
                                       <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block', maxWidth: 160 }}>Este equipo no posee una calibración externa cargada.</span>
                                     </div>
                                     <button className="btn btn-cyan btn-xs" style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent)', border: '1px solid rgba(0, 229, 255, 0.2)', fontSize: 10, fontWeight: 700 }} onClick={(ev) => { ev.stopPropagation(); setRenewEquipo(e) }}>
                                       ➕ Cargar Certificado
                                     </button>
                                   </div>
                                 ) : null}

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
                                    {e.Estado === 'FUERA_DE_SERVICIO' ? (
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <FileDigit size={16} color="var(--accent)" />
                                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historial de Verificaciones</span>
                                </div>
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>Fecha</th>
                                      <th>Variación</th>
                                      <th>Resultado</th>
                                      <th>Técnico</th>
                                      <th>Observaciones</th>
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
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: 12 }}>
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
      {qrLabelEquipo && (
        <QRLabelModal
          asset={{
            id: qrLabelEquipo.ID_Equipo,
            code: qrLabelEquipo.Codigo_Interno,
            name: qrLabelEquipo.Nombre_Equipo,
            status: qrLabelEquipo.Estado,
            statusLabel: semaforoLabel(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control, qrLabelEquipo.Estado), qrLabelEquipo.Estado),
            statusColor: semaforoHex(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control, qrLabelEquipo.Estado))
          }}
          onClose={() => setQrLabelEquipo(null)}
        />
      )}
    </div>
  )
}
