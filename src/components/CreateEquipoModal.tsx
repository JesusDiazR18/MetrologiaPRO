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
    Marca: '',
    Modelo: '',
    Serie: '',
    Rango_Medida: '',
    Resolucion: '',
    Tolerancia_Aceptable: '',
    Unidad_Tolerancia: '',
    Area_Asignada: '',
    Responsable: '',
    Periodicidad_Meses: '12',
    Fecha_Ultima_Verificacion: new Date().toISOString().split('T')[0],
    Fecha_Proximo_Control: '',
    Estado: 'OPERATIVO',
    N_Certificado: '',
    Proveedor_Servicio: '',
    Fecha_Vencimiento_Certificado: '',
    Magnitud: 'TEMPERATURA',
    Accesorios: '',
    Insumos: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const magnitudesDisponibles = [
    'TEMPERATURA', 'MASA', 'LONGITUD', 'PRESION',
    'TIEMPO', 'ELECTRICA', 'VOLUMEN', 'OTRA'
  ]

  function toggleMagnitud(mag: string) {
    const current = formData.Magnitud ? formData.Magnitud.split(',').map(m => m.trim()).filter(Boolean) : []
    let updated: string[]
    if (current.includes(mag)) {
      if (current.length === 1) return // Mantener al menos 1
      updated = current.filter(m => m !== mag)
    } else {
      updated = [...current, mag]
    }
    setFormData(prev => ({ ...prev, Magnitud: updated.join(', ') }))
  }

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
              Codigo_Interno: `QMS-${d.nextId}`
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
      const payload = {
        ...formData,
        Tolerancia_Aceptable: parseFloat(formData.Tolerancia_Aceptable) || 0,
        Periodicidad_Meses: parseInt(formData.Periodicidad_Meses) || 12,
        Fecha_Ultima_Verificacion: formData.Fecha_Ultima_Verificacion ? new Date(formData.Fecha_Ultima_Verificacion).toISOString() : null,
        Fecha_Proximo_Control: formData.Fecha_Proximo_Control ? new Date(formData.Fecha_Proximo_Control).toISOString() : null,
        Fecha_Vencimiento_Certificado: formData.Fecha_Vencimiento_Certificado ? new Date(formData.Fecha_Vencimiento_Certificado).toISOString() : null
      }

      const r = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  const selectedMags = formData.Magnitud ? formData.Magnitud.split(',').map(m => m.trim()) : []

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ width: 38, height: 38, background: 'var(--accent)', borderRadius: 12, display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px var(--accent-dim)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <div>
            <span className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>Nuevo Activo QMS</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Registro e identificación de equipo o instrumento</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24, marginLeft: 'auto' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div className="modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{error}</div>}
            
            <div className="form-section">
              <div className="section-title">1. Clasificación e Identificación</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Activo *</label>
                  <select 
                    className="form-control" 
                    value={formData.Tipo} 
                    onChange={e => {
                      const val = e.target.value
                      setFormData(prev => ({
                        ...prev, 
                        Tipo: val,
                        ...(val === 'INSTRUMENTO' ? { N_Certificado: '', Proveedor_Servicio: '', Fecha_Vencimiento_Certificado: '' } : {})
                      }))
                    }}
                  >
                    <option value="EQUIPO">Equipo</option>
                    <option value="INSTRUMENTO">Instrumento</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID Sistema (Automático) *</label>
                  <input 
                    className="form-control" 
                    value={formData.ID_Equipo} 
                    onChange={e => setFormData({...formData, ID_Equipo: e.target.value})}
                    placeholder="Ej: E-01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Magnitudes Físicas que Mide (Selección Múltiple) *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {magnitudesDisponibles.map(mag => {
                    const isSelected = selectedMags.includes(mag)
                    return (
                      <button
                        type="button"
                        key={mag}
                        onClick={() => toggleMagnitud(mag)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--snow-3)',
                          background: isSelected ? 'var(--cyan)' : 'var(--snow-1)',
                          color: isSelected ? '#000000' : 'var(--text-main)',
                          boxShadow: isSelected ? '0 2px 8px rgba(0, 229, 255, 0.3)' : 'none'
                        }}
                      >
                        {isSelected ? '✓ ' : ''}{mag}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nombre del Activo *</label>
                  <input 
                    className="form-control" 
                    value={formData.Nombre_Equipo} 
                    onChange={e => setFormData({...formData, Nombre_Equipo: e.target.value})}
                    placeholder="Ej: Multímetro Digital Fluke"
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Código Interno (QR) *</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      className="form-control" 
                      value={formData.Codigo_Interno} 
                      onChange={e => setFormData({...formData, Codigo_Interno: e.target.value})}
                      required
                    />
                    <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, fontWeight: 700 }}>
                      ✨ CÓDIGO QR GENERADO
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Área Asignada</label>
                  <input 
                    className="form-control" 
                    value={formData.Area_Asignada} 
                    onChange={e => setFormData({...formData, Area_Asignada: e.target.value})}
                    placeholder="Ej: Laboratorio / Producción"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">2. Especificaciones Técnicas y Control</div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input className="form-control" value={formData.Marca} onChange={e => setFormData({...formData, Marca: e.target.value})} placeholder="Ej: Fluke" />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input className="form-control" value={formData.Modelo} onChange={e => setFormData({...formData, Modelo: e.target.value})} placeholder="Ej: 17B+" />
                </div>
                <div className="form-group">
                  <label className="form-label">N° Serie</label>
                  <input className="form-control" value={formData.Serie} onChange={e => setFormData({...formData, Serie: e.target.value})} placeholder="Ej: 98214" />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Tolerancia Aceptable</label>
                  <input className="form-control" type="number" step="any" value={formData.Tolerancia_Aceptable} onChange={e => setFormData({...formData, Tolerancia_Aceptable: e.target.value})} placeholder="Ej: 0.05" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unidad de Medida</label>
                  <input className="form-control" value={formData.Unidad_Tolerancia} onChange={e => setFormData({...formData, Unidad_Tolerancia: e.target.value})} placeholder="Ej: V, mm, °C" />
                </div>
                <div className="form-group">
                  <label className="form-label">Periodicidad (Meses)</label>
                  <input className="form-control" type="number" value={formData.Periodicidad_Meses} onChange={e => setFormData({...formData, Periodicidad_Meses: e.target.value})} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha Última Verificación</label>
                  <input className="form-control" type="date" value={formData.Fecha_Ultima_Verificacion} onChange={e => setFormData({...formData, Fecha_Ultima_Verificacion: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Responsable Asignado</label>
                  <input className="form-control" value={formData.Responsable} onChange={e => setFormData({...formData, Responsable: e.target.value})} placeholder="Ej: Cesar Munizaga" />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Accesorios del Equipo</label>
                  <input className="form-control" value={formData.Accesorios} onChange={e => setFormData({...formData, Accesorios: e.target.value})} placeholder="Ej: Cables, pinzas, sondas..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Insumos que Consume</label>
                  <input className="form-control" value={formData.Insumos} onChange={e => setFormData({...formData, Insumos: e.target.value})} placeholder="Ej: Baterías 9V, papel térmico..." />
                </div>
              </div>
            </div>

            {formData.Tipo === 'EQUIPO' && (
              <div className="form-section">
                <div className="section-title">3. Certificado de Calibración / Servicio</div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">N° Certificado</label>
                    <input className="form-control" value={formData.N_Certificado} onChange={e => setFormData({...formData, N_Certificado: e.target.value})} placeholder="Ej: CERT-2026-09" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proveedor / Laboratorio</label>
                    <input className="form-control" value={formData.Proveedor_Servicio} onChange={e => setFormData({...formData, Proveedor_Servicio: e.target.value})} placeholder="Ej: Metrología Externa S.A." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vencimiento Certificado</label>
                    <input className="form-control" type="date" value={formData.Fecha_Vencimiento_Certificado} onChange={e => setFormData({...formData, Fecha_Vencimiento_Certificado: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--snow-1)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? '⏳ Registrando Activo...' : '✓ Finalizar Registro'}
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
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
