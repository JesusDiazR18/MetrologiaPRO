'use client'
import { useState } from 'react'

interface Props {
  equipo: any
  onClose: () => void
  onSaved: () => void
}

export default function EditEquipoModal({ equipo, onClose, onSaved }: Props) {
  const [formData, setFormData] = useState({
    Nombre_Equipo: equipo.Nombre_Equipo || '',
    Codigo_Interno: equipo.Codigo_Interno || '',
    Marca: equipo.Marca || '',
    Modelo: equipo.Modelo || '',
    Serie: equipo.Serie || '',
    Rango_Medida: equipo.Rango_Medida || '',
    Resolucion: equipo.Resolucion || '',
    Tolerancia_Aceptable: equipo.Tolerancia_Aceptable ?? '',
    Unidad_Tolerancia: equipo.Unidad_Tolerancia || '',
    Area_Asignada: equipo.Area_Asignada || '',
    Responsable: equipo.Responsable || '',
    Periodicidad_Meses: equipo.Periodicidad_Meses || 12,
    Fecha_Ultima_Verificacion: equipo.Fecha_Ultima_Verificacion ? new Date(equipo.Fecha_Ultima_Verificacion).toISOString().split('T')[0] : '',
    Fecha_Proximo_Control: equipo.Fecha_Proximo_Control ? new Date(equipo.Fecha_Proximo_Control).toISOString().split('T')[0] : '',
    Estado: equipo.Estado || 'OPERATIVO',
    N_Certificado: equipo.N_Certificado || '',
    Proveedor_Servicio: equipo.Proveedor_Servicio || '',
    Fecha_Vencimiento_Certificado: equipo.Fecha_Vencimiento_Certificado ? new Date(equipo.Fecha_Vencimiento_Certificado).toISOString().split('T')[0] : '',
    Magnitud: equipo.Magnitud || 'TEMPERATURA',
    Accesorios: equipo.Accesorios || '',
    Insumos: equipo.Insumos || ''
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

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formData.Nombre_Equipo || !formData.Codigo_Interno) {
      setError('Nombre y Código son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...formData,
        Tolerancia_Aceptable: parseFloat(String(formData.Tolerancia_Aceptable)) || 0,
        Periodicidad_Meses: parseInt(String(formData.Periodicidad_Meses)) || 12,
        Fecha_Ultima_Verificacion: formData.Fecha_Ultima_Verificacion ? new Date(formData.Fecha_Ultima_Verificacion).toISOString() : null,
        Fecha_Proximo_Control: formData.Fecha_Proximo_Control ? new Date(formData.Fecha_Proximo_Control).toISOString() : null,
        Fecha_Vencimiento_Certificado: formData.Fecha_Vencimiento_Certificado ? new Date(formData.Fecha_Vencimiento_Certificado).toISOString() : null
      }

      const r = await fetch(`/api/equipos/${equipo.ID_Equipo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) {
        onSaved()
      } else {
        const d = await r.json()
        setError(d.error ?? 'Error al actualizar el equipo')
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div>
            <span className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>Editar Activo ({equipo.ID_Equipo})</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Modificación de parámetros técnicos y control</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24, marginLeft: 'auto' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div className="modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{error}</div>}
            
            <div className="form-section">
              <div className="section-title">1. Identificación y Estado</div>
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nombre del Activo *</label>
                  <input className="form-control" value={formData.Nombre_Equipo} onChange={e => setFormData({...formData, Nombre_Equipo: e.target.value})} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Código Interno (QR) *</label>
                  <input className="form-control" value={formData.Codigo_Interno} onChange={e => setFormData({...formData, Codigo_Interno: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado de Funcionamiento</label>
                  <select className="form-control" value={formData.Estado} onChange={e => setFormData({...formData, Estado: e.target.value})}>
                    <option value="OPERATIVO">OPERATIVO / APTO</option>
                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                    <option value="FUERA_DE_SERVICIO">FUERA DE SERVICIO (NO APTO)</option>
                    <option value="BAJA">DE BAJA</option>
                    <option value="OBSOLETO">OBSOLETO</option>
                  </select>
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
            </div>

            <div className="form-section">
              <div className="section-title">2. Especificaciones Técnicas y Control</div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input className="form-control" value={formData.Marca} onChange={e => setFormData({...formData, Marca: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input className="form-control" value={formData.Modelo} onChange={e => setFormData({...formData, Modelo: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">N° Serie</label>
                  <input className="form-control" value={formData.Serie} onChange={e => setFormData({...formData, Serie: e.target.value})} />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Tolerancia Aceptable</label>
                  <input className="form-control" type="number" step="any" value={formData.Tolerancia_Aceptable} onChange={e => setFormData({...formData, Tolerancia_Aceptable: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unidad de Medida</label>
                  <input className="form-control" value={formData.Unidad_Tolerancia} onChange={e => setFormData({...formData, Unidad_Tolerancia: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Periodicidad (Meses)</label>
                  <input className="form-control" type="number" value={formData.Periodicidad_Meses} onChange={e => setFormData({...formData, Periodicidad_Meses: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Área Asignada</label>
                  <input className="form-control" value={formData.Area_Asignada} onChange={e => setFormData({...formData, Area_Asignada: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Responsable Asignado</label>
                  <input className="form-control" value={formData.Responsable} onChange={e => setFormData({...formData, Responsable: e.target.value})} />
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

            {equipo.Tipo === 'EQUIPO' && (
              <div className="form-section">
                <div className="section-title">3. Certificado y Vencimiento</div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">N° Certificado</label>
                    <input className="form-control" value={formData.N_Certificado} onChange={e => setFormData({...formData, N_Certificado: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proveedor Servicio</label>
                    <input className="form-control" value={formData.Proveedor_Servicio} onChange={e => setFormData({...formData, Proveedor_Servicio: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vencimiento</label>
                    <input className="form-control" type="date" value={formData.Fecha_Vencimiento_Certificado} onChange={e => setFormData({...formData, Fecha_Vencimiento_Certificado: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
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
