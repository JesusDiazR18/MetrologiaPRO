'use client'
import { useState, useEffect } from 'react'
import { calcularVariacion, calcularStatus } from '@/lib/metrologia'
import { 
  CheckCircle2, XCircle, User, FileText, 
  ChevronRight, Calculator, AlertTriangle, Settings2 
} from 'lucide-react'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
}

interface Patron {
  ID_Patron: string
  Codigo_Patron: string
  Nombre_Patron: string
  Estado_Vigencia: string
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
  const [patrones, setPatrones] = useState<Patron[]>([])
  const [selectedPatronId, setSelectedPatronId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/patrones')
      .then(r => r.json())
      .then(data => setPatrones(data.filter((p: Patron) => p.Estado_Vigencia === 'VIGENTE')))
  }, [])

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
    if (!selectedPatronId) { setError('Selecciona el patrón utilizado'); return }
    if (!medidaPatron || !medidaInstrumento || !tecnico) { setError('Completa todos los campos requeridos'); return }
    
    setSaving(true); setError('')
    const r = await fetch('/api/historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FK_ID_Equipo: selectedId,
        FK_ID_Patron: selectedPatronId,
        Medida_Patron: parseFloat(medidaPatron),
        Medida_Instrumento: parseFloat(medidaInstrumento),
        Tecnico_Ejecutor: tecnico,
        Observaciones: obs || null,
      })
    })
    if (r.ok) { onSaved() }
    else { 
      const d = await r.json()
      setError(d.error ?? 'Error al guardar')
      setSaving(false) 
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500, border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', borderRadius: 12, display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)' }}>
              <Settings2 size={20} color="#fff" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 800 }}>Registro de Verificación</h2>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Cálculo metrológico en tiempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-large">
            <XCircle size={24} color="#94a3b8" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <div className="form-group-modern">
              <label><User size={14} /> Equipo a verificar</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} required>
                <option value="">Seleccionar equipo…</option>
                {equipos.map(e => (
                  <option key={e.ID_Equipo} value={e.ID_Equipo}>{e.Codigo_Interno} — {e.Nombre_Equipo}</option>
                ))}
              </select>
            </div>

            <div className="form-group-modern">
              <label><CheckCircle2 size={14} /> Patrón utilizado</label>
              <select value={selectedPatronId} onChange={e => setSelectedPatronId(e.target.value)} required>
                <option value="">Seleccionar patrón…</option>
                {patrones.map(p => (
                  <option key={p.ID_Patron} value={p.ID_Patron}>{p.Codigo_Patron} — {p.Nombre_Patron}</option>
                ))}
              </select>
            </div>

            <div className="metrology-grid">
              <div className="form-group-modern">
                <label><Calculator size={14} /> Medida Patrón</label>
                <input type="number" step="any" value={medidaPatron} onChange={e => setMedidaPatron(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="form-group-modern">
                <label><Calculator size={14} /> Medida Instrumento</label>
                <input type="number" step="any" value={medidaInstrumento} onChange={e => setMedidaInstrumento(e.target.value)} placeholder="0.00" required />
              </div>
            </div>

            {varNum != null && selectedEquipo && (
              <div className={`status-card ${statusCalc === 'APTO' ? 'is-apto' : 'is-no-apto'}`} style={{ borderLeft: `6px solid ${statusCalc === 'APTO' ? '#10b981' : '#ef4444'}` }}>
                <div style={{ flex: 1 }}>
                  <span className="status-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calculator size={10} /> Variación Detectada
                  </span>
                  <div className="status-val" style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    {varNum > 0 ? '+' : ''}{varNum.toFixed(4)} 
                    <span style={{ fontSize: 14, opacity: 0.6 }}>{selectedEquipo.Unidad_Tolerancia ?? ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${Math.min(100, (Math.abs(varNum) / selectedEquipo.Tolerancia_Aceptable) * 100)}%`, 
                        height: '100%', 
                        background: statusCalc === 'APTO' ? '#10b981' : '#ef4444',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span className="tolerance-info" style={{ whiteSpace: 'nowrap' }}>TOLERANCIA ±{selectedEquipo.Tolerancia_Aceptable}</span>
                  </div>
                </div>
                <div className="status-badge-premium" style={{ border: `1.5px solid ${statusCalc === 'APTO' ? '#10b981' : '#ef4444'}`, color: statusCalc === 'APTO' ? '#10b981' : '#ef4444' }}>
                  {statusCalc === 'APTO' ? <><CheckCircle2 size={18} /> APTO</> : <><XCircle size={18} /> NO APTO</>}
                </div>
              </div>
            )}

            <div className="form-group-modern">
              <label><User size={14} /> Técnico responsable</label>
              <input value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Ingrese su nombre" required />
            </div>

            <div className="form-group-modern">
              <label><FileText size={14} /> Observaciones adicionales</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Algún detalle relevante…" rows={2} />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', background: '#f8fafc' }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save-premium" disabled={saving}>
              {saving ? 'Guardando...' : <><CheckCircle2 size={18} /> Finalizar Registro</>}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          padding: 20px;
          z-index: 2000;
          animation: fadeIn 0.3s ease-out;
        }
        .modal {
          background: #fff;
          border-radius: 24px;
          width: 100%;
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-close-large {
          background: #f1f5f9;
          border: none;
          padding: 8px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
        }
        .btn-close-large:hover {
          background: #e2e8f0;
          transform: rotate(90deg);
        }
        .form-group-modern {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group-modern label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .form-group-modern input, .form-group-modern select, .form-group-modern textarea {
          padding: 12px 16px;
          border-radius: 12px;
          border: 2px solid #f1f5f9;
          background: #f8fafc;
          font-size: 15px;
          font-weight: 500;
          color: #1e293b;
          transition: all 0.2s;
          outline: none;
        }
        .form-group-modern input:focus, .form-group-modern select:focus, .form-group-modern textarea:focus {
          border-color: #0ea5e9;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
        }
        .metrology-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .status-card {
          padding: 16px 20px;
          border-radius: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          transition: all 0.3s;
        }
        .is-apto {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          color: #166534;
        }
        .is-no-apto {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #991b1b;
        }
        .status-label { font-size: 10px; font-weight: 700; text-transform: uppercase; opacity: 0.7; }
        .status-val { font-size: 24px; font-weight: 900; line-height: 1; margin: 4px 0; }
        .tolerance-info { font-size: 11px; font-weight: 600; opacity: 0.8; }
        .status-badge-premium {
          padding: 10px 18px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .btn-cancel {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: transparent;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
        }
        .btn-save-premium {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: #0f172a;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .btn-save-premium:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.15);
          background: #1e293b;
        }
        .btn-save-premium:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 768px) {
          .modal {
            border-radius: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .modal-body { flex: 1; overflow-y: auto; }
          .metrology-grid { grid-template-columns: 1fr; }
          .modal-footer { padding-bottom: calc(16px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
    </div>
  )
}
