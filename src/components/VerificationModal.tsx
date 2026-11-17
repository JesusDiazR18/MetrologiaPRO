'use client'
import { useState, useEffect } from 'react'
import { compressImage } from '@/lib/imageUtils'
import { calcularStatus } from '@/lib/metrologia'
import {
  CheckCircle2, XCircle, User, FileText, Calculator, AlertTriangle, Settings2,
  Activity, ClipboardList, Lock, LogIn, Camera, Plus, Trash2, Zap, Ruler, ChevronDown, Info,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Magnitud?: string | null
  Tipo?: string | null
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
  equipos: Equipo[]
  onClose: () => void
  onSaved: () => void
}

type Medicion = { patron: string; instrumento: string; masaInput?: string }

// Límite seguro para el cuerpo de la petición en Vercel Serverless (4,5 MB).
// El JSON restante es pequeño; dejamos margen para él.
const MAX_PHOTO_CHARS = 3_800_000
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const SAVE_TIMEOUT_MS = 45_000

const meterPct = (value: number, tolerance: number) =>
  tolerance > 0 ? Math.min(100, (Math.abs(value) / tolerance) * 100) : value !== 0 ? 100 : 0

const signed = (n: number, digits?: number) =>
  `${n > 0 ? '+' : ''}${digits !== undefined ? n.toFixed(digits) : n}`

/** Fila de medición: patrón · instrumento · variación (coloreada vs tolerancia) · quitar. */
function MeasureRow({
  index, med, unit, tolerance, mass, massLabel, canRemove, required = true, onPatron, onInstr, onMass, onRemove,
}: {
  index: number
  med: Medicion
  unit: string
  tolerance: number
  mass?: boolean
  massLabel?: string
  canRemove: boolean
  /** Validación nativa del navegador. En multimagnitud se desactiva: allí una magnitud puede omitirse. */
  required?: boolean
  onPatron: (v: string) => void
  onInstr: (v: string) => void
  onMass?: (v: string) => void
  onRemove: () => void
}) {
  const pVal = parseFloat(med.patron)
  const iVal = parseFloat(med.instrumento)
  const diff = !isNaN(pVal) && !isNaN(iVal) ? parseFloat((iVal - pVal).toFixed(4)) : null
  const state = diff === null || !(tolerance > 0) ? '' : calcularStatus(diff, tolerance) === 'APTO' ? ' is-ok' : ' is-bad'
  const u = unit ? ` (${unit})` : ''
  const n = index + 1

  return (
    <div className={`ui-measure${mass ? ' is-mass' : ''}`}>
      <div style={{ minWidth: 0 }}>
        {mass ? (
          <input
            className="ui-input" type="number" step="any" inputMode="decimal" required={required}
            aria-label={`Punto ${n}: ${massLabel}`} placeholder={massLabel}
            value={med.masaInput ?? ''} onChange={e => onMass?.(e.target.value)}
          />
        ) : (
          <input
            className="ui-input" type="number" step="any" inputMode="decimal" required={required}
            aria-label={`Punto ${n}: medida del patrón${u}`} placeholder={`Patrón${u}`}
            value={med.patron} onChange={e => onPatron(e.target.value)}
          />
        )}
        {mass && med.patron && (
          <div className="ui-measure-hint"><Zap size={10} aria-hidden="true" /> = {med.patron} {unit || 'N'}</div>
        )}
      </div>
      <input
        className="ui-input" type="number" step="any" inputMode="decimal" required={required}
        aria-label={`Punto ${n}: lectura del instrumento${u}`} placeholder={`Instrumento${u}`}
        value={med.instrumento} onChange={e => onInstr(e.target.value)}
      />
      <div className={`ui-measure-var${state}`} aria-label="Variación" title="Variación (instrumento − patrón)">
        {diff !== null ? signed(diff) : '—'}
      </div>
      <button
        type="button" className="ui-icon-btn is-danger" disabled={!canRemove}
        onClick={onRemove} aria-label={`Quitar punto ${n}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

/** Encabezado de columnas de las filas de medición (las etiquetas no desaparecen al escribir). */
function MeasureHeader({ unit, mass, massLabel }: { unit: string; mass?: boolean; massLabel?: string }) {
  const u = unit ? ` (${unit})` : ''
  return (
    <div className={`ui-measure-cols${mass ? ' is-mass' : ''}`} aria-hidden="true">
      <span>{mass ? massLabel : <>Patrón<span className="ui-unit">{u}</span></>}</span>
      <span>Instrumento<span className="ui-unit">{u}</span></span>
      <span>Var.</span>
      <span />
    </div>
  )
}

export default function VerificationModal({ equipo, equipos, onClose, onSaved }: Props) {
  const [tipoVerif, setTipoVerif] = useState<'OPERATIVIDAD' | 'CALIBRACION'>('OPERATIVIDAD')
  const [selectedId, setSelectedId] = useState(equipo?.ID_Equipo ?? '')
  const [mediciones, setMediciones] = useState<Medicion[]>([{ patron: '', instrumento: '' }])
  const [customUnidad, setCustomUnidad] = useState('')
  const [formulaActiva, setFormulaActiva] = useState<'NINGUNA' | 'MASA_A_NEWTONS_KG' | 'MASA_A_NEWTONS_G' | 'KGF_A_NEWTONS' | 'NEWTONS_A_KN'>('NINGUNA')
  const [customTolerancia, setCustomTolerancia] = useState('')
  const [unitsOpen, setUnitsOpen] = useState(false)
  const [tecnico, setTecnico] = useState('')
  const [obs, setObs] = useState('')
  const [accionesPendientes, setAccionesPendientes] = useState('')
  const [resultadoStatusOperatividad, setResultadoStatusOperatividad] = useState('OPERATIVO')
  const [patrones, setPatrones] = useState<Patron[]>([])
  const [selectedPatronId, setSelectedPatronId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  // Auth state
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUserName, setAuthUserName] = useState('')
  const [multimagnitudData, setMultimagnitudData] = useState<Record<string, {
    FK_ID_Patron_Usado: string;
    Mediciones: { patron: string, instrumento: string }[];
    Observaciones: string;
  }>>({})

  const selectedEquipo = equipos.find(e => e.ID_Equipo === selectedId) ?? equipo

  useEffect(() => {
    if (selectedEquipo) {
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

      // Inicializar unidad y tolerancia
      setCustomUnidad(selectedEquipo.Unidad_Tolerancia || '')
      setCustomTolerancia(selectedEquipo.Tolerancia_Aceptable != null ? String(selectedEquipo.Tolerancia_Aceptable) : '')

      // Si el equipo es Universal o Fuerza, preconfigurar Newtons y fórmula de masa automáticamente
      const isUniversalOrFuerza = (selectedEquipo.Nombre_Equipo || '').toLowerCase().includes('universal') ||
                                  (selectedEquipo.Magnitud || '').toLowerCase().includes('fuerza')
      if (isUniversalOrFuerza) {
        setFormulaActiva('MASA_A_NEWTONS_KG')
        setCustomUnidad('N')
      } else {
        setFormulaActiva('NINGUNA')
      }
      setUnitsOpen(isUniversalOrFuerza)
    }
  }, [selectedId, selectedEquipo])

  useEffect(() => {
    fetch('/api/patrones')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPatrones(data.filter((p: Patron) => p.Estado_Vigencia === 'VIGENTE'))
        else setError('No se pudo cargar la lista de patrones. Cierra y vuelve a abrir esta ventana.')
      })
      .catch(() => setError('No se pudo cargar la lista de patrones. Revisa tu conexión y vuelve a abrir esta ventana.'))
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

    const status = calcularStatus(worstVar, tolerance)
    return {
      points: points as { patron: number; instrumento: number; variacion: number }[],
      worstVar: worstVar as number,
      worstPatron: worstPatron as number,
      worstInstrumento: worstInstrumento as number,
      status,
      allValid
    }
  }

  const effectiveTolerance = (customTolerancia && !isNaN(parseFloat(customTolerancia)))
    ? parseFloat(customTolerancia)
    : (selectedEquipo?.Tolerancia_Aceptable ?? 0)

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
      } catch {}
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

  // Filtrar patrones si el equipo tiene magnitud
  const equipoMags = selectedEquipo?.Magnitud ? selectedEquipo.Magnitud.split(',').map(m => m.trim()).filter(Boolean) : []
  const isMultiMag = equipoMags.length > 1

  // ¿Hay datos ingresados que se perderían al cerrar?
  const dirty = !saving && Boolean(
    tecnico.trim() || obs.trim() || accionesPendientes.trim() || photoFile || selectedPatronId ||
    mediciones.some(m => m.patron || m.instrumento || m.masaInput) ||
    Object.values(multimagnitudData).some(v =>
      v.FK_ID_Patron_Usado || v.Observaciones || v.Mediciones.some(m => m.patron || m.instrumento))
  )

  async function handleAuthAndSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!selectedId) { setError('Selecciona un equipo'); return }
    if (!tecnico) { setError('El nombre del técnico es requerido'); return }

    // Si aún no está autenticado, mostrar el prompt de autenticación
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      setAuthError('')
      return
    }

    // Si ya está autenticado, proceder con el guardado
    await doSaveVerification()
  }

  async function handleAuthSubmit() {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Ingrese usuario y contraseña')
      return
    }
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authEmail.trim(), contrasena: authPassword })
      })
      let data: { authenticated?: boolean; nombre?: string; error?: string } | null = null
      try { data = await res.json() } catch { /* respuesta sin JSON */ }
      if (res.ok && data?.authenticated) {
        setIsAuthenticated(true)
        setAuthUserName(data.nombre ?? '')
        setShowAuthPrompt(false)
        // Proceder directamente a guardar
        await doSaveVerification()
      } else {
        setAuthError(data?.error || (res.ok ? 'Respuesta inválida del servidor' : `Error del servidor (${res.status})`))
      }
    } catch {
      setAuthError('No se pudo conectar con el servidor. Revisa tu conexión y reintenta.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function doSaveVerification() {

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

    if (!selectedId) { setError('Selecciona un equipo'); return }
    if (!tecnico) { setError('El nombre del técnico es requerido'); return }
    setSaving(true); setError('')

    // Foto: se comprime en el cliente y se verifica ANTES de enviar. Así un archivo
    // demasiado pesado da un mensaje claro en vez de un fallo de red genérico.
    let photoBase64 = ''
    if (photoFile) {
      try {
        photoBase64 = await compressImage(photoFile)
      } catch {
        setError('No se pudo procesar la foto. Prueba con otra imagen o quítala.')
        setSaving(false)
        return
      }
      if (photoBase64.length > MAX_PHOTO_CHARS) {
        const mb = (photoBase64.length / 1_048_576).toFixed(1)
        setError(`La foto pesa ${mb} MB incluso comprimida y el servidor admite ~3,6 MB. Usa otra imagen o quítala.`)
        setSaving(false)
        return
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)
    try {
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

      const finalObs = [formulaNote, obs].filter(Boolean).join(' ').trim() || null

      const enhancedPoints = (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1 && singleCalcs)
        ? singleCalcs.points.map((p, idx) => ({
            ...p,
            unidad: effectiveUnidad,
            formula: formulaActiva !== 'NINGUNA' ? formulaActiva : undefined,
            masaInput: mediciones[idx]?.masaInput || undefined
          }))
        : null

      const payload = {
        FK_ID_Equipo: selectedId,
        FK_ID_Patron_Usado: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1) ? selectedPatronId : null,
        Medida_Patron: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1 && singleCalcs) ? singleCalcs.worstPatron : null,
        Medida_Instrumento: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1 && singleCalcs) ? singleCalcs.worstInstrumento : null,
        Variacion_Calculada: (tipoVerif === 'CALIBRACION' && equipoMags.length <= 1 && singleCalcs) ? singleCalcs.worstVar : null,
        Tecnico_Ejecutor: tecnico,
        Tolerancia_Aplicada: effectiveTolerance,
        Observaciones: finalObs,
        Tipo_Verificacion: tipoVerif,
        Acciones_Pendientes: tipoVerif === 'OPERATIVIDAD' ? (accionesPendientes || null) : null,
        Resultado_Status: tipoVerif === 'OPERATIVIDAD' ? resultadoStatusOperatividad : finalStatus,
        Evidencia_Foto: photoBase64 || null,
        Magnitud_Controlada: equipoMags.length <= 1 ? (selectedEquipo?.Magnitud || null) : null,
        multimagnitudData: multimagnitudPayload,
        Mediciones_Puntos: enhancedPoints ? JSON.stringify(enhancedPoints) : null
      }

      const r = await fetch('/api/historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
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
      if ((err as Error)?.name === 'AbortError') {
        setError('El servidor tardó demasiado en responder. Revisa el historial del equipo antes de reintentar, por si el registro sí quedó guardado.')
      } else {
        setError('No se pudo conectar con el servidor. Tus datos siguen en el formulario: revisa tu conexión y vuelve a intentarlo.')
      }
      setSaving(false)
    } finally {
      clearTimeout(timer)
    }
  }

  const patronesFiltrados = patrones.filter(p => {
    if (equipoMags.length === 0) return true
    if (!p.Magnitud) return true
    if (formulaActiva.includes('MASA') || equipoMags.includes('FUERZA')) {
      if (p.Magnitud?.includes('MASA') || p.Magnitud?.includes('FUERZA')) return true
    }
    return equipoMags.some(mag => p.Magnitud?.includes(mag))
  })

  const patronesAMostrar = patronesFiltrados.length > 0 ? patronesFiltrados : patrones
  const patronOptions = (list: Patron[]) => list.map(p => ({
    value: p.ID_Patron,
    label: `${p.Codigo || p.ID_Patron} — ${p.Nombre_Patron} (${p.Magnitud || 'General'})`
  }))

  const isMassFormula = formulaActiva === 'MASA_A_NEWTONS_KG' || formulaActiva === 'MASA_A_NEWTONS_G'
  const massLabel = formulaActiva === 'MASA_A_NEWTONS_KG' ? 'Masa patrón (kg)' : 'Masa patrón (g)'

  const updateMed = (index: number, patch: Partial<Medicion>) =>
    setMediciones(prev => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))

  const updateMagMed = (mag: string, index: number, patch: { patron?: string; instrumento?: string }) =>
    setMultimagnitudData(prev => ({
      ...prev,
      [mag]: { ...prev[mag], Mediciones: prev[mag].Mediciones.map((m, i) => (i === index ? { ...m, ...patch } : m)) }
    }))

  function pickPhoto(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      setError(`La imagen pesa ${(file.size / 1_048_576).toFixed(1)} MB y el máximo es 10 MB.`)
      return
    }
    setError('')
    setPhotoFile(file)
  }

  const tabs = [
    { id: 'OPERATIVIDAD' as const, label: '1. Operatividad', short: '1. Operatividad', Icon: Activity },
    { id: 'CALIBRACION' as const, label: '2. Verificación Metrológica', short: '2. Verificación', Icon: Calculator },
  ]

  return (
    <Modal
      title="Control y Verificación de Activo"
      subtitle="Registro de inspección operativa o verificación metrológica"
      icon={<Settings2 size={20} />}
      onClose={onClose}
      dirty={dirty}
      busy={saving}
      maxWidth={600}
      error={error}
      onSubmit={handleAuthAndSubmit}
      toolbar={
        <div className="ui-seg" role="tablist" aria-label="¿Qué tipo de control se realiza?">
          {tabs.map(({ id, label, short, Icon }) => (
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
          {isAuthenticated && (
            <div className="ui-auth-chip">
              <CheckCircle2 size={14} aria-hidden="true" />
              <span>Autenticado como {authUserName}</span>
            </div>
          )}
          <button type="button" className="ui-btn ui-btn-quiet" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
            {saving
              ? <><span className="ui-spin" aria-hidden="true" /> Guardando…</>
              : <><Lock size={16} aria-hidden="true" /> Registrar Verificación</>}
          </button>
        </>
      }
      overlay={showAuthPrompt ? (
        <form
          className="ui-auth-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
          onSubmit={e => { e.preventDefault(); handleAuthSubmit() }}
          onKeyDown={e => {
            if (e.key === 'Escape') { e.preventDefault(); setShowAuthPrompt(false); setAuthError('') }
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="ui-modal-icon" style={{ width: 52, height: 52, borderRadius: 15, margin: '0 auto 14px' }} aria-hidden="true">
              <Lock size={22} />
            </div>
            <h3 id="auth-title" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>Autenticación requerida</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              Ingrese sus credenciales para autorizar este registro de verificación.
            </p>
          </div>

          {authError && (
            <div role="alert" className="ui-alert ui-alert-error" style={{ marginBottom: 14 }}>
              <AlertTriangle size={15} aria-hidden="true" /> <span>{authError}</span>
            </div>
          )}

          <div className="ui-field" style={{ marginBottom: 14 }}>
            <label className="ui-label" htmlFor="auth-user">Usuario autorizado</label>
            <input
              id="auth-user" className="ui-input" type="text" autoFocus autoComplete="username"
              value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Ej. cmunizaga"
            />
          </div>
          <div className="ui-field" style={{ marginBottom: 20 }}>
            <label className="ui-label" htmlFor="auth-pass">Contraseña</label>
            <input
              id="auth-pass" className="ui-input" type="password" autoComplete="current-password"
              value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••"
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button" className="ui-btn ui-btn-ghost" style={{ flex: 1 }}
              onClick={() => { setShowAuthPrompt(false); setAuthError('') }}
            >
              Cancelar
            </button>
            <button type="submit" className="ui-btn ui-btn-accent" style={{ flex: 1.5 }} disabled={authLoading}>
              {authLoading
                ? <><span className="ui-spin" aria-hidden="true" /> Verificando…</>
                : <><LogIn size={16} aria-hidden="true" /> Autorizar</>}
            </button>
          </div>
        </form>
      ) : null}
    >
      <div className="ui-field">
        <span className="ui-label"><User size={13} aria-hidden="true" /> Equipo / instrumento a verificar <span className="ui-required">*</span></span>
        <SearchableSelect
          options={equipos.map(e => ({
            value: e.ID_Equipo,
            label: `${e.Codigo_Interno} — ${e.Nombre_Equipo} ${e.Magnitud ? `(${e.Magnitud})` : ''}`
          }))}
          value={selectedId}
          onChange={val => { setSelectedId(val); setSelectedPatronId(''); setError('') }}
          placeholder="Buscar por código o nombre del equipo…"
          ariaLabel="Equipo o instrumento a verificar"
          icon={<User size={15} />}
        />
      </div>

      {/* ── OPERATIVIDAD ── */}
      {tipoVerif === 'OPERATIVIDAD' && (
        <div className="ui-section">
          <div className="ui-field">
            <label className="ui-label" htmlFor="v-estado"><Activity size={13} aria-hidden="true" /> Estado resultante <span className="ui-required">*</span></label>
            <select
              id="v-estado"
              className="ui-select"
              value={resultadoStatusOperatividad}
              onChange={e => setResultadoStatusOperatividad(e.target.value)}
              style={{ fontWeight: 700, color: resultadoStatusOperatividad === 'OPERATIVO' ? 'var(--ok)' : 'var(--warn)' }}
            >
              <option value="OPERATIVO">OPERATIVO / APTO PARA USO</option>
              <option value="ACCION_PENDIENTE">REQUIERE ACCIÓN / SEGUIMIENTO</option>
            </select>
          </div>

          <div className="ui-field">
            <label className="ui-label" htmlFor="v-acciones"><ClipboardList size={13} aria-hidden="true" /> Acciones que se necesitan (seguimiento)</label>
            <textarea
              id="v-acciones"
              className="ui-textarea"
              value={accionesPendientes}
              onChange={e => {
                setAccionesPendientes(e.target.value)
                if (e.target.value.trim().length > 0 && resultadoStatusOperatividad === 'OPERATIVO') {
                  setResultadoStatusOperatividad('ACCION_PENDIENTE')
                }
              }}
              placeholder="Ej: Reemplazar sonda térmica la próxima semana, ajustar conector..."
              rows={2}
            />
            <span className="ui-hint" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              Ingresar las acciones que se necesitan cambiará automáticamente el estado a seguimiento.
            </span>
          </div>
        </div>
      )}

      {/* ── VERIFICACIÓN METROLÓGICA ── */}
      {tipoVerif === 'CALIBRACION' && (
        <div className="ui-section">
          {isMultiMag ? (
            equipoMags.map(mag => {
              const item = multimagnitudData[mag] || { FK_ID_Patron_Usado: '', Mediciones: [], Observaciones: '' }
              const calcs = computeMagCalcs(mag)
              const filteredPatrons = patrones.filter(p => !p.Magnitud || p.Magnitud.includes(mag))
              const patronesDeMag = filteredPatrons.length > 0 ? filteredPatrons : patrones
              const ok = calcs?.status === 'APTO'

              return (
                <div key={mag} className="ui-panel">
                  <div className="ui-panel-head">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={16} color="var(--accent)" aria-hidden="true" /> Magnitud: {mag}
                    </span>
                    {calcs && (
                      <span className={`ui-chip ${ok ? 'ui-chip-ok' : 'ui-chip-bad'}`}>
                        {ok ? <><CheckCircle2 size={12} aria-hidden="true" /> Apto</> : <><XCircle size={12} aria-hidden="true" /> No apto</>}
                      </span>
                    )}
                  </div>

                  <div className="ui-field">
                    <span className="ui-label"><CheckCircle2 size={12} aria-hidden="true" /> Patrón utilizado <span className="ui-required">*</span></span>
                    <SearchableSelect
                      options={patronOptions(patronesDeMag)}
                      value={item.FK_ID_Patron_Usado}
                      onChange={val => setMultimagnitudData(prev => ({ ...prev, [mag]: { ...prev[mag], FK_ID_Patron_Usado: val } }))}
                      placeholder="Buscar y seleccionar patrón…"
                      ariaLabel={`Patrón utilizado para ${mag}`}
                      icon={<CheckCircle2 size={14} />}
                    />
                  </div>

                  <div className="ui-field">
                    <div className="ui-label-row">
                      <span className="ui-label">Puntos de medición</span>
                      <button
                        type="button" className="ui-btn ui-btn-sm ui-btn-ghost"
                        onClick={() => setMultimagnitudData(prev => ({
                          ...prev,
                          [mag]: { ...prev[mag], Mediciones: [...(prev[mag].Mediciones || []), { patron: '', instrumento: '' }] }
                        }))}
                      >
                        <Plus size={14} aria-hidden="true" /> Añadir medida
                      </button>
                    </div>
                    <MeasureHeader unit={calcs?.magUnidad ?? ''} />
                    {(item.Mediciones || []).map((med, index) => (
                      <MeasureRow
                        key={index}
                        index={index}
                        med={med}
                        unit={calcs?.magUnidad ?? ''}
                        tolerance={calcs?.magTolerancia ?? 0}
                        canRemove={item.Mediciones.length > 1}
                        required={false}
                        onPatron={v => updateMagMed(mag, index, { patron: v })}
                        onInstr={v => updateMagMed(mag, index, { instrumento: v })}
                        onRemove={() => setMultimagnitudData(prev => ({
                          ...prev,
                          [mag]: { ...prev[mag], Mediciones: prev[mag].Mediciones.filter((_, i) => i !== index) }
                        }))}
                      />
                    ))}
                  </div>

                  <div className="ui-field">
                    <label className="ui-label" htmlFor={`obs-${mag}`}><ClipboardList size={12} aria-hidden="true" /> Observaciones para {mag}</label>
                    <textarea
                      id={`obs-${mag}`}
                      className="ui-textarea"
                      value={item.Observaciones || ''}
                      onChange={e => setMultimagnitudData(prev => ({ ...prev, [mag]: { ...prev[mag], Observaciones: e.target.value } }))}
                      placeholder={`Observaciones específicas para la magnitud ${mag}...`}
                      rows={2}
                    />
                  </div>

                  {calcs && (
                    <div className={`ui-result ${ok ? 'is-ok' : 'is-bad'}`}>
                      <div className="ui-result-main">
                        <div className="ui-result-label"><Calculator size={11} aria-hidden="true" /> Variación detectada</div>
                        <div className="ui-result-val">{signed(calcs.varNum, 4)} <small>{calcs.magUnidad}</small></div>
                        <div className="ui-meter"><span style={{ width: `${meterPct(calcs.varNum, calcs.magTolerancia)}%` }} /></div>
                        <div className="ui-result-tol">Tolerancia ±{calcs.magTolerancia} {calcs.magUnidad}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <>
              <div className="ui-field">
                <div className="ui-label-row">
                  <span className="ui-label"><CheckCircle2 size={13} aria-hidden="true" /> Patrón utilizado <span className="ui-required">*</span></span>
                  {selectedEquipo?.Magnitud && <span className="ui-chip ui-chip-info">Magnitud: {selectedEquipo.Magnitud}</span>}
                </div>
                <SearchableSelect
                  options={patronOptions(patronesAMostrar)}
                  value={selectedPatronId}
                  onChange={val => { setSelectedPatronId(val); setError('') }}
                  placeholder="Buscar por código o nombre del patrón…"
                  ariaLabel="Patrón utilizado"
                  icon={<CheckCircle2 size={15} />}
                />
                {patronesFiltrados.length === 0 && selectedEquipo?.Magnitud && (
                  <div className="ui-hint is-warn" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                    No hay patrones vigentes registrados para {selectedEquipo.Magnitud}. Se muestran todos.
                  </div>
                )}
              </div>

              {/* Unidad de medición y asistente de fórmula (opcional, plegable) */}
              <div className="ui-panel">
                <button
                  type="button"
                  className="ui-panel-toggle"
                  aria-expanded={unitsOpen}
                  onClick={() => setUnitsOpen(o => !o)}
                >
                  <Ruler size={15} aria-hidden="true" />
                  <span className="ui-grow">Unidad de medición y conversor <span style={{ fontWeight: 500, color: 'var(--text-soft)' }}>(opcional)</span></span>
                  <span className="ui-chip ui-chip-info ui-unit">{effectiveUnidad || 'N/A'}</span>
                  {formulaActiva !== 'NINGUNA' && <span className="ui-chip ui-chip-ok"><Zap size={11} aria-hidden="true" /> Conversor</span>}
                  <ChevronDown size={16} className="ui-chevron" aria-hidden="true" />
                </button>

                {unitsOpen && (
                  <div className="ui-units">
                    <div className="ui-field">
                      <label className="ui-label" htmlFor="v-formula">Asistente de fórmula / conversión</label>
                      <select
                        id="v-formula"
                        className="ui-select"
                        value={formulaActiva}
                        onChange={e => {
                          const val = e.target.value as typeof formulaActiva
                          setFormulaActiva(val)
                          if (val === 'MASA_A_NEWTONS_KG' || val === 'MASA_A_NEWTONS_G' || val === 'KGF_A_NEWTONS') {
                            setCustomUnidad('N')
                          } else if (val === 'NEWTONS_A_KN') {
                            setCustomUnidad('kN')
                          }
                        }}
                      >
                        <option value="NINGUNA">Entrada directa (sin conversión)</option>
                        <option value="MASA_A_NEWTONS_KG">Masa (kg) → Newtons (N) [F = m × 9.80665]</option>
                        <option value="MASA_A_NEWTONS_G">Masa (g) → Newtons (N) [F = (g/1000) × 9.80665]</option>
                        <option value="KGF_A_NEWTONS">kgf → Newtons (N) [1 kgf = 9.80665 N]</option>
                        <option value="NEWTONS_A_KN">Newtons (N) → kiloNewtons (kN) [1 kN = 1000 N]</option>
                      </select>
                    </div>

                    <div className="ui-field">
                      <label className="ui-label" htmlFor="v-unidad">Unidad de medición <span className="ui-unit">({effectiveUnidad || 'N/A'})</span></label>
                      <div className="ui-unit-row">
                        <input
                          id="v-unidad" className="ui-input" type="text"
                          placeholder="Ej: N, kN, kgf, mm"
                          value={customUnidad} onChange={e => setCustomUnidad(e.target.value)}
                        />
                        <div className="ui-unit-quick" role="group" aria-label="Unidades frecuentes">
                          {['N', 'kN', 'kgf', 'mm'].map(u => (
                            <button
                              key={u} type="button" className="ui-pill-btn"
                              aria-pressed={customUnidad === u}
                              onClick={() => setCustomUnidad(u)}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accesos rápidos de masas patrón (Máquina Universal / Fuerza) */}
              {formulaActiva === 'MASA_A_NEWTONS_KG' && (
                <div className="ui-quick-masses">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Zap size={12} aria-hidden="true" /> Cargas patrón de laboratorio (PAT-008)
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>g = 9.80665 m/s²</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
                        className="ui-pill-btn"
                        onClick={() => {
                          setMediciones(prev => {
                            const cleaned = prev.filter(p => (p.patron && p.patron.trim() !== '') || (p.instrumento && p.instrumento.trim() !== ''))
                            return [...cleaned, { masaInput: String(item.kg), patron: item.n, instrumento: '' }]
                          })
                        }}
                      >
                        +{item.kg} kg <span style={{ opacity: 0.7, fontWeight: 600 }}>({item.n} N)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ui-field">
                <div className="ui-label-row">
                  <span className="ui-label">Puntos de medición {effectiveUnidad && <span className="ui-unit">({effectiveUnidad})</span>}</span>
                  <button
                    type="button" className="ui-btn ui-btn-sm ui-btn-ghost"
                    onClick={() => setMediciones(prev => [...prev, { patron: '', instrumento: '' }])}
                  >
                    <Plus size={14} aria-hidden="true" /> Añadir medida
                  </button>
                </div>
                <MeasureHeader unit={effectiveUnidad} mass={isMassFormula} massLabel={massLabel} />
                {mediciones.map((med, index) => (
                  <MeasureRow
                    key={index}
                    index={index}
                    med={med}
                    unit={effectiveUnidad}
                    tolerance={effectiveTolerance}
                    mass={isMassFormula}
                    massLabel={massLabel}
                    canRemove={mediciones.length > 1}
                    onPatron={v => updateMed(index, { patron: v })}
                    onInstr={v => updateMed(index, { instrumento: v })}
                    onMass={v => {
                      const num = parseFloat(v)
                      let calcPatron = ''
                      if (!isNaN(num)) {
                        calcPatron = formulaActiva === 'MASA_A_NEWTONS_KG'
                          ? (num * 9.80665).toFixed(3)
                          : ((num / 1000) * 9.80665).toFixed(3)
                      }
                      updateMed(index, { masaInput: v, patron: calcPatron })
                    }}
                    onRemove={() => setMediciones(prev => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </div>

              {varNum != null && selectedEquipo && (
                <div className={`ui-result ${statusCalc === 'APTO' ? 'is-ok' : 'is-bad'}`}>
                  <div className="ui-result-main">
                    <div className="ui-result-label"><Calculator size={11} aria-hidden="true" /> Variación detectada</div>
                    <div className="ui-result-val">{signed(varNum, 4)} <small>{effectiveUnidad}</small></div>
                    <div className="ui-meter"><span style={{ width: `${meterPct(varNum, effectiveTolerance)}%` }} /></div>
                    <div className="ui-result-tol">Tolerancia ±{effectiveTolerance} {effectiveUnidad}</div>
                  </div>
                  <div className="ui-verdict">
                    {statusCalc === 'APTO'
                      ? <><CheckCircle2 size={18} aria-hidden="true" /> APTO</>
                      : <><XCircle size={18} aria-hidden="true" /> NO APTO</>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="ui-field">
        <label className="ui-label" htmlFor="v-tecnico"><User size={13} aria-hidden="true" /> Responsable / inspector <span className="ui-required">*</span></label>
        <input
          id="v-tecnico" className="ui-input" value={tecnico} onChange={e => setTecnico(e.target.value)}
          placeholder="Ingrese su nombre o apellido" autoComplete="name" required
        />
      </div>

      <div className="ui-field">
        <label className="ui-label" htmlFor="v-obs"><FileText size={13} aria-hidden="true" /> Comentarios / observaciones</label>
        <textarea
          id="v-obs" className="ui-textarea" value={obs} onChange={e => setObs(e.target.value)} rows={2}
          placeholder="Anotaciones generales del estado del equipo o condiciones ambientales..."
        />
      </div>

      <div className="ui-field">
        <span className="ui-label"><Camera size={13} aria-hidden="true" /> Evidencia fotográfica (opcional)</span>
        {photoFile ? (
          <div className="ui-file">
            <div className="ui-file-name">
              <Camera size={18} aria-hidden="true" />
              <span>{photoFile.name}</span>
            </div>
            <button type="button" className="ui-btn ui-btn-sm ui-btn-ghost" onClick={() => setPhotoFile(null)}>Quitar</button>
          </div>
        ) : (
          <label className="ui-drop">
            <Camera size={22} color="var(--text-soft)" aria-hidden="true" />
            <strong>Haz clic para subir la foto de evidencia</strong>
            <small>JPG, PNG o WEBP · máx. 10 MB · se optimiza automáticamente</small>
            <input
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = '' }}
            />
          </label>
        )}
      </div>
    </Modal>
  )
}
