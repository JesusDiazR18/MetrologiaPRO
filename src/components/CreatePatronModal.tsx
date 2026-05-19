'use client'
import { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function CreatePatronModal({ onClose, onSaved }: Props) {
  const [formData, setFormData] = useState({
    ID_Patron: '',
    Codigo: '',
    Nombre_Patron: '',
    Fecha_Calibracion_Externa: new Date().toISOString().split('T')[0],
    Fecha_Vencimiento_Certificado: '',
    N_Certificado: '',
    Proveedor_Laboratorio: '',
    Estado_Vigencia: 'SIN CERTIFICADO',
    Magnitud: 'TEMPERATURA'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customMag, setCustomMag] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  useEffect(() => {
    fetch('/api/patrones?suggestId=true')
      .then(r => r.json())
      .then(d => {
        if (d.nextId) {
          setFormData(prev => ({
            ...prev,
            ID_Patron: d.nextId,
            Codigo: d.nextId
          }))
        }
      })
  }, [])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formData.ID_Patron || !formData.Nombre_Patron) {
      setError('ID / Código y Nombre son obligatorios')
      return
    }
    if (photoFile && photoFile.size > 4.5 * 1024 * 1024) {
      setError('La imagen seleccionada supera el límite de 4.5 MB. Por favor, reduzca el tamaño de la imagen o seleccione otra.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const finalMag = formData.Magnitud === 'OTRA' ? (customMag.trim() || 'OTRA') : formData.Magnitud

      const r = await fetch('/api/patrones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          Magnitud: finalMag,
          Codigo: formData.ID_Patron, // Asegurar que Código sea idéntico a ID_Patron
          Fecha_Calibracion_Externa: formData.Fecha_Calibracion_Externa ? new Date(formData.Fecha_Calibracion_Externa).toISOString() : null,
          Fecha_Vencimiento_Certificado: formData.Fecha_Vencimiento_Certificado ? new Date(formData.Fecha_Vencimiento_Certificado).toISOString() : null
        })
      })
      if (r.ok) {
        const d = await r.json()
        if (photoFile && d.ID_Patron) {
          const formDataObj = new FormData()
          formDataObj.append('file', photoFile)
          formDataObj.append('assetId', d.ID_Patron)
          formDataObj.append('assetType', 'PATRON')
          formDataObj.append('uploadType', 'FOTO')
          await fetch('/api/upload', { method: 'POST', body: formDataObj }).catch(err => console.error('Error subiendo foto:', err))
        }
        onSaved()
      } else {
        const d = await r.json()
        setError(d.error ?? 'Error al guardar el patrón')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ width: 38, height: 38, background: 'var(--oxford-blue)', borderRadius: 12, display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div>
            <span className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>Nuevo Patrón de Referencia</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Registro e identificación de patrón estándar</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24, marginLeft: 'auto' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{error}</div>}
            
            <div className="form-section">
              <div className="section-title">1. Identificación del Patrón</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Código / ID de Identificación *</label>
                  <input 
                    className="form-control" 
                    value={formData.ID_Patron} 
                    onChange={e => setFormData({...formData, ID_Patron: e.target.value.toUpperCase(), Codigo: e.target.value.toUpperCase()})} 
                    placeholder="Ej: PAT-001"
                    required 
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                    Se usará como identificador único y para la generación automática del código QR.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Magnitud Física *</label>
                  <select 
                    className="form-control" 
                    value={formData.Magnitud} 
                    onChange={e => setFormData({...formData, Magnitud: e.target.value})}
                    required
                  >
                    <option value="TEMPERATURA">TEMPERATURA</option>
                    <option value="MASA">MASA</option>
                    <option value="LONGITUD">LONGITUD</option>
                    <option value="PRESION">PRESIÓN</option>
                    <option value="TIEMPO">TIEMPO</option>
                    <option value="ELECTRICA">ELÉCTRICA</option>
                    <option value="VOLUMEN">VOLUMEN</option>
                    <option value="OTRA">OTRA MAGNITUD</option>
                  </select>
                  {formData.Magnitud === 'OTRA' && (
                    <div style={{ marginTop: 12 }}>
                      <input 
                        className="form-control" 
                        placeholder="Especifique el nombre (Ej: DENSIDAD, VISCOSIDAD...)"
                        value={customMag}
                        onChange={e => setCustomMag(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Patrón *</label>
                <input className="form-control" value={formData.Nombre_Patron} onChange={e => setFormData({...formData, Nombre_Patron: e.target.value})} placeholder="Ej: Masa Patrón 1kg Clase E2" required />
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">2. Calibración y Laboratorio</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha Calibración Externa</label>
                  <input className="form-control" type="date" value={formData.Fecha_Calibracion_Externa} onChange={e => setFormData({...formData, Fecha_Calibracion_Externa: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vencimiento Certificado</label>
                  <input className="form-control" type="date" value={formData.Fecha_Vencimiento_Certificado} onChange={e => setFormData({...formData, Fecha_Vencimiento_Certificado: e.target.value})} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">N° Certificado</label>
                  <input className="form-control" value={formData.N_Certificado} onChange={e => setFormData({...formData, N_Certificado: e.target.value})} placeholder="Ej: CERT-2026-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Proveedor / Laboratorio</label>
                  <input className="form-control" value={formData.Proveedor_Laboratorio} onChange={e => setFormData({...formData, Proveedor_Laboratorio: e.target.value})} placeholder="Ej: Metrología Nacional" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Estado de Vigencia</label>
                <select className="form-control" value={formData.Estado_Vigencia} onChange={e => setFormData({...formData, Estado_Vigencia: e.target.value})}>
                  <option value="VIGENTE">VIGENTE / APTO</option>
                  <option value="SIN CERTIFICADO">SIN CERTIFICADO</option>
                  <option value="VENCIDO">VENCIDO / FUERA DE NORMA</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Fotografía del Patrón (Opcional)</label>
                {photoFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--snow-1)', border: '1px solid var(--cyan)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: 'var(--cyan-dim)', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 18 }}>📸</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--oxford-blue)' }}>{photoFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setPhotoFile(null)} style={{ background: 'var(--danger-dim)', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Quitar Foto</button>
                  </div>
                ) : (
                  <label 
                    style={{ 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: 14, 
                      padding: '24px 20px', 
                      textAlign: 'center', 
                      background: '#f8fafc', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: 28 }}>📸</span>
                    <div style={{ fontWeight: 600, color: 'var(--oxford-blue)', fontSize: 13 }}>
                      Haz clic para subir o arrastra la foto del patrón aquí
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Formatos JPG, PNG, WEBP (Máx 4.5 MB)</div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={e => e.target.files?.[0] && setPhotoFile(e.target.files[0])} 
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--snow-1)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? '⏳ Guardando...' : '✓ Registrar Patrón'}
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
