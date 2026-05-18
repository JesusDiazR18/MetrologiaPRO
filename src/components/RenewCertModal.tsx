'use client'
import { useState } from 'react'
import { Upload, CheckCircle2 } from 'lucide-react'

interface Props {
  asset: {
    id: string
    name: string
    type: 'EQUIPO' | 'INSTRUMENTO' | 'PATRON'
    nCert?: string
    prov?: string
    fechaCal?: string
    fechaVenc?: string
  }
  onClose: () => void
  onSaved: () => void
}

export default function RenewCertModal({ asset, onClose, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [nCert, setNCert] = useState(asset.nCert || '')
  const [prov, setProv] = useState(asset.prov || '')
  const [fechaCal, setFechaCal] = useState(asset.fechaCal || new Date().toISOString().split('T')[0])
  const [fechaVenc, setFechaVenc] = useState(asset.fechaVenc || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!file) {
      setError('Debes seleccionar un archivo PDF para el certificado')
      return
    }
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('assetId', asset.id)
    formData.append('assetType', asset.type)
    formData.append('nCert', nCert)
    formData.append('prov', prov)
    formData.append('fechaCal', fechaCal)
    formData.append('fechaVenc', fechaVenc)

    try {
      const r = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      if (r.ok) {
        onSaved()
      } else {
        const d = await r.json()
        setError(d.error ?? 'Error al renovar el certificado')
      }
    } catch (err) {
      setError('Error de red al subir el certificado')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div style={{ width: 38, height: 38, background: 'var(--success)', borderRadius: 12, display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
            <CheckCircle2 color="#ffffff" size={20} />
          </div>
          <div>
            <span className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>Renovar Certificado Digital</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{asset.name} ({asset.id})</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24, marginLeft: 'auto' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{error}</div>}
            
            <div className="form-section">
              <div className="section-title">Archivo de Certificado</div>
              <label 
                className="file-drop-area" 
                style={{ 
                  border: '2px dashed var(--cyan)', 
                  borderRadius: 14, 
                  padding: '32px 20px', 
                  textAlign: 'center', 
                  background: 'var(--cyan-dim)', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 12,
                  transition: 'all 0.2s'
                }}
              >
                <Upload size={32} color="var(--cyan)" />
                <div style={{ fontWeight: 600, color: 'var(--oxford-blue)' }}>
                  {file ? file.name : 'Haz clic para seleccionar o arrastra el PDF aquí'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Formato PDF aceptado (Máx 10 MB)</div>
                <input 
                  type="file" 
                  accept=".pdf" 
                  style={{ display: 'none' }} 
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} 
                />
              </label>
            </div>

            <div className="form-section">
              <div className="section-title">Detalles de Calibración / Control</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">N° Certificado *</label>
                  <input className="form-control" value={nCert} onChange={e => setNCert(e.target.value)} placeholder="Ej: CERT-2026-10" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Laboratorio / Proveedor *</label>
                  <input className="form-control" value={prov} onChange={e => setProv(e.target.value)} placeholder="Ej: Metrología Externa S.A." required />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha de Emisión</label>
                  <input className="form-control" type="date" value={fechaCal} onChange={e => setFechaCal(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Vencimiento *</label>
                  <input className="form-control" type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} required />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--snow-1)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={uploading}>
              {uploading ? '⏳ Subiendo y Renovando...' : '✓ Confirmar Renovación'}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .form-section {
          background: #ffffff;
          border: 1px solid var(--snow-3);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .section-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--oxford-blue);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--snow-2);
          padding-bottom: 8px;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  )
}
