'use client'
import { useState } from 'react'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function CreatePatronModal({ onClose, onSaved }: Props) {
  const [formData, setFormData] = useState({
    ID_Patron: '',
    Codigo: '',
    Nombre_Patron: '',
    Fecha_Calibracion_Externa: '',
    Fecha_Vencimiento_Certificado: '',
    N_Certificado: '',
    Proveedor_Laboratorio: '',
    Estado_Vigencia: 'VIGENTE'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formData.ID_Patron || !formData.Nombre_Patron || !formData.Codigo) {
      setError('ID, Nombre y Código son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    try {
      const r = await fetch('/api/patrones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          Fecha_Calibracion_Externa: formData.Fecha_Calibracion_Externa ? new Date(formData.Fecha_Calibracion_Externa).toISOString() : null,
          Fecha_Vencimiento_Certificado: formData.Fecha_Vencimiento_Certificado ? new Date(formData.Fecha_Vencimiento_Certificado).toISOString() : null
        })
      })
      if (r.ok) {
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
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div style={{ width: 36, height: 36, background: 'var(--oxford-blue)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <span className="modal-title">Nuevo Patrón de Referencia</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">ID Sistema *</label>
                <input 
                  className="form-control" 
                  value={formData.ID_Patron} 
                  onChange={e => setFormData({...formData, ID_Patron: e.target.value})}
                  placeholder="Ej: PAT-01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Código Interno *</label>
                <input 
                  className="form-control" 
                  value={formData.Codigo} 
                  onChange={e => setFormData({...formData, Codigo: e.target.value})}
                  placeholder="Ej: QMS-PAT-001"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del Patrón *</label>
              <input 
                className="form-control" 
                value={formData.Nombre_Patron} 
                onChange={e => setFormData({...formData, Nombre_Patron: e.target.value})}
                placeholder="Ej: Bloque Patrón Grado 0"
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Fecha Calibración</label>
                <input 
                  className="form-control" 
                  type="date"
                  value={formData.Fecha_Calibracion_Externa} 
                  onChange={e => setFormData({...formData, Fecha_Calibracion_Externa: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vencimiento Certificado</label>
                <input 
                  className="form-control" 
                  type="date"
                  value={formData.Fecha_Vencimiento_Certificado} 
                  onChange={e => setFormData({...formData, Fecha_Vencimiento_Certificado: e.target.value})}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">N° Certificado</label>
                <input 
                  className="form-control" 
                  value={formData.N_Certificado} 
                  onChange={e => setFormData({...formData, N_Certificado: e.target.value})}
                  placeholder="Ej: CERT-2024-001"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Proveedor / Laboratorio</label>
                <input 
                  className="form-control" 
                  value={formData.Proveedor_Laboratorio} 
                  onChange={e => setFormData({...formData, Proveedor_Laboratorio: e.target.value})}
                  placeholder="Ej: Metrología Avanzada S.A."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado de Vigencia</label>
              <select 
                className="form-control" 
                value={formData.Estado_Vigencia} 
                onChange={e => setFormData({...formData, Estado_Vigencia: e.target.value})}
              >
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDO">Vencido / Fuera de Norma</option>
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: 20 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? '⏳ Guardando...' : '✓ Registrar Patrón'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
