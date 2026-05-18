'use client'
import React, { useState } from 'react'

interface Props {
  equipo: {
    ID_Equipo: string
    Nombre_Equipo: string
    Codigo_Interno: string
  }
  onClose: () => void
  onSaved: () => void
}

export default function HistoricalVerificationModal({ equipo, onClose, onSaved }: Props) {
  const [formData, setFormData] = useState({
    Fecha_Ejecucion: new Date().toISOString().split('T')[0],
    Tipo_Verificacion: 'CALIBRACION',
    Variacion_Calculada: '',
    Resultado_Status: 'APTO',
    Tecnico_Ejecutor: '',
    Observaciones: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!formData.Tecnico_Ejecutor.trim()) {
      setError('El nombre del técnico ejecutor es obligatorio')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        FK_ID_Equipo: equipo.ID_Equipo,
        isHistoricalLog: true,
        Fecha_Ejecucion: new Date(formData.Fecha_Ejecucion).toISOString(),
        Tipo_Verificacion: formData.Tipo_Verificacion,
        Variacion_Calculada: formData.Variacion_Calculada ? parseFloat(formData.Variacion_Calculada) : undefined,
        Resultado_Status: formData.Resultado_Status,
        Tecnico_Ejecutor: formData.Tecnico_Ejecutor.trim(),
        Observaciones: formData.Observaciones.trim() || 'Verificación histórica cargada manualmente.'
      }

      const r = await fetch('/api/historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (r.ok) {
        onSaved()
      } else {
        const d = await r.json()
        setError(d.error ?? 'Error al registrar el historial anterior')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ width: 38, height: 38, background: 'var(--oxford-blue)', borderRadius: 12, display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <span className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>Agregar Verificación Anterior</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Carga de historial metrológico previo para {equipo.Codigo_Interno}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24, marginLeft: 'auto' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{error}</div>}

            <div style={{ background: 'var(--snow-1)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--snow-3)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--oxford-blue)' }}>{equipo.Nombre_Equipo}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Código: {equipo.Codigo_Interno}</div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Fecha de Ejecución *</label>
                <input 
                  className="form-control" 
                  type="date"
                  value={formData.Fecha_Ejecucion}
                  onChange={e => setFormData({...formData, Fecha_Ejecucion: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Control</label>
                <select 
                  className="form-control"
                  value={formData.Tipo_Verificacion}
                  onChange={e => setFormData({...formData, Tipo_Verificacion: e.target.value})}
                >
                  <option value="CALIBRACION">Calibración Interna</option>
                  <option value="OPERATIVIDAD">Operatividad / Rutina</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Variación Calculada (±)</label>
                <input 
                  className="form-control" 
                  type="number"
                  step="any"
                  placeholder="Ej: 0.05"
                  value={formData.Variacion_Calculada}
                  onChange={e => setFormData({...formData, Variacion_Calculada: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Resultado Final *</label>
                <select 
                  className="form-control"
                  value={formData.Resultado_Status}
                  onChange={e => setFormData({...formData, Resultado_Status: e.target.value})}
                >
                  <option value="APTO">APTO / CUMPLE</option>
                  <option value="NO_APTO">NO APTO</option>
                  <option value="OPERATIVO">OPERATIVO</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Técnico Metrólogo o Ejecutor *</label>
              <input 
                className="form-control" 
                placeholder="Nombre de quien realizó la verificación..."
                value={formData.Tecnico_Ejecutor}
                onChange={e => setFormData({...formData, Tecnico_Ejecutor: e.target.value})}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones / Variaciones / Notas</label>
              <textarea 
                className="form-control"
                rows={3}
                placeholder="Detalle de masas usadas, temperaturas, tiempos u otras notas de la verificación histórica..."
                value={formData.Observaciones}
                onChange={e => setFormData({...formData, Observaciones: e.target.value})}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--snow-1)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? '⏳ Registrando...' : '✓ Guardar Histórico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
