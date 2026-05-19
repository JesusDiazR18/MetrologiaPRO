'use client'
import React, { useEffect, useState } from 'react'
import { FlaskConical, Plus, CheckCircle, XCircle, AlertCircle, FileText, Upload, Trash2, RefreshCw, Search, Edit } from 'lucide-react'
import { formatFecha, getScanUrl } from '@/lib/metrologia'
import { generatePatronSheetPDF } from '@/lib/reports'
import { QRCodeSVG } from 'qrcode.react'
import CreatePatronModal from '@/components/CreatePatronModal'
import EditPatronModal from '@/components/EditPatronModal'
import RenewCertModal from '@/components/RenewCertModal'
import QRLabelModal from '@/components/QRLabelModal'
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
  const [qrLabelAsset, setQrLabelAsset] = useState<any | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

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

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={18} color="var(--text-dim)" />
            <input 
              type="text" 
              placeholder="Buscar patrón por ID, nombre, código o laboratorio..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: 14 }}
            />
          </div>
        </div>
      </div>

      <div className="card">
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
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Código</th>
                  <th style={{ width: '35%' }}>Nombre del Patrón</th>
                  <th className="desktop-only" style={{ width: '15%' }}>Certificado N°</th>
                  <th className="desktop-only" style={{ width: '15%' }}>Vencimiento</th>
                  <th style={{ width: '15%', minWidth: '135px' }}>Estado Vigencia</th>
                  <th style={{ textAlign: 'right', width: '10%', minWidth: '180px' }}>Certificado Digital</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatrones.map(p => (
                  <React.Fragment key={p.ID_Patron}>
                  <tr 
                    onClick={() => setExpandedId(expandedId === p.ID_Patron ? null : p.ID_Patron)}
                    style={{ cursor: 'pointer' }}
                    className="mobile-card-row"
                  >
                    <td className="mobile-hide" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontWeight: 700, 
                        color: 'var(--cyan)',
                        background: 'rgba(0, 229, 255, 0.05)',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>{p.Codigo}</span>
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="mobile-card-title" title={p.Nombre_Patron}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <div className="mobile-only semaforo-dot" style={{ background: p.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? '#f59e0b' : 'var(--danger)', boxShadow: `0 0 15px ${p.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? '#f59e0b' : 'var(--danger)'}66` }} />
                        <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.Nombre_Patron}</div>
                        {p.Magnitud && (
                          <span style={{ fontSize: 11, background: 'rgba(0, 229, 255, 0.08)', padding: '2px 8px', borderRadius: 12, color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.2)', fontWeight: 600 }}>
                            {p.Magnitud}
                          </span>
                        )}
                      </div>
                      <div className="mobile-only" style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.Proveedor_Laboratorio || 'Sin proveedor'}</div>
                    </td>
                    <td className="desktop-only" style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.N_Certificado || ''}>
                      {p.N_Certificado || '—'}
                    </td>
                    <td className="desktop-only" style={{ fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                      {formatFecha(p.Fecha_Vencimiento_Certificado)}
                    </td>
                    <td className="mobile-card-info" style={{ whiteSpace: 'nowrap', minWidth: '135px' }}>
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
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', minWidth: '180px' }} className="mobile-card-actions">
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {p.PDF_Certificado && (
                          <button 
                            className="btn btn-ghost btn-xs" 
                            onClick={(e) => { e.stopPropagation(); openPdf(p.PDF_Certificado!) }}
                            title="Ver Certificado PDF"
                            style={{ color: 'var(--cyan)', border: '1px solid var(--cyan-dim)', padding: '6px 10px', fontSize: 11 }}
                          >
                            <FileText size={14} style={{ display: 'inline', marginRight: 4 }} /> Ver PDF
                          </button>
                        )}
                        <button 
                          className="btn-scan" 
                          style={{ padding: '6px 12px', fontSize: 11, background: 'var(--success)', color: '#fff', fontWeight: 700, borderRadius: 8, border: 'none' }}
                          onClick={(ev) => { ev.stopPropagation(); setRenewPatron(p) }}
                        >
                          <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} /> {p.PDF_Certificado ? 'Renovar' : 'Subir Cert'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.ID_Patron && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: 'clamp(12px, 2vw, 24px) clamp(16px, 3vw, 40px)', borderLeft: `4px solid ${p.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? '#f59e0b' : 'var(--danger)'}`, display: 'flex', gap: 'clamp(20px, 4vw, 40px)', flexWrap: 'wrap' }}>
                          <div 
                            className="card" 
                            style={{ 
                              background: 'var(--page-bg-soft)', 
                              padding: 24, 
                              borderRadius: 20, 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: 16,
                              width: 'clamp(200px, 100%, 240px)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              margin: '0 auto'
                            }}
                            onClick={ev => { ev.stopPropagation(); setQrLabelAsset({
                              id: p.ID_Patron,
                              code: p.Codigo,
                              name: p.Nombre_Patron,
                              status: p.Estado_Vigencia,
                              statusLabel: p.Estado_Vigencia === 'VIGENTE' ? 'AL DÍA' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? 'SIN CERT' : 'VENCIDO',
                              statusColor: p.Estado_Vigencia === 'VIGENTE' ? '#10b981' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? '#f59e0b' : '#ef4444'
                            })}}
                            title="Haz clic para ver e imprimir la etiqueta"
                          >
                            <div style={{ background: '#fff', padding: 10, borderRadius: 14, boxShadow: 'var(--shadow-sm)' }}>
                              <QRCodeSVG
                                value={getScanUrl(p.Codigo)}
                                size={120}
                                bgColor="#ffffff"
                                fgColor="#0f172a"
                                level="H"
                                style={{ display: 'block', borderRadius: 4 }}
                              />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyan)', marginBottom: 4, textTransform: 'uppercase' }}>CÓDIGO DIGITAL QR</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 600, background: 'var(--cyan-dim)', padding: '3px 10px', borderRadius: 999 }}>🖨️ Clic para imprimir etiqueta</div>
                                <button 
                                  className="btn btn-ghost btn-sm" 
                                  style={{ fontSize: 10, padding: '4px 8px', border: '1px solid var(--cyan-dim)', color: 'var(--cyan)' }}
                                  onClick={(ev) => { ev.stopPropagation(); generatePatronSheetPDF(p); }}
                                >
                                  📄 Descargar Ficha PDF
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
                              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>Especificaciones y Trazabilidad</h4>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--cyan)' }} onClick={(ev) => { ev.stopPropagation(); setEditPatron(p) }}>
                                  <Edit size={12} style={{ display: 'inline', marginRight: 4 }} /> Editar Patrón
                                </button>
                                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={(ev) => { ev.stopPropagation(); handleEliminarPatron(p.ID_Patron, p.Nombre_Patron) }}>
                                  <Trash2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Eliminar
                                </button>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Magnitud Física</label>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{p.Magnitud || 'General'}</div>
                              </div>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Laboratorio</label>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{p.Proveedor_Laboratorio || 'No especificado'}</div>
                              </div>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Última Calibración</label>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{formatFecha(p.Fecha_Calibracion_Externa)}</div>
                              </div>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Vencimiento Certificado</label>
                                <div style={{ fontSize: 13, fontWeight: 700, color: p.Estado_Vigencia === 'VENCIDO' ? 'var(--danger)' : p.Estado_Vigencia === 'SIN CERTIFICADO' ? '#f59e0b' : 'var(--text-main)' }}>
                                  {formatFecha(p.Fecha_Vencimiento_Certificado)}
                                </div>
                              </div>
                            </div>
                            {p.Foto_Patron && (
                              <div style={{ marginTop: 8 }}>
                                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Fotografía del Patrón</label>
                                <img 
                                  src={p.Foto_Patron} 
                                  alt={p.Nombre_Patron} 
                                  style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--snow-3)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }} 
                                  onClick={(ev) => { ev.stopPropagation(); setSelectedPhoto(p.Foto_Patron ?? null) }}
                                  title="Clic para ampliar foto"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .spec-item {
          background: rgba(255,255,255,0.02);
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.05);
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
      {qrLabelAsset && (
        <QRLabelModal
          asset={{
            id: qrLabelAsset.id,
            code: qrLabelAsset.code,
            name: qrLabelAsset.name,
            status: qrLabelAsset.status,
            statusLabel: qrLabelAsset.statusLabel,
            statusColor: qrLabelAsset.statusColor
          }}
          onClose={() => setQrLabelAsset(null)}
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
