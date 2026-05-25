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
    Fecha_Ingreso: new Date().toISOString().split('T')[0],
    Estado: 'OPERATIVO',
    Detalles_Estado: '',
    Tiene_Solucion: true,
    Requiere_Seguimiento: false,
    Periodicidad_Seguimiento: '7',
    N_Certificado: '',
    Proveedor_Servicio: '',
    Fecha_Vencimiento_Certificado: '',
    Magnitud: 'TEMPERATURA',
    Accesorios: '',
    Insumos: ''
  })
  const [customMag, setCustomMag] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [toleranciasMap, setToleranciasMap] = useState<Record<string, { tolerancia: string; unidad: string }>>({})

  useEffect(() => {
    const currentMags = formData.Magnitud ? formData.Magnitud.split(',').map(m => m.trim()).filter(Boolean) : []
    setToleranciasMap(prev => {
      const next = { ...prev }
      currentMags.forEach(m => {
        if (!next[m]) {
          next[m] = { tolerancia: '', unidad: '' }
        }
      })
      Object.keys(next).forEach(key => {
        if (!currentMags.includes(key)) {
          delete next[key]
        }
      })
      return next
    })
  }, [formData.Magnitud])

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

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
    if (!formData.ID_Equipo || !formData.Nombre_Equipo) {
      setError('ID y Nombre son obligatorios')
      return
    }
    if (photoFile && photoFile.size > 4.5 * 1024 * 1024) {
      setError('La imagen seleccionada supera el límite de 4.5 MB. Por favor, reduzca el tamaño de la imagen o seleccione otra.')
      return
    }
    if (pdfFile && pdfFile.size > 4.5 * 1024 * 1024) {
      setError('El archivo PDF seleccionado supera el límite de 4.5 MB.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let finalMagnitud = formData.Magnitud ? formData.Magnitud.split(',').map(m => m.trim()).filter(Boolean) : []
      if (finalMagnitud.includes('OTRA')) {
        finalMagnitud = finalMagnitud.map(m => m === 'OTRA' ? (customMag.trim() || 'OTRA') : m)
      }

      let photoBase64 = ''
      if (photoFile) {
        photoBase64 = await fileToBase64(photoFile)
      }
      let pdfBase64 = ''
      if (pdfFile) {
        pdfBase64 = await fileToBase64(pdfFile)
      }

      const isOperativo = formData.Estado === 'OPERATIVO'
      
      let mainTolerancia = parseFloat(formData.Tolerancia_Aceptable) || 0
      let mainUnidad = formData.Unidad_Tolerancia || null
      if (selectedMags.length > 0) {
        const firstMag = selectedMags[0]
        const firstVal = toleranciasMap[firstMag]
        if (firstVal) {
          mainTolerancia = parseFloat(firstVal.tolerancia) || 0
          mainUnidad = firstVal.unidad || null
        }
      }

      const payload = {
        ...formData,
        Detalles_Estado: isOperativo ? null : formData.Detalles_Estado,
        Tiene_Solucion: isOperativo ? true : formData.Tiene_Solucion,
        Requiere_Seguimiento: isOperativo ? false : formData.Requiere_Seguimiento,
        Periodicidad_Seguimiento: (!isOperativo && formData.Requiere_Seguimiento) ? (parseInt(formData.Periodicidad_Seguimiento) || 7) : null,
        Codigo_Interno: formData.ID_Equipo.trim(),
        Magnitud: finalMagnitud.join(', '),
        Tolerancia_Aceptable: mainTolerancia,
        Unidad_Tolerancia: mainUnidad,
        Tolerancias_Multimagnitud: selectedMags.length > 1 ? JSON.stringify(toleranciasMap) : null,
        Periodicidad_Meses: parseInt(formData.Periodicidad_Meses) || 12,
        Fecha_Ultima_Verificacion: formData.Fecha_Ultima_Verificacion ? new Date(formData.Fecha_Ultima_Verificacion).toISOString() : null,
        Fecha_Proximo_Control: formData.Fecha_Proximo_Control ? new Date(formData.Fecha_Proximo_Control).toISOString() : null,
        Fecha_Ingreso: formData.Fecha_Ingreso ? new Date(formData.Fecha_Ingreso).toISOString() : null,
        Fecha_Vencimiento_Certificado: formData.Fecha_Vencimiento_Certificado ? new Date(formData.Fecha_Vencimiento_Certificado).toISOString() : null,
        Foto_Equipo: photoBase64 || null,
        PDF_Certificado: pdfBase64 || null
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
                {selectedMags.includes('OTRA') && (
                  <div style={{ marginTop: 12 }}>
                    <input 
                      className="form-control" 
                      placeholder="Especifique el nombre de la magnitud (Ej: CAUDAL, VISCOSIDAD...)"
                      value={customMag}
                      onChange={e => setCustomMag(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                )}
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
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Área Asignada</label>
                  <input 
                    className="form-control" 
                    value={formData.Area_Asignada} 
                    onChange={e => setFormData({...formData, Area_Asignada: e.target.value})}
                    placeholder="Ej: Laboratorio / Producción"
                  />
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Estado de Funcionamiento *</label>
                  <select 
                    className="form-control" 
                    value={formData.Estado} 
                    onChange={e => setFormData({...formData, Estado: e.target.value})}
                  >
                    <option value="OPERATIVO">Operativo / Apto</option>
                    <option value="OPERATIVO_CON_DETALLES">Operativo con Detalles</option>
                    <option value="VENCIDO">Vencido</option>
                    <option value="MANTENIMIENTO">En Mantenimiento</option>
                    <option value="FUERA_DE_SERVICIO">Fuera de Servicio (No Apto)</option>
                    <option value="DE_BAJA_OBSOLETO">De Baja / Obsoleto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Ingreso</label>
                  <input 
                    className="form-control" 
                    type="date"
                    value={formData.Fecha_Ingreso} 
                    onChange={e => setFormData({...formData, Fecha_Ingreso: e.target.value})}
                  />
                </div>
              </div>

              {formData.Estado !== 'OPERATIVO' && (
                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, marginTop: 16 }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 12, fontSize: 13 }}>
                    ⚠️ Detalles y Seguimiento de Estado
                  </div>
                  <div className="form-group">
                    <label className="form-label">Detalles / Motivo / Observación del Estado</label>
                    <textarea 
                      className="form-control"
                      rows={2}
                      value={formData.Detalles_Estado}
                      onChange={e => setFormData({...formData, Detalles_Estado: e.target.value})}
                      placeholder="Indique el motivo, condición actual o anomalía detectada..."
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-color)' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.Tiene_Solucion} 
                        onChange={e => setFormData({...formData, Tiene_Solucion: e.target.checked})} 
                      />
                      <span>¿Tiene Solución / Viabilidad Técnica?</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-color)' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.Requiere_Seguimiento} 
                        onChange={e => setFormData({...formData, Requiere_Seguimiento: e.target.checked})} 
                      />
                      <span>Hacer Seguimiento Activo</span>
                    </label>
                    {formData.Requiere_Seguimiento && (
                      <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>⏱ Frecuencia del Seguimiento</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {[{label: 'Diario', val: '1'}, {label: 'Semanal', val: '7'}, {label: 'Quincenal', val: '15'}, {label: 'Mensual', val: '30'}, {label: 'Personalizado', val: 'custom'}].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => opt.val !== 'custom' && setFormData({...formData, Periodicidad_Seguimiento: opt.val})}
                              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: formData.Periodicidad_Seguimiento === opt.val ? '1px solid #f59e0b' : '1px solid var(--snow-3)', background: formData.Periodicidad_Seguimiento === opt.val ? 'rgba(245,158,11,0.15)' : 'transparent', color: formData.Periodicidad_Seguimiento === opt.val ? '#f59e0b' : 'var(--text-dim)' }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            className="form-control"
                            style={{ width: 80, padding: '6px 10px' }}
                            value={formData.Periodicidad_Seguimiento}
                            onChange={e => setFormData({...formData, Periodicidad_Seguimiento: e.target.value})}
                          />
                          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>días entre revisiones de seguimiento</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>Se mostrará en el calendario y se incluirá en las notificaciones automáticas</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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

              <div className="grid-3" style={{ gridTemplateColumns: selectedMags.length > 1 ? '1fr' : 'repeat(3, 1fr)' }}>
                {selectedMags.length > 1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 3', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📐 Tolerancias y Unidades por Magnitud
                    </div>
                    {selectedMags.map(mag => (
                      <div key={mag} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{mag}</span>
                        <input
                          className="form-control"
                          type="number"
                          step="any"
                          placeholder="Tolerancia"
                          value={toleranciasMap[mag]?.tolerancia ?? ''}
                          onChange={e => setToleranciasMap(prev => ({ ...prev, [mag]: { ...prev[mag], tolerancia: e.target.value } }))}
                          required
                        />
                        <input
                          className="form-control"
                          placeholder="Unidad (Ej: °C, %)"
                          value={toleranciasMap[mag]?.unidad ?? ''}
                          onChange={e => setToleranciasMap(prev => ({ ...prev, [mag]: { ...prev[mag], unidad: e.target.value } }))}
                          required
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Tolerancia Aceptable</label>
                      <input className="form-control" type="number" step="any" value={formData.Tolerancia_Aceptable} onChange={e => {
                        const val = e.target.value
                        setFormData({...formData, Tolerancia_Aceptable: val})
                        const first = selectedMags[0] || 'TEMPERATURA'
                        setToleranciasMap(prev => ({ ...prev, [first]: { ...prev[first], tolerancia: val } }))
                      }} placeholder="Ej: 0.05" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unidad de Medida</label>
                      <input className="form-control" value={formData.Unidad_Tolerancia} onChange={e => {
                        const val = e.target.value
                        setFormData({...formData, Unidad_Tolerancia: val})
                        const first = selectedMags[0] || 'TEMPERATURA'
                        setToleranciasMap(prev => ({ ...prev, [first]: { ...prev[first], unidad: val } }))
                      }} placeholder="Ej: V, mm, °C" />
                    </div>
                  </>
                )}
                <div className="form-group" style={{ gridColumn: selectedMags.length > 1 ? 'span 3' : 'auto', marginTop: selectedMags.length > 1 ? 12 : 0 }}>
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

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Certificado de Calibración PDF (Opcional)</label>
                {pdfFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--snow-1)', border: '1px solid var(--cyan)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: 'var(--cyan-dim)', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 18 }}>📄</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--oxford-blue)' }}>{pdfFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setPdfFile(null)} style={{ background: 'var(--danger-dim)', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Quitar PDF</button>
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
                    <span style={{ fontSize: 28 }}>📄</span>
                    <div style={{ fontWeight: 600, color: 'var(--oxford-blue)', fontSize: 13 }}>
                      Haz clic para subir o arrastra el certificado PDF aquí
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Formato PDF (Máx 4.5 MB)</div>
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      style={{ display: 'none' }} 
                      onChange={e => e.target.files?.[0] && setPdfFile(e.target.files[0])} 
                    />
                  </label>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Fotografía del Activo (Opcional)</label>
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
                      Haz clic para subir o arrastra la foto del equipo aquí
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
