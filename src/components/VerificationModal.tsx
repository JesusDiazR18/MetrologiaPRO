'use client'
import { useState, useEffect } from 'react'
import { calcularVariacion, calcularStatus } from '@/lib/metrologia'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
}

interface Props {
  equipo: Equipo | null
  equipos: Equipo[]
  onClose: () => void
  onSaved: () => void
}

export default function VerificationModal({ equipo, equipos, onClose, onSaved }: Props) {
  const [selectedId, setSelectedId] = useState(equipo?.ID_Equipo ?? '')
  const [medidaPatron, setMedidaPatron] = useState('')
  const [medidaInstrumento, setMedidaInstrumento] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedEquipo = equipos.find(e => e.ID_Equipo === selectedId) ?? equipo
  const varNum = medidaPatron && medidaInstrumento
    ? calcularVariacion(parseFloat(medidaInstrumento), parseFloat(medidaPatron))
    : null
  const statusCalc = varNum != null && selectedEquipo
    ? calcularStatus(varNum, selectedEquipo.Tolerancia_Aceptable)
    : null

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!selectedId) { setError('Selecciona un equipo'); return }
    if (!medidaPatron || !medidaInstrumento || !tecnico) { setError('Completa todos los campos requeridos'); return }
    setSaving(true); setError('')
    const r = await fetch('/api/historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FK_ID_Equipo: selectedId,
        Medida_Patron: parseFloat(medidaPatron),
        Medida_Instrumento: parseFloat(medidaInstrumento),
        Tecnico_Ejecutor: tecnico,
        Observaciones: obs || null,
      })
    })
    if (r.ok) { onSaved() }
    else { const d = await r.json(); setError(d.error ?? 'Error al guardar'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ width: 36, height: 36, background: 'var(--oxford-blue)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <span className="modal-title">Registrar Nueva Verificación</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-dim)', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>}

            <div className="form-group">
              <label className="form-label">Equipo / Instrumento *</label>
              <select className="form-control" value={selectedId} onChange={e => setSelectedId(e.target.value)} required>
                <option value="">Seleccionar…</option>
                {equipos.map(e => (
                  <option key={e.ID_Equipo} value={e.ID_Equipo}>{e.Codigo_Interno} — {e.Nombre_Equipo}</option>
                ))}
              </select>
            </div>

            {selectedEquipo && (
              <div style={{ background: 'var(--snow-2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                📐 Tolerancia aceptable: <b style={{ color: 'var(--oxford-blue)' }}>±{selectedEquipo.Tolerancia_Aceptable} {selectedEquipo.Unidad_Tolerancia ?? ''}</b>
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Medida del Patrón *</label>
                <input className="form-control" type="number" step="any" value={medidaPatron} onChange={e => setMedidaPatron(e.target.value)} placeholder="Ej: 231.5" required />
              </div>
              <div className="form-group">
                <label className="form-label">Medida del Instrumento *</label>
                <input className="form-control" type="number" step="any" value={medidaInstrumento} onChange={e => setMedidaInstrumento(e.target.value)} placeholder="Ej: 230.14" required />
              </div>
            </div>

            {varNum != null && (
              <div className="variacion-display">
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Variación calculada</div>
                  <div className="variacion-value">{varNum > 0 ? '+' : ''}{varNum.toFixed(4)}</div>
                </div>
                <div style={{ flex: 1 }} />
                <span className={`badge badge-${statusCalc === 'APTO' ? 'apto' : 'no-apto'}`} style={{ fontSize: 14, padding: '6px 16px' }}>
                  {statusCalc === 'APTO' ? '✓ APTO PARA USO' : '✗ NO APTO / REQUIERE AJUSTE'}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Técnico Ejecutor *</label>
              <input className="form-control" value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Nombre del técnico" required />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea className="form-control" value={obs} onChange={e => setObs(e.target.value)} placeholder="Observaciones opcionales…" rows={3} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? '⏳ Guardando…' : '✓ Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
