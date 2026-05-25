'use client'
import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, FileText, CheckCircle, XCircle, AlertCircle, Calendar, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CalibracionEntry {
  ID_Calibracion: string
  FK_ID_Patron: string
  Fecha_Calibracion: string
  Fecha_Vencimiento: string | null
  N_Certificado: string | null
  Laboratorio: string | null
  PDF_Certificado: string | null
  Resultado: string
  Observaciones: string | null
  Responsable: string | null
  Creado_En: string
}

interface Patron {
  ID_Patron: string
  Codigo: string
  Nombre_Patron: string
  Magnitud: string | null
}

interface PatronCalibrationHistoryModalProps {
  patron: Patron
  onClose: () => void
  onSaved?: () => void
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ResultadoBadge({ resultado }: { resultado: string }) {
  if (resultado === 'APROBADO') {
    return (
      <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(16,185,129,0.25)' }}>
        <CheckCircle size={11} /> APROBADO
      </span>
    )
  }
  if (resultado === 'RECHAZADO') {
    return (
      <span style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(239,68,68,0.25)' }}>
        <XCircle size={11} /> RECHAZADO
      </span>
    )
  }
  return (
    <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(245,158,11,0.25)' }}>
      <AlertCircle size={11} /> CONDICIONAL
    </span>
  )
}

export default function PatronCalibrationHistoryModal({ patron, onClose, onSaved }: PatronCalibrationHistoryModalProps) {
  const [calibraciones, setCalibraciones] = useState<CalibracionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [fechaCal, setFechaCal] = useState(new Date().toISOString().split('T')[0])
  const [fechaVenc, setFechaVenc] = useState('')
  const [nCert, setNCert] = useState('')
  const [laboratorio, setLaboratorio] = useState('')
  const [resultado, setResultado] = useState<'APROBADO' | 'RECHAZADO' | 'CONDICIONAL'>('APROBADO')
  const [observaciones, setObservaciones] = useState('')
  const [responsable, setResponsable] = useState('')
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [updatePatronData, setUpdatePatronData] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCalibraciones()
  }, [])

  async function loadCalibraciones() {
    setLoading(true)
    try {
      const res = await fetch(`/api/patrones/${patron.ID_Patron}/historial`)
      if (res.ok) {
        const data = await res.json()
        setCalibraciones(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El PDF no debe superar los 5 MB')
      return
    }
    setPdfName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPdfBase64(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fechaCal || !resultado) {
      toast.error('La fecha de calibración y el resultado son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = {
        Fecha_Calibracion: fechaCal,
        Fecha_Vencimiento: fechaVenc || null,
        N_Certificado: nCert || null,
        Laboratorio: laboratorio || null,
        PDF_Certificado: pdfBase64 || null,
        Resultado: resultado,
        Observaciones: observaciones || null,
        Responsable: responsable || null,
        updatePatron: updatePatronData && resultado === 'APROBADO'
      }
      const res = await fetch(`/api/patrones/${patron.ID_Patron}/historial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error al guardar')
      }
      toast.success('Calibración registrada exitosamente')
      setShowForm(false)
      resetForm()
      loadCalibraciones()
      if (onSaved && updatePatronData && resultado === 'APROBADO') onSaved()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la calibración')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setFechaCal(new Date().toISOString().split('T')[0])
    setFechaVenc('')
    setNCert('')
    setLaboratorio('')
    setResultado('APROBADO')
    setObservaciones('')
    setResponsable('')
    setPdfBase64(null)
    setPdfName('')
    setUpdatePatronData(true)
  }

  async function handleDelete(calId: string) {
    if (!confirm('¿Seguro que deseas eliminar este registro de calibración?')) return
    setDeletingId(calId)
    try {
      const res = await fetch(`/api/patrones/${patron.ID_Patron}/historial/${calId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Registro eliminado')
      loadCalibraciones()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  function openPdf(url: string) {
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',')
        const base64 = parts[1]
        const mime = parts[0].split(':')[1].split(';')[0]
        const binary = atob(base64)
        const arr = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
        const blob = new Blob([arr], { type: mime })
        window.open(URL.createObjectURL(blob), '_blank')
      } catch { window.open(url, '_blank') }
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,15,28,0.85)', backdropFilter: 'blur(10px)', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--snow-3)',
          borderRadius: 20,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          width: '100%',
          maxWidth: 780,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--snow-3)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={22} color="var(--cyan)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Historial de Calibraciones</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>
              <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginRight: 6 }}>{patron.Codigo}</span>
              {patron.Nombre_Patron}
              {patron.Magnitud && (
                <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: 12, color: 'var(--cyan)', border: '1px solid rgba(0,229,255,0.2)', fontWeight: 600 }}>{patron.Magnitud}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--snow-3)', borderRadius: 8, width: 34, height: 34, color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Add button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-cyan"
              onClick={() => setShowForm(v => !v)}
              style={{ gap: 8 }}
            >
              {showForm ? <ChevronUp size={15} /> : <Plus size={15} />}
              {showForm ? 'Cancelar' : 'Registrar Calibración'}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>Nueva Entrada de Calibración</h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Calibración *</label>
                  <input type="date" className="form-input" value={fechaCal} onChange={e => setFechaCal(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Vencimiento</label>
                  <input type="date" className="form-input" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">N° Certificado</label>
                  <input type="text" className="form-input" value={nCert} onChange={e => setNCert(e.target.value)} placeholder="Ej. CERT-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Laboratorio / Proveedor</label>
                  <input type="text" className="form-input" value={laboratorio} onChange={e => setLaboratorio(e.target.value)} placeholder="Ej. LABMETRO" />
                </div>
                <div className="form-group">
                  <label className="form-label">Resultado *</label>
                  <select className="form-input" value={resultado} onChange={e => setResultado(e.target.value as any)} required>
                    <option value="APROBADO">✅ APROBADO</option>
                    <option value="CONDICIONAL">⚠️ CONDICIONAL</option>
                    <option value="RECHAZADO">❌ RECHAZADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Responsable</label>
                  <input type="text" className="form-input" value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Nombre del responsable" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea className="form-input" rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas o detalles adicionales..." style={{ resize: 'vertical', minHeight: 60 }} />
              </div>

              {/* PDF upload */}
              <div className="form-group">
                <label className="form-label">Certificado PDF (máx. 5 MB)</label>
                <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handlePdfChange} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '1px dashed var(--snow-3)', color: 'var(--text-dim)', gap: 6 }}
                  >
                    <Upload size={14} /> {pdfName ? `📄 ${pdfName}` : 'Adjuntar PDF'}
                  </button>
                  {pdfBase64 && (
                    <button type="button" className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => { setPdfBase64(null); setPdfName('') }}>
                      <X size={12} /> Quitar
                    </button>
                  )}
                </div>
              </div>

              {/* Sync with patron */}
              {resultado === 'APROBADO' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-soft)', background: 'rgba(16,185,129,0.07)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                  <input
                    type="checkbox"
                    checked={updatePatronData}
                    onChange={e => setUpdatePatronData(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#10b981' }}
                  />
                  <span>Actualizar datos del patrón (certificado, vencimiento, laboratorio) con esta calibración</span>
                </label>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</button>
                <button type="submit" className="btn btn-cyan btn-sm" disabled={saving}>
                  {saving ? 'Guardando...' : '✓ Guardar Calibración'}
                </button>
              </div>
            </form>
          )}

          {/* History list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Cargando historial...</p>
            </div>
          ) : calibraciones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
              <Calendar size={44} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-soft)' }}>Sin historial de calibraciones</p>
              <p style={{ fontSize: 13 }}>Registra la primera calibración de este patrón</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>
                {calibraciones.length} registro{calibraciones.length !== 1 ? 's' : ''} de calibración
              </p>
              {calibraciones.map((cal, idx) => (
                <div
                  key={cal.ID_Calibracion}
                  style={{
                    background: idx === 0 ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${idx === 0 ? 'rgba(0,229,255,0.2)' : 'var(--snow-3)'}`,
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {idx === 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(0,229,255,0.12)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid rgba(0,229,255,0.25)' }}>
                          Última
                        </span>
                      )}
                      <ResultadoBadge resultado={cal.Resultado} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                        {formatDate(cal.Fecha_Calibracion)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {cal.PDF_Certificado && (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => openPdf(cal.PDF_Certificado!)}
                          style={{ color: 'var(--cyan)', border: '1px solid rgba(0,229,255,0.2)' }}
                        >
                          <FileText size={12} style={{ display: 'inline', marginRight: 4 }} /> PDF
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleDelete(cal.ID_Calibracion)}
                        disabled={deletingId === cal.ID_Calibracion}
                        style={{ color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 20px' }}>
                    {cal.N_Certificado && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>N° Certificado</div>
                        <div style={{ fontSize: 13, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{cal.N_Certificado}</div>
                      </div>
                    )}
                    {cal.Laboratorio && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Laboratorio</div>
                        <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{cal.Laboratorio}</div>
                      </div>
                    )}
                    {cal.Fecha_Vencimiento && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vence</div>
                        <div style={{ fontSize: 13, color: new Date(cal.Fecha_Vencimiento) < new Date() ? '#ef4444' : 'var(--text-main)', fontWeight: 600 }}>{formatDate(cal.Fecha_Vencimiento)}</div>
                      </div>
                    )}
                    {cal.Responsable && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Responsable</div>
                        <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{cal.Responsable}</div>
                      </div>
                    )}
                  </div>

                  {cal.Observaciones && (
                    <div style={{ fontSize: 13, color: 'var(--text-soft)', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px', borderLeft: '3px solid var(--snow-3)', fontStyle: 'italic' }}>
                      {cal.Observaciones}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
