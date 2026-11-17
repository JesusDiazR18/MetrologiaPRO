'use client'
import { useState, useEffect, useRef } from 'react'
import { calcularVariacion, calcularStatus } from '@/lib/metrologia'
import { compressImage } from '@/lib/imageUtils'
import { 
  CheckCircle2, XCircle, User, FileText, 
  Calculator, Settings2, Activity, ClipboardList, Calendar
} from 'lucide-react'

import Modal from '@/components/ui/Modal'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Equipo {
  ID_Equipo: string
  Tipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Magnitud?: string | null
  Tolerancias_Multimagnitud?: string | null
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
  equipos?: Equipo[]
  logToEdit?: any | null
  onClose: () => void
  onSaved: () => void
}

export default function HistoricalVerificationModal({ equipo, equipos = [], logToEdit, onClose, onSaved }: Props) {
  const [selectedId, setSelectedId] = useState(logToEdit?.FK_ID_Equipo || equipo?.ID_Equipo || '')
  const selectedEquipo = equipos.find(e => e.ID_Equipo === selectedId) ?? equipo

  const [fechaEjecucion, setFechaEjecucion] = useState(
    logToEdit?.Fecha_Ejecucion 
      ? new Date(logToEdit.Fecha_Ejecucion).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  )
  const [tipoVerif, setTipoVerif] = useState<'OPERATIVIDAD' | 'CALIBRACION'>(
    logToEdit?.Tipo_Verificacion === 'OPERATIVIDAD' || logToEdit?.Tipo_Verificacion === 'CALIBRACION' 
      ? logToEdit.Tipo_Verificacion 
      : 'OPERATIVIDAD'
  )
  const [mediciones, setMediciones] = useState<{ patron: string, instrumento: string, masaInput?: string }[]>(() => {
    if (logToEdit?.Mediciones_Puntos) {
      try {
        const pts = JSON.parse(logToEdit.Mediciones_Puntos)
        if (Array.isArray(pts) && pts.length > 0) {
          return pts.map((p: any) => ({
            patron: p.patron !== null && p.patron !== undefined ? String(p.patron) : '',
            instrumento: p.instrumento !== null && p.instrumento !== undefined ? String(p.instrumento) : '',
            masaInput: p.masaInput ? String(p.masaInput) : undefined
          }))
        }
      } catch (e) {}
    }
    if (logToEdit?.Medida_Patron !== null && logToEdit?.Medida_Patron !== undefined) {
      return [{
        patron: String(logToEdit.Medida_Patron),
        instrumento: logToEdit.Medida_Instrumento !== null && logToEdit.Medida_Instrumento !== undefined ? String(logToEdit.Medida_Instrumento) : ''
      }]
    }
    return [{ patron: '', instrumento: '' }]
  })
  const [customUnidad, setCustomUnidad] = useState(() => {
    if (logToEdit?.Mediciones_Puntos) {
      try {
        const pts = JSON.parse(logToEdit.Mediciones_Puntos)
        if (Array.isArray(pts) && pts[0]?.unidad) return pts[0].unidad
      } catch (e) {}
    }
    return ''
  })
  const [formulaActiva, setFormulaActiva] = useState<'NINGUNA' | 'MASA_A_NEWTONS_KG' | 'MASA_A_NEWTONS_G' | 'KGF_A_NEWTONS' | 'NEWTONS_A_KN'>(() => {
    if (logToEdit?.Mediciones_Puntos) {
      try {
        const pts = JSON.parse(logToEdit.Mediciones_Puntos)
        if (Array.isArray(pts) && pts[0]?.formula) return pts[0].formula
      } catch (e) {}
    }
    return 'NINGUNA'
  })
  const [customTolerancia, setCustomTolerancia] = useState('')
  const [tecnico, setTecnico] = useState(logToEdit?.Tecnico_Ejecutor || '')
  const [obs, setObs] = useState(logToEdit?.Observaciones || '')
  const [accionesPendientes, setAccionesPendientes] = useState(logToEdit?.Acciones_Pendientes || '')
  const [resultadoStatusOperatividad, setResultadoStatusOperatividad] = useState(
    logToEdit?.Tipo_Verificacion === 'OPERATIVIDAD' ? logToEdit.Resultado_Status : 'OPERATIVO'
  )
  const [patrones, setPatrones] = useState<Patron[]>([])
  const [selectedPatronId, setSelectedPatronId] = useState(logToEdit?.FK_ID_Patron_Usado || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [multimagnitudData, setMultimagnitudData] = useState<Record<string, {
    FK_ID_Patron_Usado: string;
    Mediciones: { patron: string, instrumento: string }[];
    Observaciones: string;
  }>>({})

  useEffect(() => {
    if (selectedEquipo) {
      if (!logToEdit) {
        const mags = selectedEquipo.Magnitud ? selectedEquipo.Magnitud.split(',').map((m: string) => m.trim()).filter(Boolean) : []
        const init: Record<string, { FK_ID_Patron_Usado: string; Mediciones: { patron: string, instrumento: string }[]; Observaciones: string }> = {}
        mags.forEach((m: string) => {
          init[m] = {
            FK_ID_Patron_Usado: '',
            Mediciones: [{ patron: '', instrumento: '' }],
            Observaciones: ''
          }
        })
        setMultimagnitudData(init)

        setCustomUnidad(selectedEquipo.Unidad_Tolerancia || '')
        setCustomTolerancia(selectedEquipo.Tolerancia_Aceptable != null ? String(selectedEquipo.Tolerancia_Aceptable) : '')

        const isUniversalOrFuerza = (selectedEquipo.Nombre_Equipo || '').toLowerCase().includes('universal') || 
                                    (selectedEquipo.Magnitud || '').toLowerCase().includes('fuerza')
        if (isUniversalOrFuerza) {
          setFormulaActiva('MASA_A_NEWTONS_KG')
          setCustomUnidad('N')
        } else {
          setFormulaActiva('NINGUNA')
        }
      } else {
        if (!customUnidad && selectedEquipo.Unidad_Tolerancia) {
          setCustomUnidad(selectedEquipo.Unidad_Tolerancia)
        }
      }
    }
  }, [selectedId, selectedEquipo, logToEdit])

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
      .then(data => setPatrones(data)) // Histórico: permite patrones de cualquier estado (vigente, vencido, obsoleto)
  }, [])

  const calculateMultipointCalcs = (
    meds: { patron: string, instrumento: string }[],
    tolerance: number
  ) => {
    let maxAbsVar = 0
    let worstVar: number | null = null
    let worstPatron: number | null = null
    let worstInstrumento: number | null = null
    let allValid = true
    let hasValues = false

    const points: { patron: number | null; instrumento: number | null; variacion: number | null }[] = []

    for (const m of meds) {
      if (!m.patron || !m.instrumento) {
        allValid = false
        points.push({ patron: null, instrumento: null, variacion: null })
        continue
      }
      const pVal = parseFloat(m.patron)
      const iVal = parseFloat(m.instrumento)
      if (isNaN(pVal) || isNaN(iVal)) {
        allValid = false
        points.push({ patron: null, instrumento: null, variacion: null })
        continue
      }
      hasValues = true
      const v = parseFloat((iVal - pVal).toFixed(6))
      if (worstVar === null || Math.abs(v) >= maxAbsVar) {
        maxAbsVar = Math.abs(v)
        worstVar = v
        worstPatron = pVal
        worstInstrumento = iVal
      }
      points.push({ patron: pVal, instrumento: iVal, variacion: v })
    }

    if (!hasValues || worstVar === null) return null

    const status = Math.abs(worstVar) <= tolerance ? 'APTO' : 'NO_APTO'
    return {
      points: points as { patron: number; instrumento: number; variacion: number }[],
      worstVar: worstVar as number,
      worstPatron: worstPatron as number,
      worstInstrumento: worstInstrumento as number,
      status,
      allValid
    }
  }

  let currentTolerance = selectedEquipo?.Tolerancia_Aceptable ?? 0
  if (logToEdit?.Magnitud_Controlada && selectedEquipo?.Tolerancias_Multimagnitud) {
    try {
      const map = JSON.parse(selectedEquipo.Tolerancias_Multimagnitud)
      if (map[logToEdit.Magnitud_Controlada]?.tolerancia) {
        currentTolerance = parseFloat(map[logToEdit.Magnitud_Controlada].tolerancia) || 0
      }
    } catch (e) {}
  }

  const effectiveTolerance = (customTolerancia && !isNaN(parseFloat(customTolerancia)))
    ? parseFloat(customTolerancia)
    : currentTolerance

  const effectiveUnidad = customUnidad || selectedEquipo?.Unidad_Tolerancia || ''

  const singleCalcs = selectedEquipo
    ? calculateMultipointCalcs(mediciones, effectiveTolerance)
    : null

  const varNum = singleCalcs?.worstVar ?? null
  const statusCalc = singleCalcs?.status ?? null

  const computeMagCalcs = (magName: string) => {
    const item = multimagnitudData[magName]
    if (!item || !item.Mediciones) return null
    
    let magTolerancia = selectedEquipo?.Tolerancia_Aceptable ?? 0
    let magUnidad = selectedEquipo?.Unidad_Tolerancia ?? ''
    if (selectedEquipo?.Tolerancias_Multimagnitud) {
      try {
        const map = JSON.parse(selectedEquipo.Tolerancias_Multimagnitud)
        if (map[magName]) {
          magTolerancia = parseFloat(map[magName].tolerancia) || 0
          magUnidad = map[magName].unidad || ''
        }
      } catch(e) {}
    }

    const calcs = calculateMultipointCalcs(item.Mediciones, magTolerancia)
    if (!calcs) return null

    return {
      points: calcs.points,
      varNum: calcs.worstVar,
      worstPatron: calcs.worstPatron,
      worstInstrumento: calcs.worstInstrumento,
      status: calcs.status,
      allValid: calcs.allValid,
      magTolerancia,
      magUnidad
    }
  }

  // Si editamos un registro, no usamos el formulario multimagnitud dividido (cada fila representa una magnitud individual)
  const equipoMags = logToEdit 
    ? [] 
    : (selectedEquipo?.Magnitud ? selectedEquipo.Magnitud.split(',').map(m => m.trim()).filter(Boolean) : [])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!selectedId) { setError('Selecciona un equipo'); return }
    if (!tecnico.trim()) { setError('El nombre del técnico es requerido'); return }
    if (!fechaEjecucion) { setError('La fecha de ejecución es requerida'); return }

    if (tipoVerif === 'CALIBRACION') {
      if (equipoMags.length > 1) {
        let hasAtLeastOneActive = false
        for (const mag of equipoMags) {
          const item = multimagnitudData[mag]
          if (!item) continue

          const hasPattern = !!item.FK_ID_Patron_Usado
          const hasMeds = item.Mediciones && item.Mediciones.some(m => m.patron.trim() !== '' || m.instrumento.trim() !== '')
          const isActive = hasPattern || hasMeds

          if (isActive) {
            hasAtLeastOneActive = true
            if (!item.FK_ID_Patron_Usado) {
              setError(`Selecciona el patrón utilizado para la magnitud ${mag}`)
              return
            }
            const hasMeasurements = item.Mediciones && item.Mediciones.some(m => m.patron || m.instrumento)
            if (!hasMeasurements) {
              setError(`Agrega al menos una medición para la magnitud ${mag}`)
              return
            }
            const allFilled = item.Mediciones.every(m => m.patron && m.instrumento)
            if (!allFilled) {
              setError(`Completa todas las mediciones agregadas para la magnitud ${mag}`)
              return
            }
          }
        }
        if (!hasAtLeastOneActive) {
          setError('Debes verificar al menos una magnitud')
          return
        }
      } else {
        if (!selectedPatronId) { setError('Selecciona el patrón utilizado'); return }
        const hasMeasurements = mediciones.some(m => m.patron || m.instrumento);
        if (!hasMeasurements) {
          setError('Agrega al menos una medición');
          return;
        }
        const allFilled = mediciones.every(m => m.patron && m.instrumento);
        if (!allFilled) {
          setError('Completa todas las mediciones agregadas');
          return;
        }
      }
    }
    
    setSaving(true); setError('')
    try {
      let photoBase64 = ''
      if (photoFile) {
        try {
          photoBase64 = await compressImage(photoFile)
        } catch {
          setError('No se pudo procesar la foto. Prueba con otra imagen o quítala.')
          setSaving(false)
          return
        }
        // Límite del cuerpo de petición en Vercel Serverless (4,5 MB): se valida ANTES de enviar
        if (photoBase64.length > 3_800_000) {
          setError(`La foto pesa ${(photoBase64.length / 1_048_576).toFixed(1)} MB incluso comprimida y el servidor admite ~3,6 MB. Usa otra imagen o quítala.`)
          setSaving(false)
          return
        }
      }

      let formulaNote = ''
      if (formulaActiva === 'MASA_A_NEWTONS_KG') {
        formulaNote = '[Fórmula: F = m(kg) × 9.80665 N | Unidad: N]'
      } else if (formulaActiva === 'MASA_A_NEWTONS_G') {
        formulaNote = '[Fórmula: F = (m/1000) × 9.80665 N | Unidad: N]'
      } else if (formulaActiva === 'KGF_A_NEWTONS') {
        formulaNote = '[Fórmula: 1 kgf = 9.80665 N | Unidad: N]'
      } else if (formulaActiva === 'NEWTONS_A_KN') {
        formulaNote = '[Fórmula: 1 kN = 1000 N | Unidad: kN]'
      } else if (effectiveUnidad && effectiveUnidad !== selectedEquipo?.Unidad_Tolerancia) {
        formulaNote = `[Unidad: ${effectiveUnidad}]`
      }

      const enhancedPoints = (tipoVerif === 'CALIBRACION' && singleCalcs)
        ? singleCalcs.points.map((p, idx) => ({
            ...p,
            unidad: effectiveUnidad,
            formula: formulaActiva !== 'NINGUNA' ? formulaActiva : undefined,
            masaInput: mediciones[idx]?.masaInput || undefined
          }))
        : null

      let r;
      if (logToEdit) {
        // Modo Edición
        let finalStatus = statusCalc || 'APTO'
        if (tipoVerif === 'OPERATIVIDAD') {
          finalStatus = resultadoStatusOperatividad
          if (accionesPendientes.trim().length > 0 && finalStatus === 'OPERATIVO') {
            finalStatus = 'ACCION_PENDIENTE'
          }
        }

        const editObs = [formulaNote, obs.trim()].filter(Boolean).join(' ').trim() || 'Verificación editada.'

        const payload = {
          Fecha_Ejecucion: new Date(fechaEjecucion).toISOString(),
          FK_ID_Patron_Usado: tipoVerif === 'CALIBRACION' ? selectedPatronId : null,
          Medida_Patron: (tipoVerif === 'CALIBRACION' && singleCalcs) ? singleCalcs.worstPatron : null,
          Medida_Instrumento: (tipoVerif === 'CALIBRACION' && singleCalcs) ? singleCalcs.worstInstrumento : null,
          Variacion_Calculada: (tipoVerif === 'CALIBRACION' && singleCalcs) ? singleCalcs.worstVar : null,
          Resultado_Status: finalStatus,
          Tecnico_Ejecutor: tecnico.trim(),
          Observaciones: editObs,
          Tipo_Verificacion: tipoVerif,
          Acciones_Pendientes: tipoVerif === 'OPERATIVIDAD' ? (accionesPendientes || null) : null,
          Evidencia_Foto: photoRemoved ? null : (photoBase64 || logToEdit.Evidencia_Foto || null),
          Magnitud_Controlada: logToEdit.Magnitud_Controlada || null,
          Mediciones_Puntos: enhancedPoints ? JSON.stringify(enhancedPoints) : null
        }

        r = await fetch(`/api/historial/${logToEdit.ID_Log}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        // Modo Creación estándar
        let multimagnitudPayload = null
        let finalStatus = statusCalc || 'APTO'

        if (tipoVerif === 'CALIBRACION' && equipoMags.length > 1) {
          const activeMags = equipoMags.filter(mag => {
            const item = multimagnitudData[mag]
            if (!item) return false
            const hasPattern = !!item.FK_ID_Patron_Usado
            const hasMeds = item.Mediciones && item.Mediciones.some(m => m.patron.trim() !== '' || m.instrumento.trim() !== '')
            return hasPattern || hasMeds
          })

          multimagnitudPayload = activeMags.map(mag => {
            const item = multimagnitudData[mag]
            const calcs = computeMagCalcs(mag)
            return {
              Magnitud_Controlada: mag,
              FK_ID_Patron_Usado: item.FK_ID_Patron_Usado,
              Medida_Instrumento: calcs?.worstInstrumento ?? null,
              Medida_Patron: calcs?.worstPatron ?? null,
              Resultado_Status: calcs?.status ?? 'APTO',
              Variacion_Calculada: calcs?.varNum ?? 0,
              Observaciones: item.Observaciones || null,
              Mediciones_Puntos: calcs?.points ? JSON.stringify(calcs.points) : null
            }
          })
          
          const hasNoApto = multimagnitudPayload.some(item => item.Resultado_Status === 'NO_APTO')
          finalStatus = hasNoApto ? 'NO_APTO' : 'APTO'
        }

        const createObs = [formulaNote, obs.trim()].filter(Boolean).join(' ').trim() || 'Verificación histórica cargada manualmente.'

        const payload = {
          FK_ID_Equipo: selectedId,
          isHistoricalLog: true,
          Fecha_Ejecucion: new Date(fechaEjecucion).toISOString(),
          FK_ID_Patron_Usado: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1) ? selectedPatronId : null,
          Medida_Patron: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1 && singleCalcs) ? singleCalcs.worstPatron : null,
          Medida_Instrumento: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1 && singleCalcs) ? singleCalcs.worstInstrumento : null,
          Variacion_Calculada: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1 && singleCalcs) ? singleCalcs.worstVar : null,
          Resultado_Status: tipoVerif === 'OPERATIVIDAD' ? resultadoStatusOperatividad : finalStatus,
          Tecnico_Ejecutor: tecnico.trim(),
          Observaciones: createObs,
          Tipo_Verificacion: tipoVerif,
          Acciones_Pendientes: tipoVerif === 'OPERATIVIDAD' ? (accionesPendientes || null) : null,
          Evidencia_Foto: photoBase64 || null,
          Magnitud_Controlada: equipoMags.length <= 1 ? (selectedEquipo?.Magnitud || null) : null,
          multimagnitudData: multimagnitudPayload,
          Mediciones_Puntos: enhancedPoints ? JSON.stringify(enhancedPoints) : null
        }

        r = await fetch('/api/historial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (r.ok) { 
        onSaved() 
      }
      else {
        let errorMsg = 'Error al guardar la verificación'
        try {
          const d = await r.json()
          if (d?.error) errorMsg = d.error
        } catch {
          errorMsg = r.status === 413
            ? 'El envío es demasiado grande para el servidor (413). Quita la foto o usa una de menor tamaño.'
            : `Error del servidor (${r.status}: ${r.statusText || 'respuesta no válida'})`
        }
        setError(errorMsg)
        setSaving(false)
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Tus datos siguen en el formulario: revisa tu conexión y vuelve a intentarlo.')
      setSaving(false)
    }
  }

  const isInstrument = selectedEquipo?.Tipo === 'INSTRUMENTO'
  const tab2Label = '2. Verificación Metrológica'

  const patronesFiltrados = patrones.filter(p => {
    if (equipoMags.length === 0) return true
    if (!p.Magnitud) return true
    if (formulaActiva.includes('MASA') || equipoMags.includes('FUERZA')) {
      if (p.Magnitud?.includes('MASA') || p.Magnitud?.includes('FUERZA')) return true
    }
    return equipoMags.some(mag => p.Magnitud?.includes(mag))
  })
  const patronesAMostrar = patronesFiltrados.length > 0 ? patronesFiltrados : patrones

  // ¿Hay datos ingresados que se perderían al cerrar? (solo registros nuevos)
  const dirty = !saving && !logToEdit && Boolean(
    tecnico.trim() || obs.trim() || accionesPendientes.trim() || photoFile || selectedPatronId ||
    mediciones.some(m => m.patron || m.instrumento || m.masaInput)
  )

  return (
    <Modal
      title={logToEdit ? 'Editar Verificación' : 'Agregar Verificación Anterior'}
      subtitle={logToEdit
        ? `Modificando registro de control para ${selectedEquipo?.Codigo_Interno}`
        : (selectedEquipo ? `Carga de historial metrológico previo para ${selectedEquipo.Codigo_Interno}` : 'Carga de historial metrológico previo')}
      icon={<Settings2 size={20} />}
      onClose={onClose}
      dirty={dirty}
      busy={saving}
      maxWidth={600}
      error={error}
      onSubmit={handleSubmit}
      toolbar={
        <div className="ui-seg" role="tablist" aria-label="¿Qué tipo de control se realizó?">
          {([
            { id: 'OPERATIVIDAD' as const, label: '1. Operatividad', short: '1. Operatividad', Icon: Activity },
            { id: 'CALIBRACION' as const, label: tab2Label, short: '2. Verificación', Icon: Calculator },
          ]).map(({ id, label, short, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tipoVerif === id}
              aria-label={label}
              className="ui-seg-btn"
              onClick={() => { setTipoVerif(id); setError('') }}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="ui-seg-long">{label}</span>
              <span className="ui-seg-short" aria-hidden="true">{short}</span>
            </button>
          ))}
        </div>
      }
      footer={
        <>
          <button type="button" className="ui-btn ui-btn-quiet" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
            {saving
              ? <><span className="ui-spin" aria-hidden="true" /> Guardando…</>
              : <><CheckCircle2 size={18} aria-hidden="true" /> {logToEdit ? 'Guardar Cambios' : 'Guardar Histórico'}</>}
          </button>
        </>
      }
    >
            {equipo && equipo.ID_Equipo ? (
              <div style={{ background: 'var(--surface-field)', padding: '12px 16px', borderRadius: 14, border: '1px solid var(--border-field)', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{equipo.Nombre_Equipo}</div>
                <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600 }}>Código: {equipo.Codigo_Interno}</div>
              </div>
            ) : (
              <div className="form-group-modern" style={{ marginBottom: 20 }}>
                <label><User size={14} /> Equipo / Instrumento a registrar *</label>
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
            )}

            <div className="form-group-modern">
              <label><Calendar size={14} /> Fecha de Ejecución *</label>
              <input 
                type="date" 
                value={fechaEjecucion} 
                onChange={e => setFechaEjecucion(e.target.value)} 
                required 
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
                    <option value="ACCION_PENDIENTE">REQUIERE ACCIÓN / SEGUIMIENTO</option>
                  </select>
                </div>

                <div className="form-group-modern" style={{ marginBottom: 0 }}>
                  <label><ClipboardList size={14} /> Acciones que se necesitan (Seguimiento)</label>
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
                  <span style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 4 }}>
                    💡 Ingresar las acciones que se necesitan cambiará automáticamente el estado a seguimiento.
                  </span>
                </div>
              </div>
            )}

            {/* SECCIÓN CALIBRACIÓN METROLÓGICA */}
            {tipoVerif === 'CALIBRACION' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s' }}>
                {equipoMags.length > 1 ? (
                  equipoMags.map(mag => {
                    const item = multimagnitudData[mag] || { FK_ID_Patron_Usado: '', Mediciones: [{ patron: '', instrumento: '' }], Observaciones: '' }
                    const calcs = computeMagCalcs(mag)
                    const filteredPatrons = patrones.filter(p => !p.Magnitud || p.Magnitud.includes(mag))
                    const patronesAMostrar = filteredPatrons.length > 0 ? filteredPatrons : patrones

                    return (
                      <div key={mag} style={{ background: 'var(--surface-field)', border: '1px solid var(--border-field)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-field)', paddingBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Activity size={16} color="#0ea5e9" /> MAGNITUD: {mag}
                          </span>
                          {calcs && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 20,
                              border: `1.5px solid ${calcs.status === 'APTO' ? '#10b981' : '#ef4444'}`,
                              color: calcs.status === 'APTO' ? '#10b981' : '#ef4444',
                              background: calcs.status === 'APTO' ? 'var(--ok-bg)' : 'var(--bad-bg)'
                            }}>
                              {calcs.status === 'APTO' ? '✓ APTO' : '✗ NO APTO'}
                            </span>
                          )}
                        </div>

                        <div className="form-group-modern" style={{ marginBottom: 0 }}>
                          <label><CheckCircle2 size={12} /> Patrón utilizado *</label>
                          <SearchableSelect
                            options={patronesAMostrar.map(p => ({
                              value: p.ID_Patron,
                              label: `${p.Codigo || p.ID_Patron} - ${p.Nombre_Patron} (${p.Magnitud || 'General'})${p.Estado_Vigencia !== 'VIGENTE' ? ` ⚠️ ${p.Estado_Vigencia}` : ''}`
                            }))}
                            value={item.FK_ID_Patron_Usado}
                            onChange={val => setMultimagnitudData(prev => ({
                              ...prev,
                              [mag]: { ...prev[mag], FK_ID_Patron_Usado: val }
                            }))}
                            placeholder="Buscar y seleccionar patrón..."
                            icon={<CheckCircle2 size={12} />}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Puntos de Medición</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newMeds = [...(item.Mediciones || [])];
                                newMeds.push({ patron: '', instrumento: '' });
                                setMultimagnitudData(prev => ({
                                  ...prev,
                                  [mag]: { ...prev[mag], Mediciones: newMeds }
                                }));
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ➕ Añadir Medida (1+)
                            </button>
                          </label>

                          {(item.Mediciones || []).map((med, index) => {
                            const pVal = parseFloat(med.patron)
                            const iVal = parseFloat(med.instrumento)
                            const diff = (!isNaN(pVal) && !isNaN(iVal)) ? parseFloat((iVal - pVal).toFixed(4)) : null
                            return (
                              <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 75px 36px', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Medida Patrón"
                                  value={med.patron}
                                  onChange={e => {
                                    const newMeds = [...item.Mediciones]
                                    newMeds[index] = { ...newMeds[index], patron: e.target.value }
                                    setMultimagnitudData(prev => ({
                                      ...prev,
                                      [mag]: { ...prev[mag], Mediciones: newMeds }
                                    }))
                                  }}
                                  style={{ padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1.5px solid var(--border-field)', background: 'var(--surface-field)', color: 'var(--text-main)', outline: 'none', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                                  required
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Medida Instr."
                                  value={med.instrumento}
                                  onChange={e => {
                                    const newMeds = [...item.Mediciones]
                                    newMeds[index] = { ...newMeds[index], instrumento: e.target.value }
                                    setMultimagnitudData(prev => ({
                                      ...prev,
                                      [mag]: { ...prev[mag], Mediciones: newMeds }
                                    }))
                                  }}
                                  style={{ padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1.5px solid var(--border-field)', background: 'var(--surface-field)', color: 'var(--text-main)', outline: 'none', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                                  required
                                />
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', textAlign: 'center', background: 'var(--surface-sunken)', padding: '8px 2px', borderRadius: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {diff !== null ? `${diff > 0 ? '+' : ''}${diff}` : 'Var.'}
                                </div>
                                <button
                                  type="button"
                                  disabled={item.Mediciones.length <= 1}
                                  onClick={() => {
                                    const newMeds = item.Mediciones.filter((_, i) => i !== index)
                                    setMultimagnitudData(prev => ({
                                      ...prev,
                                      [mag]: { ...prev[mag], Mediciones: newMeds }
                                    }))
                                  }}
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: 8, height: 35, width: '100%', display: 'grid', placeItems: 'center', cursor: item.Mediciones.length > 1 ? 'pointer' : 'not-allowed', opacity: item.Mediciones.length > 1 ? 1 : 0.4 }}
                                >
                                  ❌
                                </button>
                              </div>
                            )
                          })}
                        </div>

                        <div className="form-group-modern" style={{ marginBottom: 0 }}>
                          <label><ClipboardList size={12} /> Observaciones para {mag}</label>
                          <textarea
                            value={item.Observaciones || ''}
                            onChange={e => setMultimagnitudData(prev => ({
                              ...prev,
                              [mag]: { ...prev[mag], Observaciones: e.target.value }
                            }))}
                            placeholder={`Observaciones específicas para la magnitud ${mag}...`}
                            rows={2}
                            style={{ 
                              width: '100%', 
                              fontSize: '13px', 
                              padding: '10px 14px', 
                              borderRadius: '10px', 
                              border: '2px solid var(--glass-border)', 
                              background: 'var(--page-bg-soft)', 
                              outline: 'none', 
                              color: 'var(--text-main)',
                              fontFamily: 'inherit',
                              resize: 'vertical'
                            }}
                          />
                        </div>

                        {calcs && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--border-field)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>
                              <span>Variación: {calcs.varNum > 0 ? '+' : ''}{calcs.varNum.toFixed(4)} {calcs.magUnidad}</span>
                              <span>Tolerancia: ±{calcs.magTolerancia} {calcs.magUnidad}</span>
                            </div>
                            <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(100, (Math.abs(calcs.varNum) / calcs.magTolerancia) * 100)}%`,
                                height: '100%',
                                background: calcs.status === 'APTO' ? '#10b981' : '#ef4444',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <>
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
                          label: `${p.Codigo || p.ID_Patron} — ${p.Nombre_Patron} (${p.Magnitud || 'General'})${p.Estado_Vigencia !== 'VIGENTE' ? ` ⚠️ ${p.Estado_Vigencia}` : ''}`
                        }))}
                        value={selectedPatronId}
                        onChange={val => setSelectedPatronId(val)}
                        placeholder="Buscar por código o nombre del patrón…"
                        icon={<CheckCircle2 size={14} />}
                      />
                      {patronesFiltrados.length === 0 && selectedEquipo?.Magnitud && (
                        <div style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 600, marginTop: 4 }}>
                          ⚠️ No hay patrones vigentes registrados para {selectedEquipo.Magnitud}. Se muestran todos.
                        </div>
                      )}
                    </div>

                    {/* Configuración Opcional: Unidad de Medición y Asistente de Fórmula */}
                    <div style={{
                      background: 'rgba(248, 250, 252, 0.8)',
                      border: '1.5px solid var(--border-field)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>
                          <span>📐 Unidad de Medición & Conversor</span>
                          <span style={{ fontSize: 10, background: 'var(--info-bg)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                            OPCIONAL
                          </span>
                        </div>
                        {formulaActiva !== 'NINGUNA' && (
                          <span style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            ⚡ Conversor activo ({effectiveUnidad})
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>
                            Asistente de Fórmula / Conversión:
                          </label>
                          <select
                            value={formulaActiva}
                            onChange={e => {
                              const val = e.target.value as any
                              setFormulaActiva(val)
                              if (val === 'MASA_A_NEWTONS_KG' || val === 'MASA_A_NEWTONS_G' || val === 'KGF_A_NEWTONS') {
                                setCustomUnidad('N')
                              } else if (val === 'NEWTONS_A_KN') {
                                setCustomUnidad('kN')
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 8,
                              border: '1.5px solid var(--border-field)',
                              background: 'var(--card-bg)',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              outline: 'none'
                            }}
                          >
                            <option value="NINGUNA">Entrada directa (Sin conversión)</option>
                            <option value="MASA_A_NEWTONS_KG">⚡ Masa (kg) ➔ Newtons (N) [F = m × 9.80665]</option>
                            <option value="MASA_A_NEWTONS_G">⚡ Masa (g) ➔ Newtons (N) [F = (g/1000) × 9.80665]</option>
                            <option value="KGF_A_NEWTONS">⚡ kgf ➔ Newtons (N) [1 kgf = 9.80665 N]</option>
                            <option value="NEWTONS_A_KN">⚡ Newtons (N) ➔ kiloNewtons (kN) [1 kN = 1000 N]</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>
                            Unidad de Medición ({effectiveUnidad || 'N/A'}):
                          </label>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Ej: N, kN, kgf, mm"
                              value={customUnidad}
                              onChange={e => setCustomUnidad(e.target.value)}
                              style={{
                                flex: '1 1 110px',
                                minWidth: 0,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1.5px solid var(--border-field)',
                                background: 'var(--card-bg)',
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                outline: 'none'
                              }}
                            />
                            <div style={{ display: 'flex', gap: 3 }}>
                              {['N', 'kN', 'kgf', 'mm'].map(u => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => setCustomUnidad(u)}
                                  style={{
                                    border: '1px solid var(--border-field)',
                                    background: customUnidad === u ? '#0ea5e9' : 'var(--card-bg)',
                                    color: customUnidad === u ? '#fff' : 'var(--text-dim)',
                                    borderRadius: 6,
                                    padding: '0 6px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acceso rápido para masas patrón */}
                      {formulaActiva === 'MASA_A_NEWTONS_KG' && (
                        <div style={{ 
                          background: 'rgba(14, 165, 233, 0.07)', 
                          border: '1px dashed var(--info-border)', 
                          borderRadius: 8, 
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--info)' }}>
                              ⚖️ Cargas Patrón de Laboratorio (PAT-008):
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>g = 9.80665 m/s²</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {[
                              { kg: 1, n: '9.807' },
                              { kg: 2, n: '19.613' },
                              { kg: 5, n: '49.033' },
                              { kg: 10, n: '98.067' },
                              { kg: 20, n: '196.133' },
                              { kg: 50, n: '490.333' }
                            ].map(item => (
                              <button
                                key={item.kg}
                                type="button"
                                onClick={() => {
                                  setMediciones(prev => {
                                    const cleaned = prev.filter(p => (p.patron && p.patron.trim() !== '') || (p.instrumento && p.instrumento.trim() !== ''))
                                    return [
                                      ...cleaned,
                                      {
                                        masaInput: String(item.kg),
                                        patron: item.n,
                                        instrumento: ''
                                      }
                                    ]
                                  })
                                }}
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--info-border)',
                                  color: 'var(--info)',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <span>+{item.kg} kg</span>
                                <span style={{ fontSize: 9.5, opacity: 0.75 }}>({item.n} N)</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          Puntos de Medición {effectiveUnidad ? `(${effectiveUnidad})` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMediciones(prev => [...prev, { patron: '', instrumento: '' }])
                          }}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            background: 'rgba(14, 165, 233, 0.1)', 
                            color: '#0ea5e9', 
                            border: 'none', 
                            padding: '4px 10px', 
                            borderRadius: 6, 
                            fontSize: 11, 
                            cursor: 'pointer', 
                            fontWeight: 'bold' 
                          }}
                        >
                          ➕ Añadir Medida (1+)
                        </button>
                      </label>

                      {mediciones.map((med, index) => {
                        const pVal = parseFloat(med.patron)
                        const iVal = parseFloat(med.instrumento)
                        const diff = (!isNaN(pVal) && !isNaN(iVal)) ? parseFloat((iVal - pVal).toFixed(4)) : null
                        const isMassFormula = formulaActiva === 'MASA_A_NEWTONS_KG' || formulaActiva === 'MASA_A_NEWTONS_G'

                        return (
                          <div key={index} style={{ 
                            display: 'grid', 
                            gridTemplateColumns: isMassFormula 
                              ? 'minmax(0, 1.25fr) minmax(0, 1fr) 75px 36px' 
                              : 'minmax(0, 1fr) minmax(0, 1fr) 75px 36px', 
                            gap: 8, 
                            alignItems: 'flex-start' 
                          }}>
                            {isMassFormula ? (
                              <div>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={formulaActiva === 'MASA_A_NEWTONS_KG' ? 'Masa Patrón (kg)' : 'Masa Patrón (g)'}
                                  value={med.masaInput ?? ''}
                                  onChange={e => {
                                    const val = e.target.value
                                    const newMeds = [...mediciones]
                                    const num = parseFloat(val)
                                    let calcPatron = ''
                                    if (!isNaN(num)) {
                                      if (formulaActiva === 'MASA_A_NEWTONS_KG') {
                                        calcPatron = (num * 9.80665).toFixed(3)
                                      } else if (formulaActiva === 'MASA_A_NEWTONS_G') {
                                        calcPatron = ((num / 1000) * 9.80665).toFixed(3)
                                      }
                                    }
                                    newMeds[index] = { ...newMeds[index], masaInput: val, patron: calcPatron }
                                    setMediciones(newMeds)
                                  }}
                                  style={{ 
                                    padding: '10px 10px', 
                                    fontSize: 13, 
                                    borderRadius: 10, 
                                    border: '2px solid var(--border-field)', 
                                    background: 'var(--surface-field)', 
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    width: '100%',
                                    minWidth: 0,
                                    boxSizing: 'border-box'
                                  }}
                                  required
                                />
                                {med.patron && (
                                  <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginTop: 3, paddingLeft: 2 }}>
                                    ⚡ = {med.patron} {effectiveUnidad || 'N'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type="number"
                                step="any"
                                placeholder={`Medida Patrón ${effectiveUnidad ? `(${effectiveUnidad})` : ''}`}
                                value={med.patron}
                                onChange={e => {
                                  const newMeds = [...mediciones]
                                  newMeds[index] = { ...newMeds[index], patron: e.target.value }
                                  setMediciones(newMeds)
                                }}
                                style={{ 
                                  padding: '10px 10px', 
                                  fontSize: 13, 
                                  borderRadius: 10, 
                                  border: '2px solid var(--border-field)', 
                                  background: 'var(--surface-field)', 
                                  color: 'var(--text-main)',
                                  outline: 'none',
                                  width: '100%',
                                  minWidth: 0,
                                  boxSizing: 'border-box'
                                }}
                                required
                              />
                            )}

                            <input
                              type="number"
                              step="any"
                              placeholder={`Lectura Instr. ${effectiveUnidad ? `(${effectiveUnidad})` : ''}`}
                              value={med.instrumento}
                              onChange={e => {
                                const newMeds = [...mediciones]
                                newMeds[index] = { ...newMeds[index], instrumento: e.target.value }
                                setMediciones(newMeds)
                              }}
                              style={{ 
                                padding: '10px 10px', 
                                fontSize: 13, 
                                borderRadius: 10, 
                                border: '2px solid var(--border-field)', 
                                background: 'var(--surface-field)', 
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '100%',
                                minWidth: 0,
                                boxSizing: 'border-box'
                              }}
                              required
                            />
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', textAlign: 'center', background: 'var(--surface-sunken)', padding: '10px 2px', borderRadius: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {diff !== null ? `${diff > 0 ? '+' : ''}${diff}` : 'Var.'}
                            </div>
                            <button
                              type="button"
                              disabled={mediciones.length <= 1}
                              onClick={() => {
                                const newMeds = mediciones.filter((_, i) => i !== index)
                                setMediciones(newMeds)
                              }}
                              style={{ 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                color: '#ef4444', 
                                border: 'none', 
                                borderRadius: 10, 
                                height: 38, 
                                width: '100%', 
                                display: 'grid', 
                                placeItems: 'center', 
                                cursor: mediciones.length > 1 ? 'pointer' : 'not-allowed', 
                                opacity: mediciones.length > 1 ? 1 : 0.4 
                              }}
                            >
                              ❌
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {varNum != null && selectedEquipo && (
                      <div className={`status-card ${statusCalc === 'APTO' ? 'is-apto' : 'is-no-apto'}`} style={{ borderLeft: `6px solid ${statusCalc === 'APTO' ? '#10b981' : '#ef4444'}`, margin: 0 }}>
                        <div style={{ flex: 1 }}>
                          <span className="status-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calculator size={10} /> Variación Detectada
                          </span>
                          <div className="status-val" style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            {varNum > 0 ? '+' : ''}{varNum.toFixed(4)} 
                            <span style={{ fontSize: 14, opacity: 0.6 }}>{effectiveUnidad}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ 
                                width: `${Math.min(100, (Math.abs(varNum) / (effectiveTolerance || 1)) * 100)}%`, 
                                height: '100%', 
                                background: statusCalc === 'APTO' ? '#10b981' : '#ef4444',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span className="tolerance-info" style={{ whiteSpace: 'nowrap' }}>TOLERANCIA ±{effectiveTolerance} {effectiveUnidad}</span>
                          </div>
                        </div>
                        <div className="status-badge-premium" style={{ border: `1.5px solid ${statusCalc === 'APTO' ? '#10b981' : '#ef4444'}`, color: statusCalc === 'APTO' ? '#10b981' : '#ef4444' }}>
                          {statusCalc === 'APTO' ? <><CheckCircle2 size={18} /> APTO</> : <><XCircle size={18} /> NO APTO</>}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="form-group-modern" style={{ marginTop: 20 }}>
              <label><User size={14} /> Responsable / Inspector *</label>
              <input value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Ingrese su nombre o apellido" required />
            </div>

            <div className="form-group-modern" style={{ marginBottom: 0 }}>
              <label><FileText size={14} /> Comentarios / Observaciones</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Anotaciones generales del estado del equipo o condiciones ambientales..." rows={2} />
            </div>

            <div className="form-group-modern" style={{ marginTop: 20, marginBottom: 0 }}>
              <label style={{ marginBottom: 4, display: 'block' }}>📸 Evidencia Fotográfica (Opcional)</label>
              {photoFile || (logToEdit?.Evidencia_Foto && !photoRemoved) ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-sunken)', border: '1px solid #0ea5e9', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: 'var(--info-bg)', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 18 }}>📸</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                      {photoFile ? photoFile.name : 'Imagen Guardada'}
                    </span>
                  </div>
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoRemoved(true); }} style={{ background: 'var(--bad-bg)', color: 'var(--bad)', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Quitar</button>
                </div>
              ) : (
                <label 
                  style={{ 
                    border: '2px dashed var(--border-field)', 
                    borderRadius: 14, 
                    padding: '20px', 
                    textAlign: 'center', 
                    background: 'var(--surface-field)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: 24 }}>📸</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13 }}>
                    Haz clic para subir o arrastra la foto de evidencia aquí
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>Formatos JPG, PNG, WEBP (Máx 10 MB)</div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={e => e.target.files?.[0] && setPhotoFile(e.target.files[0])} 
                  />
                </label>
              )}
            </div>

      <style jsx>{`
        .form-group-modern {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group-modern label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .form-group-modern input, .form-group-modern select, .form-group-modern textarea {
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--border-field);
          background: var(--surface-field);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          color: var(--text-main);
          min-width: 0;
          transition: all 0.2s;
          outline: none;
        }
        .form-group-modern input:focus, .form-group-modern select:focus, .form-group-modern textarea:focus {
          border-color: var(--accent);
          background: var(--card-bg);
          box-shadow: 0 0 0 3px var(--ring);
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
        .is-apto { background: var(--ok-bg); border: 1px solid var(--ok-border); color: var(--ok); }
        .is-no-apto { background: var(--bad-bg); border: 1px solid var(--bad-border); color: var(--bad); }
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
          background: var(--card-bg);
          box-shadow: var(--shadow-md);
        }
        @media (max-width: 640px) {
          .metrology-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </Modal>
  )
}
