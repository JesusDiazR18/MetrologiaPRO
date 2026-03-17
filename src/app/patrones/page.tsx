'use client'
import React, { useEffect, useState, useRef } from 'react'
import { FlaskConical, Plus, CheckCircle, XCircle, FileText, Upload, Eye, Trash2, RefreshCcw, QrCode, Printer } from 'lucide-react'
import { formatFecha, getScanUrl } from '@/lib/metrologia'
import { QRCodeSVG } from 'qrcode.react'
import CreatePatronModal from '@/components/CreatePatronModal'
import QRLabelModal from '@/components/QRLabelModal'

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
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [qrLabelAsset, setQrLabelAsset] = useState<any | null>(null)

  useEffect(() => {
    loadPatrones()
  }, [])

  async function loadPatrones() {
    setLoading(true)
    try {
      const r = await fetch('/api/patrones')
      if (r.ok) setPatrones(await r.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, idPatron: string) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingId(idPatron)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('idPatron', idPatron)

    try {
      const r = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      if (r.ok) {
        await loadPatrones()
      } else {
        alert('Error al subir el archivo')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploadingId(null)
    }
  }

  const openPdf = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><FlaskConical size={22} /></div>
        <div>
          <h1>Patrones de Referencia</h1>
          <p>Certificados de calibración externa y vigencia</p>
        </div>
        <button className="btn btn-cyan" style={{ marginLeft: 'auto' }} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Nuevo Patrón
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /><p>Cargando…</p></div>
        ) : patrones.length === 0 ? (
          <div className="empty-state">
            <FlaskConical size={48} />
            <p>No hay patrones registrados. Carga los datos desde el Dashboard.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Proveedor</th>
                  <th>Certificado N°</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Certificado</th>
                </tr>
              </thead>
              <tbody>
                {patrones.map(p => (
                  <React.Fragment key={p.ID_Patron}>
                  <tr 
                    onClick={() => setExpandedId(expandedId === p.ID_Patron ? null : p.ID_Patron)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><span className="code-chip">{p.Codigo}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.Nombre_Patron}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-soft)' }}>{p.Proveedor_Laboratorio ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{p.N_Certificado ?? '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-soft)' }}>{formatFecha(p.Fecha_Vencimiento_Certificado)}</td>
                    <td>
                      {p.Estado_Vigencia === 'VIGENTE'
                        ? <span className="badge badge-apto"><CheckCircle size={11} /> VIGENTE</span>
                        : <span className="badge badge-no-apto"><XCircle size={11} /> VENCIDO</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {p.PDF_Certificado && (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={(e) => { e.stopPropagation(); openPdf(p.PDF_Certificado!) }}
                            title="Ver Certificado PDF"
                            style={{ color: 'var(--accent)' }}
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        <label 
                          className={`btn btn-ghost btn-sm ${uploadingId === p.ID_Patron ? 'loading' : ''}`} 
                          style={{ cursor: 'pointer', padding: '6px' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {p.PDF_Certificado ? <RefreshCcw size={14} /> : <Upload size={14} />}
                          <input 
                            type="file" 
                            accept=".pdf" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleFileUpload(e, p.ID_Patron)}
                            disabled={!!uploadingId}
                          />
                        </label>
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.ID_Patron && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, background: 'var(--snow-1)' }}>
                        <div style={{ padding: '20px 32px', borderLeft: `4px solid ${p.Estado_Vigencia === 'VIGENTE' ? 'var(--success)' : 'var(--danger)'}`, display: 'flex', gap: 40 }}>
                          <div 
                            className="qr-card" 
                            style={{ 
                              background: '#fff', 
                              padding: 24, 
                              borderRadius: 20, 
                              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: 16,
                              width: 220,
                              border: '1px solid var(--snow-3)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
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
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase' }}>CÓDIGO DIGITAL QR</div>
                              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, background: 'var(--accent-dim)', padding: '3px 10px', borderRadius: 999 }}>🖨️ Clic para imprimir</div>
                            </div>
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: 14 }}>Detalles del Patrón</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID Sistema</label>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.ID_Patron}</div>
                              </div>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Laboratorio</label>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.Proveedor_Laboratorio || 'No especificado'}</div>
                              </div>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Última Calibración</label>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatFecha(p.Fecha_Calibracion_Externa)}</div>
                              </div>
                              <div className="spec-item">
                                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vencimiento</label>
                                <div style={{ fontSize: 13, fontWeight: 600, color: p.Estado_Vigencia === 'VENCIDO' ? 'var(--danger)' : 'inherit' }}>
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
          background: var(--snow-2);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--snow-3);
        }
      `}</style>
      {showCreateModal && (
        <CreatePatronModal 
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); loadPatrones() }}
        />
      )}
    </div>
  )
}
