'use client'
import { useState } from 'react'

interface Props {
  patron: any
  onClose: () => void
  onSaved: () => void
}

export default function EditPatronModal({ patron, onClose, onSaved }: Props) {
  const standardMags = ['TEMPERATURA', 'MASA', 'LONGITUD', 'PRESION', 'TIEMPO', 'ELECTRICA', 'VOLUMEN']
  const isCustomMag = patron.Magnitud && !standardMags.includes(patron.Magnitud) && patron.Magnitud !== 'OTRA'
  const initialMagValue = isCustomMag ? 'OTRA' : (patron.Magnitud || 'TEMPERATURA')
  const initialCustomMagValue = isCustomMag ? patron.Magnitud : ''

  const [formData, setFormData] = useState({
    Codigo: patron.Codigo || patron.ID_Patron || '',
    Nombre_Patron: patron.Nombre_Patron || '',
    Fecha_Calibracion_Externa: patron.Fecha_Calibracion_Externa ? new Date(patron.Fecha_Calibracion_Externa).toISOString().split('T')[0] : '',
    Fecha_Vencimiento_Certificado: patron.Fecha_Vencimiento_Certificado ? new Date(patron.Fecha_Vencimiento_Certificado).toISOString().split('T')[0] : '',
    N_Certificado: patron.N_Certificado || '',
    Proveedor_Laboratorio: patron.Proveedor_Laboratorio || '',
    Estado_Vigencia: patron.Estado_Vigencia || 'VIGENTE',
    Magnitud: initialMagValue
  })
  const [customMag, setCustomMag] = useState(initialCustomMagValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formData.Nombre_Patron || !formData.Codigo) {
      setError('Nombre y Código son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    try {
      const finalMag = formData.Magnitud === 'OTRA' ? (customMag.trim() || 'OTRA') : formData.Magnitud

      const payload = {
        ...formData,
        Magnitud: finalMag,
        Codigo: formData.Codigo, // Mantener idénticos
        Fecha_Calibracion_Externa: formData.Fecha_Calibracion_Externa ? new Date(formData.Fecha_Calibracion_Externa).toISOString() : null,
        Fecha_Vencimiento_Certificado: formData.Fecha_Vencimiento_Certificado ? new Date(formData.Fecha_Vencimiento_Certificado).toISOString() : null
      }

      const r = await fetch(`/api/patrones/${patron.ID_Patron}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) {
        onSaved()
      } else {
        const d = await r.json()
        setError(d.error ?? 'Error al actualizar el patrón')
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div>
            <span className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>Editar Patrón ({patron.ID_Patron})</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Modificación de datos y vigencia de calibración</div>
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
                  <label className="form-label">Código / ID (Fijo)</label>
                  <input className="form-control" value={formData.Codigo} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
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
                <input className="form-control" value={formData.Nombre_Patron} onChange={e => setFormData({...formData, Nombre_Patron: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Estado de Vigencia</label>
                <select className="form-control" value={formData.Estado_Vigencia} onChange={e => setFormData({...formData, Estado_Vigencia: e.target.value})}>
                  <option value="VIGENTE">VIGENTE / APTO</option>
                  <option value="SIN CERTIFICADO">SIN CERTIFICADO</option>
                  <option value="VENCIDO">VENCIDO / FUERA DE NORMA</option>
                </select>
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
                  <input className="form-control" value={formData.N_Certificado} onChange={e => setFormData({...formData, N_Certificado: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Proveedor / Laboratorio</label>
                  <input className="form-control" value={formData.Proveedor_Laboratorio} onChange={e => setFormData({...formData, Proveedor_Laboratorio: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--snow-1)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? '⏳ Guardando Cambios...' : '✓ Guardar Cambios'}
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
