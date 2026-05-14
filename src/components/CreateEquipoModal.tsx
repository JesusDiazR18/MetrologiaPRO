'use client'
import { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function CreateEquipoModal({ onClose, onSaved }: Props) {
  const [formData, setFormData] = useState({
    ID_Equipo: '',
    Tipo: 'EQUIPO',
    Codigo_Interno: '',
    Nombre_Equipo: '',
    Tolerancia_Aceptable: '',
    Unidad_Tolerancia: '',
    Area_Asignada: '',
    Responsable: '',
    Periodicidad_Meses: '12',
    Estado: 'OPERATIVO'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Efecto para sugerir ID automáticamente
  useEffect(() => {
    if (formData.Tipo) {
      fetch(`/api/equipos?suggestId=true&tipo=${formData.Tipo}`)
        .then(r => r.json())
        .then(d => {
          if (d.nextId) {
            setFormData(prev => ({ 
              ...prev, 
              ID_Equipo: d.nextId,
              Codigo_Interno: `QMS-${d.nextId}` // Sugerencia automática de código QR
            }))
          }
        })
    }
  }, [formData.Tipo])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formData.ID_Equipo || !formData.Nombre_Equipo || !formData.Codigo_Interno) {
      setError('ID, Nombre y Código son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    try {
      const r = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          Tolerancia_Aceptable: parseFloat(formData.Tolerancia_Aceptable) || 0,
          Periodicidad_Meses: parseInt(formData.Periodicidad_Meses) || 12
        })
      })
      if (r.ok) {
        onSaved()
      } else {
        const d = await r.json()
        setError(d.error ?? 'Error al guardar el equipo')
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <span className="modal-title">Nuevo Equipo / Instrumento</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tipo de Activo *</label>
                <select 
                  className="form-control" 
                  value={formData.Tipo} 
                  onChange={e => setFormData({...formData, Tipo: e.target.value})}
                >
                  <option value="EQUIPO">Equipo</option>
                  <option value="INSTRUMENTO">Instrumento</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ID Sistema (Unico) *</label>
                <input 
                  className="form-control" 
                  value={formData.ID_Equipo} 
                  onChange={e => setFormData({...formData, ID_Equipo: e.target.value})}
                  placeholder="Ej: EQ-001"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del Equipo *</label>
              <input 
                className="form-control" 
                value={formData.Nombre_Equipo} 
                onChange={e => setFormData({...formData, Nombre_Equipo: e.target.value})}
                placeholder="Ej: Multímetro Digital Fluke"
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Código Interno (QR) *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="form-control" 
                    value={formData.Codigo_Interno} 
                    onChange={e => setFormData({...formData, Codigo_Interno: e.target.value})}
                    placeholder="Ej: QMS-MET-01"
                    required
                  />
                  <div style={{ fontSize: 9, color: 'var(--accent)', marginTop: 4, fontWeight: 700 }}>
                    ✨ GENERADO AUTOMÁTICAMENTE
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Área Asignada</label>
                <input 
                  className="form-control" 
                  value={formData.Area_Asignada} 
                  onChange={e => setFormData({...formData, Area_Asignada: e.target.value})}
                  placeholder="Ej: Laboratorio"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tolerancia Aceptable</label>
                <input 
                  className="form-control" 
                  type="number" 
                  step="any" 
                  value={formData.Tolerancia_Aceptable} 
                  onChange={e => setFormData({...formData, Tolerancia_Aceptable: e.target.value})}
                  placeholder="Ej: 0.05"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <input 
                  className="form-control" 
                  value={formData.Unidad_Tolerancia} 
                  onChange={e => setFormData({...formData, Unidad_Tolerancia: e.target.value})}
                  placeholder="Ej: mm, V, °C"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Periodicidad (Meses)</label>
                <input 
                  className="form-control" 
                  type="number" 
                  value={formData.Periodicidad_Meses} 
                  onChange={e => setFormData({...formData, Periodicidad_Meses: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Responsable</label>
                <input 
                  className="form-control" 
                  value={formData.Responsable} 
                  onChange={e => setFormData({...formData, Responsable: e.target.value})}
                  placeholder="Nombre del encargado"
                />
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: 20 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? '⏳ Guardando...' : '✓ Crear Activo'}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .modal {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
            display: flex;
            flex-direction: column;
          }
          .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px 16px !important;
          }
          .grid-2 {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .modal-footer {
            padding: 16px !important;
            background: #fff;
            border-top: 1px solid #f1f5f9;
          }
          .btn {
            padding: 12px !important;
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  )
}
