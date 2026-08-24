'use client'
import React, { useEffect, useState } from 'react'
import { FlaskConical, Plus, CheckCircle, XCircle, AlertCircle, FileText, Upload, Trash2, RefreshCw, Search, Edit, History } from 'lucide-react'
import { formatFecha, getScanUrl } from '@/lib/metrologia'
import { generatePatronSheetPDF } from '@/lib/reports'
import CreatePatronModal from '@/components/CreatePatronModal'
import EditPatronModal from '@/components/EditPatronModal'
import RenewCertModal from '@/components/RenewCertModal'
import PatronCalibrationHistoryModal from '@/components/PatronCalibrationHistoryModal'
import { toast } from 'react-hot-toast'

interface Patron {
  ID_Patron: string
  Codigo: string
  Nombre_Patron: string
  Fecha_Calibracion_Externa: string | null
  Fecha_Vencimiento_Certificado: string | null
  N_Certificado: string | null
  Proveedor_Laboratorio: string | null
  PDF_Certificado: string | null
  Estado_Vigencia: string
  Magnitud: string | null
  Foto_Patron?: string | null
}

export default function PatronesPage() {
  const [patrones, setPatrones] = useState<Patron[]>([])
  const [filteredPatrones, setFilteredPatrones] = useState<Patron[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editPatron, setEditPatron] = useState<Patron | null>(null)
  const [renewPatron, setRenewPatron] = useState<Patron | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [historialPatron, setHistorialPatron] = useState<Patron | null>(null)

  const [expandedDetails, setExpandedDetails] = useState<Record<string, Patron>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (expandedDetails[id]) return

    try {
      setLoadingDetails(prev => ({ ...prev, [id]: true }))
      const res = await fetch(`/api/patrones/${id}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedDetails(prev => ({ ...prev, [id]: data }))
      } else {
        toast.error('Error al cargar detalles del patrón')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de red al cargar detalles')
    } finally {
      setLoadingDetails(prev => ({ ...prev, [id]: false }))
    }
  }

  const openModalWithFullDetails = async (patron: Patron, setModalState: (p: any) => void) => {
    if (!patron || !patron.ID_Patron) {
      setModalState(patron)
      return
    }
    if (expandedDetails[patron.ID_Patron]) {
      setModalState(expandedDetails[patron.ID_Patron])
      return
    }
    let loadedPatron = patron
    try {
      toast.loading('Cargando datos completos del patrón...', { id: 'modal-loading-patron' })
      const res = await fetch(`/api/patrones/${patron.ID_Patron}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedDetails(prev => ({ ...prev, [patron.ID_Patron]: data }))
        loadedPatron = data
        toast.success('Cargado', { id: 'modal-loading-patron' })
      } else {
        toast.error('Error al cargar detalles', { id: 'modal-loading-patron' })
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar detalles', { id: 'modal-loading-patron' })
    }
    setModalState(loadedPatron)
  }

  const handleOpenPdf = async (patronId: string, currentPdf: string) => {
    if (currentPdf === 'dummy_exists') {
      try {
        toast.loading('Cargando certificado PDF...', { id: 'pdf-loading' })
        const res = await fetch(`/api/patrones/${patronId}`)
        if (res.ok) {
          const data = await res.json()
          toast.success('Cargado', { id: 'pdf-loading' })
          if (data.PDF_Certificado) {
            openPdf(data.PDF_Certificado)
          } else {
            toast.error('No se encontró archivo PDF')
          }
        } else {
          toast.error('Error al descargar el certificado', { id: 'pdf-loading' })
        }
      } catch (err) {
        console.error(err)
        toast.error('Error de red al descargar el certificado', { id: 'pdf-loading' })
      }
    } else {
      openPdf(currentPdf)
    }
  }

  useEffect(() => {
    loadPatrones()
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setFilteredPatrones(patrones)
    } else {
      const term = q.toLowerCase()
      setFilteredPatrones(patrones.filter(p => 
        p.ID_Patron.toLowerCase().includes(term) ||
        p.Codigo.toLowerCase().includes(term) ||
        p.Nombre_Patron.toLowerCase().includes(term) ||
        (p.Magnitud && p.Magnitud.toLowerCase().includes(term)) ||
        (p.Proveedor_Laboratorio && p.Proveedor_Laboratorio.toLowerCase().includes(term))
      ))
    }
  }, [q, patrones])

  async function loadPatrones() {
    setLoading(true)
    try {
      const r = await fetch('/api/patrones')
      if (r.ok) {
        const data = await r.json()
        setPatrones(data)
        setFilteredPatrones(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminarPatron(id: string, nombre: string) {
    if (!confirm(`🚨 ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR el patrón de referencia "${nombre}" (${id})?\n\nEsta acción no se puede deshacer.`)) return
    const deletePromise = fetch(`/api/patrones/${id}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar')
      loadPatrones()
    })
    toast.promise(deletePromise, {
      loading: 'Eliminando patrón...',
      success: 'Patrón eliminado exitosamente',
      error: 'Error al eliminar el patrón'
    })
  }

  const openPdf = (url: string) => {
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',')
        const base64 = parts[1]
        const mime = parts[0].split(':')[1].split(';')[0]
        const binary = atob(base64)
        const array = []
        for (let i = 0; i < binary.length; i++) {
          array.push(binary.charCodeAt(i))
        }
        const blob = new Blob([new Uint8Array(array)], { type: mime })
        const blobUrl = URL.createObjectURL(blob)
        window.open(blobUrl, '_blank')
      } catch (err) {
        console.error('Error opening base64 PDF:', err)
        window.open(url, '_blank')
      }
    } else {
      window.open(url, '_blank')
    }
  }

  const renderPatronDetails = (p: Patron) => {
    if (loadingDetails[p.ID_Patron]) {
      return (
        <div style={{ padding: 30, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Cargando detalles...</p>
        </div>
      )
    }
    const details = expandedDetails[p.ID_Patron] || p
    const detailsStatusColor = details.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : details.Estado_Vigencia === 'SIN CERTIFICADO' ? '#f59e0b' : 'var(--danger)'

    return (
      <div style={{ padding: 'clamp(12px, 2vw, 20px)', borderLeft: `4px solid ${detailsStatusColor}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'var(--text-main)' }}>Especificaciones y Trazabilidad</h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)', border: '1px solid rgba(14, 165, 233, 0.2)' }} onClick={(ev) => { ev.stopPropagation(); generatePatronSheetPDF(details); }}>
              📄 Ficha PDF
            </button>
            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)', border: '1px solid rgba(14, 165, 233, 0.2)' }} onClick={(ev) => { ev.stopPropagation(); setHistorialPatron(details) }}>
              <History size={12} style={{ display: 'inline', marginRight: 4 }} /> Historial
            </button>
            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }} onClick={(ev) => { ev.stopPropagation(); setEditPatron(details) }}>
              <Edit size={12} style={{ display: 'inline', marginRight: 4 }} /> Editar
            </button>
            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={(ev) => { ev.stopPropagation(); handleEliminarPatron(details.ID_Patron, details.Nombre_Patron) }}>
              <Trash2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Eliminar
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <div className="spec-item">
            <label style={{ fontSize: 10.5, color: 'var(--text-soft)', fontWeight: 700 }}>Magnitud Física</label>
            <div style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--accent)' }}>{details.Magnitud || 'General'}</div>
          </div>
          <div className="spec-item">
            <label style={{ fontSize: 10.5, color: 'var(--text-soft)', fontWeight: 700 }}>Laboratorio</label>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)' }}>{details.Proveedor_Laboratorio || 'No especificado'}</div>
          </div>
          <div className="spec-item">
            <label style={{ fontSize: 10.5, color: 'var(--text-soft)', fontWeight: 700 }}>Última Calibración</label>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)' }}>{formatFecha(details.Fecha_Calibracion_Externa)}</div>
          </div>
          <div className="spec-item">
            <label style={{ fontSize: 10.5, color: 'var(--text-soft)', fontWeight: 700 }}>Vencimiento Certificado</label>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: details.Estado_Vigencia === 'VENCIDO' ? 'var(--danger)' : details.Estado_Vigencia === 'SIN CERTIFICADO' ? '#f59e0b' : 'var(--text-main)' }}>
              {formatFecha(details.Fecha_Vencimiento_Certificado)}
            </div>
          </div>
        </div>

        {details.Foto_Patron && (
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 750, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Fotografía del Patrón</label>
            <img 
              src={details.Foto_Patron} 
              alt={details.Nombre_Patron} 
              style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)', cursor: 'pointer' }} 
              onClick={(ev) => { ev.stopPropagation(); setSelectedPhoto(details.Foto_Patron ?? null) }}
              title="Clic para ampliar foto"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon" style={{ background: 'var(--oxford-blue)' }}>
          <FlaskConical size={22} color="var(--cyan)" />
        </div>
        <div>
          <h1>Patrones de Referencia Estándar</h1>
          <p>Trazabilidad metrológica y gestión de calibraciones externas</p>
        </div>
        <button className="btn btn-cyan" style={{ marginLeft: 'auto' }} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Nuevo Patrón
        </button>
      </div>

      <div className="card" style={{ marginBottom: 12, background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: 14 }}>
        <div className="card-body" style={{ padding: '10px 14px' }}>
          <div className="search-box-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="search-icon-box" style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-soft)', zIndex: 2 }}>
              <Search size={15} />
            </span>
            <input 
              type="text" 
              placeholder="Buscar patrón por ID, nombre, código o laboratorio..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
              style={{ width: '100%', padding: '8px 30px 8px 34px', background: 'var(--page-bg-soft)', border: '1.5px solid var(--glass-border)', borderRadius: 'var(--radius-md)', outline: 'none', color: 'var(--text-main)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: 16 }}>
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-dim)' }}>Cargando estándares de referencia...</p>
          </div>
        ) : filteredPatrones.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 80 }}>
            <FlaskConical size={48} opacity={0.2} style={{ margin: '0 auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 600 }}>No se encontraron patrones de referencia</p>
            <p style={{ color: 'var(--text-dim)' }}>Intenta ajustar los filtros de búsqueda o agrega un nuevo patrón</p>
          </div>
        ) : (
          <div>
            {/* 🖥️ DESKTOP VIEW: High-Density Professional Data Table */}
            <div className="table-wrap desktop-only">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Patrón / Referencia</th>
                    <th style={{ width: '15%' }}>Certificado N°</th>
                    <th style={{ width: '15%' }}>Vencimiento</th>
                    <th style={{ width: '15%', minWidth: '135px' }}>Estado Vigencia</th>
                    <th style={{ textAlign: 'right', width: '15%', minWidth: '180px' }}>Certificado Digital</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatrones.map(p => (
                    <React.Fragment key={p.ID_Patron}>
                      <tr 
                        onClick={() => toggleExpand(p.ID_Patron)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ fontWeight: 600, padding: '12px 16px' }} title={p.Nombre_Patron}>
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ 
                              fontFamily: 'var(--font-mono)', 
                              fontWeight: 700, 
                              color: 'var(--accent)',
                              background: 'rgba(14, 165, 233, 0.08)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              letterSpacing: '0.5px'
                            }}>{p.Codigo}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{p.Nombre_Patron}</div>
                            {p.Magnitud && (
                              <span style={{ fontSize: 10.5, background: 'rgba(14, 165, 233, 0.08)', padding: '2px 8px', borderRadius: 12, color: 'var(--accent)', border: '1px solid rgba(14, 165, 233, 0.2)', fontWeight: 600 }}>
                                {p.Magnitud}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, whiteSpace: 'nowrap' }} title={p.N_Certificado || ''}>
                          {p.N_Certificado || '—'}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                          {formatFecha(p.Fecha_Vencimiento_Certificado)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', minWidth: '135px' }}>
                          {p.Estado_Vigencia === 'VIGENTE' ? (
                            <span className="status-badge status-badge-vigente">
                              <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> VIGENTE
                            </span>
                          ) : p.Estado_Vigencia === 'SIN CERTIFICADO' ? (
                            <span className="status-badge status-badge-sincert">
                              <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> SIN CERTIFICADO
                            </span>
                          ) : (
                            <span className="status-badge status-badge-vencido">
                              <XCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> VENCIDO
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', minWidth: '180px' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {p.PDF_Certificado && (
                              <button 
                                className="btn btn-ghost btn-xs" 
                                onClick={(e) => { e.stopPropagation(); handleOpenPdf(p.ID_Patron, p.PDF_Certificado!) }}
                                title="Ver Certificado PDF"
                                style={{ color: 'var(--accent)', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '6px 10px', fontSize: 11 }}
                              >
                                <FileText size={14} style={{ display: 'inline', marginRight: 4 }} /> Ver PDF
                              </button>
                            )}
                            <button 
                              className="btn-scan" 
                              style={{ padding: '6px 12px', fontSize: 11, background: 'var(--accent)', color: '#fff', fontWeight: 700, borderRadius: 8, border: 'none' }}
                              onClick={(ev) => { ev.stopPropagation(); openModalWithFullDetails(p, setRenewPatron) }}
                            >
                              <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} /> {p.PDF_Certificado ? 'Renovar' : 'Subir Cert'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === p.ID_Patron && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0, background: 'rgba(0,0,0,0.06)' }}>
                            {renderPatronDetails(p)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 📱 MOBILE VIEW: Native Mobile Cards */}
            <div className="mobile-patron-list mobile-only">
              {filteredPatrones.map(p => (
                <div key={p.ID_Patron} className="mobile-patron-card">
                  <div className="mobile-card-header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="patron-code-chip">{p.Codigo}</span>
                      {p.Magnitud && <span className="patron-mag-chip">{p.Magnitud}</span>}
                    </div>

                    <span className={`status-pill-mini ${p.Estado_Vigencia === 'VIGENTE' ? 'vigente' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? 'sincert' : 'vencido'}`}>
                      {p.Estado_Vigencia === 'VIGENTE' ? '🟢 VIGENTE' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? '🟡 SIN CERT' : '🔴 VENCIDO'}
                    </span>
                  </div>

                  <div className="mobile-card-title-block" onClick={() => toggleExpand(p.ID_Patron)}>
                    <h3 className="mobile-patron-title">{p.Nombre_Patron}</h3>
                    <div className="mobile-patron-sub">
                      <span>🏢 {p.Proveedor_Laboratorio || 'Laboratorio no declarado'}</span>
                      {p.N_Certificado && <span> · Cert: {p.N_Certificado}</span>}
                    </div>
                    <div className="mobile-patron-venc">
                      <span>Vencimiento: <strong>{formatFecha(p.Fecha_Vencimiento_Certificado)}</strong></span>
                    </div>
                  </div>

                  <div className="mobile-patron-actions-row">
                    {p.PDF_Certificado && (
                      <button 
                        className="mobile-action-btn secondary"
                        onClick={() => handleOpenPdf(p.ID_Patron, p.PDF_Certificado!)}
                      >
                        <FileText size={14} />
                        <span>Ver PDF</span>
                      </button>
                    )}

                    <button 
                      className="mobile-action-btn primary"
                      onClick={() => openModalWithFullDetails(p, setRenewPatron)}
                    >
                      <RefreshCw size={14} />
                      <span>{p.PDF_Certificado ? 'Renovar' : 'Subir Cert'}</span>
                    </button>

                    <button 
                      className="mobile-action-btn secondary"
                      onClick={() => generatePatronSheetPDF(p)}
                      title="Descargar Ficha Técnica PDF"
                    >
                      <span>Ficha</span>
                    </button>

                    <button 
                      className={`mobile-action-btn expand ${expandedId === p.ID_Patron ? 'active' : ''}`}
                      onClick={() => toggleExpand(p.ID_Patron)}
                    >
                      {expandedId === p.ID_Patron ? '▲' : '▼'}
                    </button>
                  </div>

                  {expandedId === p.ID_Patron && (
                    <div className="mobile-patron-expanded-content">
                      {renderPatronDetails(p)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .spec-item {
          background: var(--page-bg-soft);
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
        }

        .patron-code-chip {
          font-family: var(--font-mono);
          font-weight: 800;
          font-size: 11px;
          color: var(--accent);
          background: rgba(14, 165, 233, 0.08);
          border: 1px solid rgba(14, 165, 233, 0.2);
          padding: 2px 7px;
          border-radius: 6px;
        }

        .patron-mag-chip {
          font-size: 10px;
          font-weight: 700;
          color: var(--accent);
          background: rgba(14, 165, 233, 0.06);
          border: 1px solid rgba(14, 165, 233, 0.15);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .status-pill-mini {
          font-size: 10.5px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 20px;
        }
        .status-pill-mini.vigente { background: rgba(34, 197, 94, 0.1); color: var(--success); }
        .status-pill-mini.sincert { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-pill-mini.vencido { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

        .mobile-patron-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
        }

        .mobile-patron-card {
          background: var(--card-bg);
          border: 1.5px solid var(--glass-border);
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: var(--shadow-sm);
        }

        .mobile-card-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mobile-card-title-block {
          cursor: pointer;
        }

        .mobile-patron-title {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0 0 4px 0;
          line-height: 1.3;
        }

        .mobile-patron-sub {
          font-size: 11.5px;
          color: var(--text-dim);
          margin-bottom: 4px;
        }

        .mobile-patron-venc {
          font-size: 11.5px;
          color: var(--text-main);
        }

        .mobile-patron-actions-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--glass-border);
        }

        .mobile-action-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          height: 36px;
          border-radius: 10px;
          font-size: 11.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }

        .mobile-action-btn.primary {
          background: var(--accent);
          color: #ffffff;
          box-shadow: 0 2px 8px var(--accent-glow);
          flex: 1.3;
        }

        .mobile-action-btn.secondary {
          background: var(--page-bg-soft);
          border: 1px solid var(--glass-border);
          color: var(--text-main);
        }

        .mobile-action-btn.expand {
          flex: 0 0 36px;
          background: var(--page-bg-soft);
          border: 1px solid var(--glass-border);
          color: var(--text-dim);
        }

        .mobile-action-btn.expand.active {
          background: var(--alpha-08);
          color: var(--accent);
        }

        .mobile-patron-expanded-content {
          margin-top: 8px;
          border-top: 1px solid var(--glass-border);
          padding-top: 8px;
        }
      `}</style>
      {showCreateModal && (
        <CreatePatronModal 
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); loadPatrones() }}
        />
      )}
      {editPatron && (
        <EditPatronModal
          patron={editPatron}
          onClose={() => setEditPatron(null)}
          onSaved={() => { setEditPatron(null); loadPatrones() }}
        />
      )}
      {renewPatron && (
        <RenewCertModal
          asset={{
            id: renewPatron.ID_Patron,
            name: renewPatron.Nombre_Patron,
            type: 'PATRON',
            nCert: renewPatron.N_Certificado ?? undefined,
            prov: renewPatron.Proveedor_Laboratorio ?? undefined,
            fechaCal: renewPatron.Fecha_Calibracion_Externa ? new Date(renewPatron.Fecha_Calibracion_Externa).toISOString().split('T')[0] : undefined,
            fechaVenc: renewPatron.Fecha_Vencimiento_Certificado ? new Date(renewPatron.Fecha_Vencimiento_Certificado).toISOString().split('T')[0] : undefined
          }}
          onClose={() => setRenewPatron(null)}
          onSaved={() => { setRenewPatron(null); loadPatrones() }}
        />
      )}
      {historialPatron && (
        <PatronCalibrationHistoryModal
          patron={historialPatron}
          onClose={() => setHistorialPatron(null)}
          onSaved={() => { setHistorialPatron(null); loadPatrones() }}
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
