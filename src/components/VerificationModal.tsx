'use client'
import { useState, useEffect, useRef } from 'react'
import { calcularVariacion, calcularStatus } from '@/lib/metrologia'
import { 
  CheckCircle2, XCircle, User, FileText, 
  Calculator, AlertTriangle, Settings2, Activity, ClipboardList
} from 'lucide-react'

// Componente de Selección Búsqueda Rápida (Combobox)
function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Buscar y seleccionar...",
  icon = <User size={14} />
}: { 
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: '12px',
          border: `2px solid ${isOpen ? '#0ea5e9' : '#f1f5f9'}`,
          background: isOpen ? '#fff' : '#f8fafc',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 4px rgba(14, 165, 233, 0.1)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>{icon}</span>
          {isOpen ? (
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
                  if (filtered.length > 0) {
                    onChange(filtered[0].value);
                    setIsOpen(false);
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder="Escribir código o nombre..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '15px',
                fontWeight: 600,
                color: '#1e293b',
                padding: 0
              }}
            />
          ) : (
            <span style={{ fontSize: '15px', fontWeight: 600, color: selectedOption ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          )}
        </div>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#94a3b8', fontSize: '12px', marginLeft: 8 }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
            border: '1px solid #cbd5e1',
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: 3000,
            padding: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
              No se encontraron coincidencias
            </div>
          ) : (
            options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())).map((opt) => (
              <div
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: opt.value === value ? 700 : 500,
                  color: opt.value === value ? '#2563eb' : '#1e293b',
                  background: opt.value === value ? '#eff6ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s',
                  marginBottom: '2px'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = opt.value === value ? '#eff6ff' : '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = opt.value === value ? '#eff6ff' : 'transparent')}
              >
                <span>{opt.label}</span>
                {opt.value === value && <CheckCircle2 size={16} color="#2563eb" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Magnitud?: string | null
  Tipo?: string | null
}

interface Patron {
  ID_Patron: string
  Codigo: string
  Nombre_Patron: string
  Estado_Vigencia: string
  Magnitud?: string | null
}

interface Props {
  equipo: Equipo | null
  equipos: Equipo[]
  onClose: () => void
  onSaved: () => void
}

export default function VerificationModal({ equipo, equipos, onClose, onSaved }: Props) {
  const [tipoVerif, setTipoVerif] = useState<'OPERATIVIDAD' | 'CALIBRACION'>('OPERATIVIDAD')
  const [selectedId, setSelectedId] = useState(equipo?.ID_Equipo ?? '')
  const [medidaPatron, setMedidaPatron] = useState('')
  const [medidaInstrumento, setMedidaInstrumento] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [obs, setObs] = useState('')
  const [accionesPendientes, setAccionesPendientes] = useState('')
  const [resultadoStatusOperatividad, setResultadoStatusOperatividad] = useState('OPERATIVO')
  const [patrones, setPatrones] = useState<Patron[]>([])
  const [selectedPatronId, setSelectedPatronId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  useEffect(() => {
    fetch('/api/patrones')
      .then(r => r.json())
      .then(data => setPatrones(data.filter((p: Patron) => p.Estado_Vigencia === 'VIGENTE')))
  }, [])

  const selectedEquipo = equipos.find(e => e.ID_Equipo === selectedId) ?? equipo
  const varNum = (tipoVerif === 'CALIBRACION' && medidaPatron && medidaInstrumento)
    ? calcularVariacion(parseFloat(medidaInstrumento), parseFloat(medidaPatron))
    : null
  const statusCalc = varNum != null && selectedEquipo
    ? calcularStatus(varNum, selectedEquipo.Tolerancia_Aceptable)
    : null

  const isInstrument = selectedEquipo?.Tipo === 'INSTRUMENTO'
  const tab2Label = isInstrument ? '2. Verificación' : '2. Calibración / Verificación'

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!selectedId) { setError('Selecciona un equipo'); return }
    if (!tecnico) { setError('El nombre del técnico es requerido'); return }

    if (tipoVerif === 'CALIBRACION') {
      if (!selectedPatronId) { setError('Selecciona el patrón utilizado'); return }
      if (!medidaPatron || !medidaInstrumento) { setError('Completa las medidas del patrón e instrumento'); return }
    }
    
    setSaving(true); setError('')
    try {
      let photoBase64 = ''
      if (photoFile) {
        photoBase64 = await fileToBase64(photoFile)
      }

      const payload = {
        FK_ID_Equipo: selectedId,
        FK_ID_Patron_Usado: tipoVerif === 'CALIBRACION' ? selectedPatronId : null,
        Medida_Patron: tipoVerif === 'CALIBRACION' ? parseFloat(medidaPatron) : null,
        Medida_Instrumento: tipoVerif === 'CALIBRACION' ? parseFloat(medidaInstrumento) : null,
        Tecnico_Ejecutor: tecnico,
        Observaciones: obs || null,
        Tipo_Verificacion: tipoVerif,
        Acciones_Pendientes: tipoVerif === 'OPERATIVIDAD' ? (accionesPendientes || null) : null,
        Resultado_Status: tipoVerif === 'OPERATIVIDAD' ? resultadoStatusOperatividad : (statusCalc || 'APTO'),
        Evidencia_Foto: photoBase64 || null
      }

      const r = await fetch('/api/historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) { 
        onSaved() 
      }
      else { 
        const d = await r.json()
        setError(d.error ?? 'Error al guardar la verificación')
        setSaving(false) 
      }
    } catch (err) {
      setError('Error de conexión')
      setSaving(false)
    }
  }

  // Filtrar patrones si el equipo tiene magnitud
  const equipoMags = selectedEquipo?.Magnitud ? selectedEquipo.Magnitud.split(',').map(m => m.trim()) : []
  const patronesFiltrados = patrones.filter(p => {
    if (equipoMags.length === 0) return true
    if (!p.Magnitud) return true
    return equipoMags.some(mag => p.Magnitud?.includes(mag))
  })

  const patronesAMostrar = patronesFiltrados.length > 0 ? patronesFiltrados : patrones

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', borderRadius: 12, display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)' }}>
              <Settings2 size={20} color="#fff" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 800 }}>Control y Verificación de Activo</h2>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Registro de inspección operativa o calibración</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-close-large">
            <XCircle size={24} color="#94a3b8" />
          </button>
        </div>

        {/* Tabs de Selección de Modalidad */}
        <div style={{ padding: '20px 24px 0 24px', background: '#fff' }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
            ¿Qué tipo de control se realiza? *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f1f5f9', padding: 6, borderRadius: 16 }}>
            <button
              type="button"
              onClick={() => setTipoVerif('OPERATIVIDAD')}
              style={{
                padding: '12px',
                borderRadius: 12,
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                background: tipoVerif === 'OPERATIVIDAD' ? '#fff' : 'transparent',
                color: tipoVerif === 'OPERATIVIDAD' ? '#0f172a' : '#64748b',
                boxShadow: tipoVerif === 'OPERATIVIDAD' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Activity size={16} color={tipoVerif === 'OPERATIVIDAD' ? '#2563eb' : '#64748b'} />
              1. Operatividad
            </button>
            <button
              type="button"
              onClick={() => setTipoVerif('CALIBRACION')}
              style={{
                padding: '12px',
                borderRadius: 12,
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                background: tipoVerif === 'CALIBRACION' ? '#fff' : 'transparent',
                color: tipoVerif === 'CALIBRACION' ? '#0f172a' : '#64748b',
                boxShadow: tipoVerif === 'CALIBRACION' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Calculator size={16} color={tipoVerif === 'CALIBRACION' ? '#0ea5e9' : '#64748b'} />
              {tab2Label}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <div className="form-group-modern">
              <label><User size={14} /> Equipo / Instrumento a verificar *</label>
              <SearchableSelect 
                options={equipos.map(e => ({
                  value: e.ID_Equipo,
                  label: `${e.Codigo_Interno} — ${e.Nombre_Equipo} ${e.Magnitud ? `(${e.Magnitud})` : ''}`
                }))}
                value={selectedId}
                onChange={val => {
                  setSelectedId(val);
                  setSelectedPatronId('');
                }}
                placeholder="Buscar por código o nombre del equipo…"
                icon={<User size={14} />}
              />
            </div>

            {/* SECCIÓN OPERATIVIDAD */}
            {tipoVerif === 'OPERATIVIDAD' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s' }}>
                <div className="form-group-modern" style={{ marginBottom: 0 }}>
                  <label><Activity size={14} /> Estado Resultante *</label>
                  <select 
                    value={resultadoStatusOperatividad} 
                    onChange={e => setResultadoStatusOperatividad(e.target.value)}
                    style={{ fontWeight: 700, color: resultadoStatusOperatividad === 'OPERATIVO' ? '#10b981' : '#f59e0b' }}
                  >
                    <option value="OPERATIVO">OPERATIVO / APTO PARA USO</option>
                    <option value="ACCION_PENDIENTE">REQUIERE ACCIÓN PENDIENTE / SEGUIMIENTO</option>
                  </select>
                </div>

                <div className="form-group-modern" style={{ marginBottom: 0 }}>
                  <label><ClipboardList size={14} /> Acciones Pendientes por Realizar (Seguimiento)</label>
                  <textarea 
                    value={accionesPendientes} 
                    onChange={e => {
                      setAccionesPendientes(e.target.value);
                      if (e.target.value.trim().length > 0 && resultadoStatusOperatividad === 'OPERATIVO') {
                        setResultadoStatusOperatividad('ACCION_PENDIENTE');
                      }
                    }} 
                    placeholder="Ej: Reemplazar sonda térmica la próxima semana, ajustar conector..." 
                    rows={2} 
                  />
                  <span style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    💡 Ingresar acciones pendientes cambiará automáticamente el estado a seguimiento.
                  </span>
                </div>
              </div>
            )}

            {/* SECCIÓN CALIBRACIÓN METROLÓGICA */}
            {tipoVerif === 'CALIBRACION' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s' }}>
                <div className="form-group-modern" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> Patrón utilizado *
                    </span>
                    {selectedEquipo?.Magnitud && (
                      <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>
                        MAGNITUD: {selectedEquipo.Magnitud}
                      </span>
                    )}
                  </label>
                  <SearchableSelect 
                    options={patronesAMostrar.map(p => ({
                      value: p.ID_Patron,
                      label: `${p.Codigo || p.ID_Patron} — ${p.Nombre_Patron} (${p.Magnitud || 'General'})`
                    }))}
                    value={selectedPatronId}
                    onChange={val => setSelectedPatronId(val)}
                    placeholder="Buscar por código o nombre del patrón…"
                    icon={<CheckCircle2 size={14} />}
                  />
                  {patronesFiltrados.length === 0 && selectedEquipo?.Magnitud && (
                    <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600, marginTop: 4 }}>
                      ⚠️ No hay patrones vigentes registrados para {selectedEquipo.Magnitud}. Se muestran todos.
                    </div>
                  )}
                </div>

                <div className="metrology-grid">
                  <div className="form-group-modern" style={{ marginBottom: 0 }}>
                    <label><Calculator size={14} /> Medida Patrón *</label>
                    <input type="number" step="any" value={medidaPatron} onChange={e => setMedidaPatron(e.target.value)} placeholder="0.00" required />
                  </div>
                  <div className="form-group-modern" style={{ marginBottom: 0 }}>
                    <label><Calculator size={14} /> Medida Instrumento *</label>
                    <input type="number" step="any" value={medidaInstrumento} onChange={e => setMedidaInstrumento(e.target.value)} placeholder="0.00" required />
                  </div>
                </div>

                {varNum != null && selectedEquipo && (
                  <div className={`status-card ${statusCalc === 'APTO' ? 'is-apto' : 'is-no-apto'}`} style={{ borderLeft: `6px solid ${statusCalc === 'APTO' ? '#10b981' : '#ef4444'}`, margin: 0 }}>
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
              </div>
            )}

            <div className="form-group-modern" style={{ marginTop: 20 }}>
              <label><User size={14} /> Técnico responsable / Inspector *</label>
              <input value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Ingrese su nombre o apellido" required />
            </div>

            <div className="form-group-modern" style={{ marginBottom: 0 }}>
              <label><FileText size={14} /> Comentarios / Observaciones</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Anotaciones generales del estado del equipo o condiciones ambientales..." rows={2} />
            </div>

            <div className="form-group-modern" style={{ marginTop: 20, marginBottom: 0 }}>
              <label style={{ marginBottom: 4, display: 'block' }}>📸 Evidencia Fotográfica (Opcional)</label>
              {photoFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f1f5f9', border: '1px solid #0ea5e9', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: '#e0f2fe', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 18 }}>📸</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{photoFile.name}</span>
                  </div>
                  <button type="button" onClick={() => setPhotoFile(null)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Quitar</button>
                </div>
              ) : (
                <label 
                  style={{ 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: 14, 
                    padding: '20px', 
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
                  <span style={{ fontSize: 24 }}>📸</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                    Haz clic para subir o arrastra la foto de evidencia aquí
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Formatos JPG, PNG, WEBP (Máx 10 MB)</div>
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

          <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save-premium" disabled={saving}>
              {saving ? 'Guardando...' : <><CheckCircle2 size={18} /> Guardar Verificación</>}
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
        }
      `}</style>
    </div>
  )
}
