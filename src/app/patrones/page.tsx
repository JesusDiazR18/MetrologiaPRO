'use client'
import React, { useEffect, useState } from 'react'
import { FlaskConical, Plus, CheckCircle, XCircle, FileText, Upload, Trash2, RefreshCw, Search, Edit } from 'lucide-react'
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
    window.open(url, '_blank')
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
              style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: 14 }}
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre del Patrón</th>
                  <th className="desktop-only">Laboratorio / Proveedor</th>
                  <th className="desktop-only">Certificado N°</th>
                  <th className="desktop-only">Vencimiento</th>
                  <th>Estado Vigencia</th>
                  <th style={{ textAlign: 'right' }}>Certificado Digital</th>
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
                    <td className="mobile-hide">
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontWeight: 700, 
                        color: 'var(--cyan)',
                        background: 'rgba(0, 229, 255, 0.05)',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>{p.Codigo}</span>
                    </td>
                    <td style={{ fontWeight: 600 }} className="mobile-card-title">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="mobile-only semaforo-dot" style={{ background: p.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : 'var(--danger)', boxShadow: `0 0 15px ${p.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : 'var(--danger)'}66` }} />
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{p.Nombre_Patron}</div>
                      </div>
                      <div className="desktop-only" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>ID: {p.ID_Patron}</div>
                      <div className="mobile-only" style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>{p.Proveedor_Laboratorio || 'Sin proveedor'}</div>
                    </td>
                    <td className="desktop-only" style={{ fontSize: 13, color: 'var(--text-soft)' }}>{p.Proveedor_Laboratorio ?? '—'}</td>
                    <td className="desktop-only" style={{ fontSize: 13 }}>{p.N_Certificado ?? '—'}</td>
                    <td className="desktop-only" style={{ fontSize: 13, color: 'var(--text-soft)' }}>{formatFecha(p.Fecha_Vencimiento_Certificado)}</td>
                    <td className="mobile-card-info">
                      {p.Estado_Vigencia === 'VIGENTE'
                        ? <span className="status-badge" style={{ color: 'var(--success)' }}><CheckCircle size={11} style={{ display: 'inline', marginRight: 4 }} /> VIGENTE</span>
                        : <span className="status-badge" style={{ color: 'var(--danger)' }}><XCircle size={11} style={{ display: 'inline', marginRight: 4 }} /> VENCIDO</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} className="mobile-card-actions">
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
                      <td colSpan={7} style={{ padding: 0, background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: 'clamp(12px, 2vw, 24px) clamp(16px, 3vw, 40px)', borderLeft: `4px solid ${p.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : 'var(--danger)'}`, display: 'flex', gap: 'clamp(20px, 4vw, 40px)', flexWrap: 'wrap' }}>
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
                              statusLabel: p.Estado_Vigencia === 'VIGENTE' ? 'AL DÍA' : 'VENCIDO',
                              statusColor: p.Estado_Vigencia === 'VIGENTE' ? '#10b981' : '#ef4444'
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
                                <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>ID Sistema</label>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{p.ID_Patron}</div>
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
                                <div style={{ fontSize: 13, fontWeight: 700, color: p.Estado_Vigencia === 'VENCIDO' ? 'var(--danger)' : 'var(--text-main)' }}>
                                  {formatFecha(p.Fecha_Vencimiento_Certificado)}
                                </div>
                              </div>
                            </div>
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
    </div>
  )
}
