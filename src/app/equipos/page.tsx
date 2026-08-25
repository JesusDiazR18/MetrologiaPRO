'use client'
import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, SlidersHorizontal, Plus, ChevronsDown, 
  ChevronsUp, CheckCircle2, XCircle, Calendar, User, QrCode, FileDigit, ShieldCheck, Activity, Trash2, FileText, Edit, RefreshCw, RotateCcw, X
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { calcularSemaforo, semaforoHex, semaforoLabel, formatFecha, diasRestantes, getScanUrl } from '@/lib/metrologia'
import { generateTechnicalSheetPDF } from '@/lib/reports'
import VerificationModal from '@/components/VerificationModal'
import CreateEquipoModal from '@/components/CreateEquipoModal'
import EditEquipoModal from '@/components/EditEquipoModal'
import RenewCertModal from '@/components/RenewCertModal'
import QRLabelModal from '@/components/QRLabelModal'
import HistoricalVerificationModal from '@/components/HistoricalVerificationModal'
import { toast } from 'react-hot-toast'

interface Equipo {
  ID_Equipo: string
  Tipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Marca?: string
  Modelo?: string
  Serie?: string
  Rango_Medida?: string
  Resolucion?: string
  Tolerancia_Aceptable: number
  Unidad_Tolerancia: string | null
  Area_Asignada: string | null
  Responsable: string | null
  Periodicidad_Meses: number
  Fecha_Ultima_Verificacion: string | null
  Fecha_Proximo_Control: string | null
  Fecha_Ingreso?: string | null
  Estado: string
  Detalles_Estado?: string | null
  Tiene_Solucion?: boolean | null
  Requiere_Seguimiento?: boolean | null
  Periodicidad_Seguimiento?: number | null
  Magnitud?: string | null
  Accesorios?: string | null
  Insumos?: string | null
  N_Certificado?: string | null
  Proveedor_Servicio?: string | null
  Fecha_Vencimiento_Certificado?: string | null
  PDF_Certificado?: string | null
  Foto_Equipo?: string | null
  historiales?: {
    ID_Log: string
    Fecha_Ejecucion: string
    Resultado_Status: string
    Tecnico_Ejecutor: string
    Evidencia_Foto?: string | null
    Variacion_Calculada?: number | null
    Observaciones?: string | null
    Acciones_Pendientes?: string | null
    Tipo_Verificacion?: string | null
    Mediciones_Puntos?: string | null
    patron?: {
      Codigo: string
      Nombre_Patron: string
    } | null
  }[]
}

export default function EquiposPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: '100px auto' }} />}>
      <EquiposContent />
    </Suspense>
  )
}

function EquiposContent() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('ALL')
  const [filterResponsable, setFilterResponsable] = useState<string>('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modalEquipo, setModalEquipo] = useState<Equipo | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editEquipo, setEditEquipo] = useState<Equipo | null>(null)
  const [renewEquipo, setRenewEquipo] = useState<Equipo | null>(null)
  const [qrLabelEquipo, setQrLabelEquipo] = useState<Equipo | null>(null)
  const [modalHistorical, setModalHistorical] = useState<Equipo | null>(null)
  const [showHistoricalModal, setShowHistoricalModal] = useState(false)
  const [editLog, setEditLog] = useState<any>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('code-desc')
  const [showFilters, setShowFilters] = useState(false)
  const searchParams = useSearchParams()

  const activeFiltersCount = [
    q !== '',
    tipo !== '',
    filterEstado !== 'ALL',
    filterResponsable !== 'ALL',
    sortBy !== 'code-desc'
  ].filter(Boolean).length

  const getFuzzyKey = (s: string): string => {
    let k = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()
    k = k.replace(/\s+/g, ' ')
    k = k.replace(/H/g, '')
    k = k.replace(/Y/g, 'I')
    k = k.replace(/V/g, 'B')
    k = k.replace(/GE/g, 'JE').replace(/GI/g, 'JI')
    k = k.replace(/Z/g, 'S')
    k = k.replace(/CE/g, 'SE').replace(/CI/g, 'SI')
    k = k.replace(/K/g, 'C').replace(/Q/g, 'C')
    k = k.replace(/NN+/g, 'N').replace(/CC+/g, 'C').replace(/PP+/g, 'P').replace(/TT+/g, 'T')
    return k
  }

  const uniqueResponsables = React.useMemo(() => {
    const map = new Map<string, string>() // normalizedKey -> originalName (best representation)

    const getNameScore = (s: string) => {
      let score = 0
      // Prefer Title Case words
      const words = s.split(/\s+/)
      const isTitleCase = words.every(w => w.length > 0 && w[0] === w[0].toUpperCase() && w.slice(1) === w.slice(1).toLowerCase())
      if (isTitleCase) score += 10
      // Prefer having accents/tilde
      if (/[áéíóúÁÉÍÓÚñÑ]/.test(s)) score += 5
      return score
    }

    equipos.forEach(e => {
      const resp = e.Responsable?.trim()
      if (resp) {
        const norm = getFuzzyKey(resp)
        const existing = map.get(norm)
        if (!existing || getNameScore(resp) > getNameScore(existing)) {
          map.set(norm, resp)
        }
      }
    })

    return Array.from(map.entries())
      .map(([key, display]) => ({ key, display }))
      .sort((a, b) => a.display.localeCompare(b.display))
  }, [equipos])

  const uniqueEstados = React.useMemo(() => {
    const set = new Set<string>()
    equipos.forEach(e => {
      if (e.Estado && e.Estado.trim() !== '') {
        set.add(e.Estado.trim())
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [equipos])

  const getEstadoLabel = (est: string) => {
    switch (est) {
      case 'OPERATIVO': return 'Operativo'
      case 'OPERATIVO_CON_DETALLES': return 'Operativo con Detalles'
      case 'FUERA_DE_SERVICIO': return 'Fuera de Servicio'
      case 'MANTENIMIENTO': return 'Mantenimiento'
      case 'NO_APTO': return 'No Apto'
      case 'DE_BAJA_OBSOLETO': return 'De Baja / Obsoleto'
      default: return est
    }
  }

  const [expandedDetails, setExpandedDetails] = useState<Record<string, Equipo>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})

  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (expandedDetails[id]) return

    try {
      setLoadingDetails(prev => ({ ...prev, [id]: true }))
      const res = await fetch(`/api/equipos/${id}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedDetails(prev => ({ ...prev, [id]: data }))
      } else {
        toast.error('Error al cargar detalles del equipo')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de red al cargar detalles')
    } finally {
      setLoadingDetails(prev => ({ ...prev, [id]: false }))
    }
  }

  const openModalWithFullDetails = async (eq: Equipo, setModalState: (eq: any) => void) => {
    if (!eq || !eq.ID_Equipo) {
      setModalState(eq)
      return
    }
    if (expandedDetails[eq.ID_Equipo]) {
      setModalState(expandedDetails[eq.ID_Equipo])
      return
    }
    let loadedEq = eq
    try {
      toast.loading('Cargando ficha técnica completa...', { id: 'modal-loading' })
      const res = await fetch(`/api/equipos/${eq.ID_Equipo}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedDetails(prev => ({ ...prev, [eq.ID_Equipo]: data }))
        loadedEq = data
        toast.success('Cargado', { id: 'modal-loading' })
      } else {
        toast.error('Error al cargar detalles', { id: 'modal-loading' })
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar detalles', { id: 'modal-loading' })
    }
    setModalState(loadedEq)
  }

  // Helper de ordenamiento natural (Excel-like) para códigos internos
  const naturalSort = (a: string, b: string, desc: boolean) => {
    const regex = /^([a-zA-Z-]+)(\d+)$/
    const matchA = String(a).match(regex)
    const matchB = String(b).match(regex)
    
    if (matchA && matchB) {
      const prefixA = matchA[1]
      const prefixB = matchB[1]
      
      if (prefixA !== prefixB) {
        return desc ? prefixB.localeCompare(prefixA) : prefixA.localeCompare(prefixB)
      }
      
      const numA = parseInt(matchA[2], 10)
      const numB = parseInt(matchB[2], 10)
      return desc ? numB - numA : numA - numB
    }
    
    return desc ? String(b).localeCompare(String(a)) : String(a).localeCompare(String(b))
  }

  const sortedEquipos = React.useMemo(() => {
    let list = [...equipos]

    // 1. Tipo Filter
    if (tipo) {
      list = list.filter(e => e.Tipo === tipo)
    }

    // 2. Estado Filter
    if (filterEstado !== 'ALL') {
      list = list.filter(e => e.Estado === filterEstado)
    }

    // 3. Responsable Filter
    if (filterResponsable !== 'ALL') {
      list = list.filter(e => {
        if (!e.Responsable) return false
        return getFuzzyKey(e.Responsable) === filterResponsable
      })
    }

    // 4. Search Filter (q)
    if (q.trim()) {
      const term = q.toLowerCase().trim()
      list = list.filter(e => 
        e.ID_Equipo.toLowerCase().includes(term) ||
        e.Codigo_Interno.toLowerCase().includes(term) ||
        e.Nombre_Equipo.toLowerCase().includes(term) ||
        (e.Responsable && e.Responsable.toLowerCase().includes(term)) ||
        (e.Marca && e.Marca.toLowerCase().includes(term)) ||
        (e.Modelo && e.Modelo.toLowerCase().includes(term)) ||
        (e.Area_Asignada && e.Area_Asignada.toLowerCase().includes(term))
      )
    }

    // 5. Sorting
    if (sortBy === 'code-desc') {
      list.sort((a, b) => naturalSort(a.Codigo_Interno, b.Codigo_Interno, true))
    } else if (sortBy === 'code-asc') {
      list.sort((a, b) => naturalSort(a.Codigo_Interno, b.Codigo_Interno, false))
    } else if (sortBy === 'deadline') {
      list.sort((a, b) => {
        if (!a.Fecha_Proximo_Control) return 1
        if (!b.Fecha_Proximo_Control) return -1
        return new Date(a.Fecha_Proximo_Control).getTime() - new Date(b.Fecha_Proximo_Control).getTime()
      })
    }
    return list
  }, [equipos, q, tipo, filterEstado, filterResponsable, sortBy])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/equipos')
      const data = await r.json()
      
      if (Array.isArray(data)) {
        setEquipos(data)
      } else {
        console.error("API returned non-array data:", data)
        setEquipos([])
      }
    } catch (e) {
      console.error("Error loading equipos", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const qParam = searchParams.get('q')
    if (qParam) {
      setQ(qParam)
    }
  }, [searchParams, load])

  useEffect(() => {
    if (equipos.length > 0 && q) {
      const exact = equipos.find((e: Equipo) => 
        e.Codigo_Interno.toLowerCase() === q.toLowerCase() ||
        e.ID_Equipo.toLowerCase() === q.toLowerCase()
      )
      if (exact) {
        setExpanded(exact.ID_Equipo)
      }
    }
  }, [equipos, q])

  const hasActiveFilters = q !== '' || tipo !== '' || filterEstado !== 'ALL' || filterResponsable !== 'ALL'
  const handleClearFilters = () => {
    setQ('')
    setTipo('')
    setFilterEstado('ALL')
    setFilterResponsable('ALL')
  }

  const handleDeBaja = async (id: string, nombre: string) => {
    const motivo = prompt(`¿Estás seguro de que deseas dar de baja o marcar como obsoleto el equipo "${nombre}"? Por favor, indica el motivo:`)
    if (motivo === null) return 
    if (!motivo.trim()) return toast.error('Debes indicar un motivo para dar de baja el equipo.')
    
    const updatePromise = fetch(`/api/equipos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: 'DE_BAJA_OBSOLETO',
        detalles_estado: `Motivo de Baja / Obsoleto: ${motivo}`,
        tiene_solucion: false,
        requiere_seguimiento: false,
        observaciones: `Baja / Obsoleto: ${motivo}`
      })
    }).then(res => {
      if (!res.ok) throw new Error('Error al actualizar el estado')
      load()
    })

    toast.promise(updatePromise, {
      loading: 'Procesando...',
      success: 'Equipo dado de baja correctamente',
      error: 'Error de red o servidor'
    })
  }

  const handleHabilitar = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas volver a HABILITAR el equipo "${nombre}"?`)) return
    
    const updatePromise = fetch(`/api/equipos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: 'OPERATIVO',
        detalles_estado: null,
        tiene_solucion: true,
        requiere_seguimiento: false,
        observaciones: `EQUIPO RE-HABILITADO: El equipo vuelve a estar disponible para su uso.`
      })
    }).then(res => {
      if (!res.ok) throw new Error('Error al habilitar el equipo')
      load()
    })

    toast.promise(updatePromise, {
      loading: 'Habilitando...',
      success: 'Equipo restaurado a Operativo',
      error: 'Error de red o servidor'
    })
  }

  const handleEliminarActivo = async (id: string, nombre: string) => {
    if (!confirm(`🚨 ADVERTENCIA: ¿Estás completamente seguro de que deseas ELIMINAR el activo "${nombre}" (${id}) y todo su historial de verificaciones?\n\nEsta acción no se puede deshacer.`)) return
    
    const deletePromise = fetch(`/api/equipos/${id}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar')
      load()
    })

    toast.promise(deletePromise, {
      loading: 'Eliminando activo...',
      success: 'Activo e historial eliminados correctamente',
      error: 'Error al eliminar el activo'
    })
  }

  const handleEliminarHistorial = async (idLog: string, activoNombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente esta verificación del historial de "${activoNombre}"?\n\nLas fechas de próxima verificación se recalcularán automáticamente.`)) return
    
    const deletePromise = fetch(`/api/historial/${idLog}`, {
      method: 'DELETE'
    }).then(res => {
      if (!res.ok) throw new Error('Error al eliminar el registro')
      load()
    })

    toast.promise(deletePromise, {
      loading: 'Eliminando registro...',
      success: 'Verificación eliminada y fechas actualizadas',
      error: 'Error al eliminar el registro'
    })
  }

  const renderExpandedDetails = (e: Equipo) => {
    if (loadingDetails[e.ID_Equipo]) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 600 }}>Cargando especificaciones completas e historial...</p>
        </div>
      )
    }
    const details = expandedDetails[e.ID_Equipo] || e
    const detailsSemaforo = calcularSemaforo(details.Fecha_Proximo_Control, details.Estado)
    const detailsStatusColor = semaforoHex(detailsSemaforo)

    return (
      <div className="expanded-details-container" style={{ borderLeft: `4px solid ${detailsStatusColor}`, padding: 'clamp(14px, 2vw, 24px)', background: 'var(--card-bg)' }}>
        {(details.Detalles_Estado || details.Requiere_Seguimiento || details.Tiene_Solucion === false) && (
          <div style={{ 
            background: details.Tiene_Solucion !== false ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            border: `1px solid ${details.Tiene_Solucion !== false ? '#f59e0b' : '#ef4444'}`, 
            borderRadius: 12, 
            padding: '14px 20px', 
            marginBottom: 20, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: 24 }}>{details.Tiene_Solucion !== false ? '⚠️' : '🚨'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: details.Tiene_Solucion !== false ? '#f59e0b' : '#ef4444', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>ESTADO: {semaforoLabel(detailsSemaforo, details.Estado).toUpperCase()}</span>
                {details.Requiere_Seguimiento && (
                  <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>SEGUIMIENTO ACTIVO</span>
                )}
                {details.Tiene_Solucion === false && (
                  <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>SIN SOLUCIÓN TÉCNICA</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-main)', marginTop: 4 }}>
                {details.Detalles_Estado || 'Sin detalles especificados.'}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, width: '100%', marginBottom: 20 }}>
          {details.Tipo === 'EQUIPO' && (
            <div 
              className="card" 
              style={{ padding: 20, background: 'var(--page-bg-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', borderRadius: 14 }}
              onClick={ev => { ev.stopPropagation(); setQrLabelEquipo(details) }}
              title="Haz clic para ver e imprimir la etiqueta"
            >
              <div style={{ background: '#fff', padding: 10, borderRadius: 14, boxShadow: 'var(--shadow-sm)' }}>
                <QRCodeSVG
                  value={getScanUrl(details.ID_Equipo)}
                  size={84}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="H"
                  style={{ display: 'block', borderRadius: 4 }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>CÓDIGO DIGITAL QR</div>
                <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 600, background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: 999, marginBottom: 8 }}>🖨️ Clic para imprimir</div>
                <button 
                  className="btn btn-ghost btn-xs" 
                  style={{ fontSize: 10, color: 'var(--accent)', border: '1px solid rgba(14, 165, 233, 0.2)' }}
                  onClick={(ev) => { ev.stopPropagation(); generateTechnicalSheetPDF(details); }}
                >
                  📄 Descargar Ficha PDF
                </button>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 18, background: 'var(--page-bg-soft)', borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
              <FileDigit size={16} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)' }}>Especificaciones</span>
            </div>
            {(details.Modelo || details.Serie) && (details.Modelo !== '—' || details.Serie !== '—') && (
              <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
                <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Modelo / Serie:</span>
                <span className="spec-value" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', textAlign: 'right' }}>{details.Modelo || '—'} / {details.Serie || '—'}</span>
              </div>
            )}
            {details.Tolerancia_Aceptable != null && (
              <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
                <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Tolerancia:</span>
                <span className="spec-value" style={{ fontSize: 12, fontWeight: 750, color: 'var(--accent)', textAlign: 'right' }}>±{details.Tolerancia_Aceptable} {details.Unidad_Tolerancia ?? 'un'}</span>
              </div>
            )}
            {details.Fecha_Ingreso && (
              <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
                <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Fecha Ingreso:</span>
                <span className="spec-value" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', textAlign: 'right' }}>{formatFecha(details.Fecha_Ingreso)}</span>
              </div>
            )}
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
              <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Próxima Verif.:</span>
              <span className="spec-value" style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--accent)', textAlign: 'right' }}>{formatFecha(details.Fecha_Proximo_Control)}</span>
            </div>
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
              <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Intervalo:</span>
              <span className="spec-value" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', textAlign: 'right' }}>{details.Periodicidad_Meses} Meses</span>
            </div>
            {details.Accesorios && details.Accesorios.trim() !== '' && details.Accesorios.trim() !== '—' && (
              <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
                <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Accesorios:</span>
                <span className="spec-value" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-soft)', textAlign: 'right' }}>{details.Accesorios}</span>
              </div>
            )}
            {details.Foto_Equipo && (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--glass-border)' }}>
                <span className="spec-label" style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 800, color: 'var(--text-main)' }}>Foto del Equipo:</span>
                <img 
                  src={details.Foto_Equipo} 
                  alt={details.Nombre_Equipo} 
                  style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--glass-border)' }} 
                  onClick={(ev) => { ev.stopPropagation(); setSelectedPhoto(details.Foto_Equipo || null) }}
                  title="Clic para ampliar foto"
                />
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 18, background: 'var(--page-bg-soft)', borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
              <ShieldCheck size={16} color="var(--success)" />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)' }}>Seguridad y Control</span>
            </div>
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
              <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Ubicación:</span>
              <span className="spec-value" style={{ fontSize: 12, fontWeight: 650, color: 'var(--text-main)', textAlign: 'right' }}>{details.Area_Asignada || 'No asignada'}</span>
            </div>
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
              <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Responsable:</span>
              <span className="spec-value" style={{ fontSize: 12, fontWeight: 650, color: 'var(--text-main)', textAlign: 'right' }}>{details.Responsable || 'No asignado'}</span>
            </div>
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--glass-border)', gap: 16 }}>
              <span className="spec-label" style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-main)', letterSpacing: '0.02em', flexShrink: 0 }}>Estado Sist.:</span>
              <span className="spec-value" style={{ color: detailsStatusColor, fontWeight: 800, fontSize: 12, textAlign: 'right' }}>{details.Estado}</span>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: 10, flexWrap: 'wrap' }}>
              {details.Tipo !== 'EQUIPO' && (
                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }} onClick={(ev) => { ev.stopPropagation(); generateTechnicalSheetPDF(details); }}>
                  📄 PDF
                </button>
              )}
              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }} onClick={(ev) => { ev.stopPropagation(); setEditEquipo(details) }}>
                <Edit size={12} style={{ display: 'inline', marginRight: 2 }} /> Editar
              </button>
              {(details.Estado === 'FUERA_DE_SERVICIO' || details.Estado === 'DE_BAJA_OBSOLETO' || details.Estado === 'OBSOLETO' || details.Estado === 'BAJA') ? (
                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--success)' }} onClick={(ev) => { ev.stopPropagation(); handleHabilitar(details.ID_Equipo, details.Nombre_Equipo) }}>Re-habilitar</button>
              ) : (
                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--warning)' }} onClick={(ev) => { ev.stopPropagation(); handleDeBaja(details.ID_Equipo, details.Nombre_Equipo) }}>Dar de Baja</button>
              )}
              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={(ev) => { ev.stopPropagation(); handleEliminarActivo(details.ID_Equipo, details.Nombre_Equipo) }}>
                <Trash2 size={12} style={{ display: 'inline', marginRight: 2 }} /> Eliminar
              </button>
            </div>
          </div>
        </div>

        {/* Historial Table */}
        <div className="card" style={{ overflow: 'hidden', background: 'var(--page-bg-soft)', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileDigit size={15} color="var(--accent)" />
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' }}>Historial de Verificaciones</span>
            </div>
            <button 
              className="btn btn-cyan btn-xs" 
              style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent)', border: '1px solid rgba(0, 229, 255, 0.2)', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
              onClick={(ev) => { ev.stopPropagation(); setModalHistorical(details) }}
            >
              ➕ Agregar Verificación Anterior
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Patrón</th>
                  <th>Variación</th>
                  <th>Resultado</th>
                  <th>Responsable</th>
                  <th style={{ textAlign: 'center' }}>Evidencia</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {details.historiales && details.historiales.map((h: any, index: number) => (
                  <tr key={h.ID_Log}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatFecha(h.Fecha_Ejecucion)}</td>
                    <td>
                      <span style={{ fontSize: 10, background: h.Tipo_Verificacion === 'OPERATIVIDAD' ? 'rgba(245,158,11,0.12)' : 'rgba(0,229,255,0.08)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: h.Tipo_Verificacion === 'OPERATIVIDAD' ? '#f59e0b' : 'var(--accent)' }}>
                        {h.Tipo_Verificacion === 'OPERATIVIDAD' ? 'Operatividad' : 'Calibración'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                      {h.patron?.Codigo || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{h.Variacion_Calculada?.toFixed(4) ?? '—'}</td>
                    <td>
                      <span className="status-badge" style={{ color: h.Resultado_Status === 'APTO' || h.Resultado_Status === 'OPERATIVO' ? 'var(--success)' : h.Resultado_Status === 'ACCION_PENDIENTE' ? '#f59e0b' : 'var(--danger)' }}>
                        {h.Resultado_Status}
                      </span>
                    </td>
                    <td>{h.Tecnico_Ejecutor}</td>
                    <td style={{ textAlign: 'center' }}>
                      {h.Evidencia_Foto ? (
                        <button 
                          className="btn btn-ghost btn-xs" 
                          style={{ color: 'var(--accent)', border: '1px solid var(--accent-dim)', padding: '2px 6px', fontSize: 10 }}
                          onClick={(ev) => { ev.stopPropagation(); setSelectedPhoto(h.Evidencia_Foto ?? null) }}
                        >
                          📸 Foto
                        </button>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {index === 0 && (
                          <button 
                            className="btn btn-ghost btn-xs" 
                            style={{ color: 'var(--accent)', padding: '2px 4px' }}
                            onClick={(ev) => { ev.stopPropagation(); setEditLog({ ...h, FK_ID_Equipo: details.ID_Equipo }) }}
                            title="Editar última verificación"
                          >
                            <Edit size={13} />
                          </button>
                        )}
                        <button 
                          className="btn btn-ghost btn-xs" 
                          style={{ color: 'var(--danger)', padding: '2px 4px' }}
                          onClick={(ev) => { ev.stopPropagation(); handleEliminarHistorial(h.ID_Log, details.Nombre_Equipo) }}
                          title="Eliminar este registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!details.historiales || details.historiales.length === 0) && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-dim)', fontSize: 11.5 }}>
                      No hay verificaciones registradas para este activo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-block">
          <div className="page-header-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1>Fichas Técnicas e Instrumentos</h1>
            <p>Catálogo centralizado de activos metrológicos del sistema</p>
          </div>
        </div>

        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> <span>Añadir Activo</span>
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--accent)', border: '1px solid rgba(0, 229, 255, 0.2)' }} onClick={() => setShowHistoricalModal(true)}>
            <RotateCcw size={16} /> <span>Verificación Anterior</span>
          </button>
          <button className="btn btn-cyan" onClick={() => setModalEquipo({} as Equipo)}>
            <Activity size={16} /> <span>Nueva Verificación</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Compacta con Cajón Desplegable */}
      <div className="filters-card-container">
        <div className="filters-main-row">
          <div className="search-box-wrap">
            <span className="search-icon-box">
              <Search size={15} />
            </span>
            <input 
              type="text" 
              placeholder="Buscar activo, código, responsable o área..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ('')} className="clear-search-btn">
                <X size={12} />
              </button>
            )}
          </div>

          <button 
            className={`btn-filter-toggle ${showFilters || activeFiltersCount > 0 ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Mostrar filtros avanzados"
          >
            <SlidersHorizontal size={15} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && <span className="filter-count-badge">{activeFiltersCount}</span>}
          </button>

          {hasActiveFilters && (
            <button 
              className="btn-filter-reset" 
              onClick={handleClearFilters}
              title="Restablecer todos los filtros"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Cajón de Filtros Desplegable */}
        {showFilters && (
          <div className="filters-expanded-drawer">
            <div className="filter-grid-2">
              <div className="filter-item-group">
                <label>Tipo de Activo</label>
                <div className="pills-group">
                  {[
                    { id: '', label: 'Todos' },
                    { id: 'EQUIPO', label: 'Equipos' },
                    { id: 'INSTRUMENTO', label: 'Instrumentos' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTipo(t.id)}
                      className={`filter-chip ${tipo === t.id ? 'active' : ''}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-item-group">
                <label>Estado Metrológico</label>
                <select 
                  className="select-filter-modern"
                  value={filterEstado} 
                  onChange={e => setFilterEstado(e.target.value)}
                >
                  <option value="ALL">Todos los Estados</option>
                  {uniqueEstados.map(est => (
                    <option key={est} value={est}>{getEstadoLabel(est)}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item-group">
                <label>Responsable</label>
                <select 
                  className="select-filter-modern"
                  value={filterResponsable} 
                  onChange={e => setFilterResponsable(e.target.value)}
                >
                  <option value="ALL">Todos los Responsables</option>
                  {uniqueResponsables.map(resp => (
                    <option key={resp.key} value={resp.key}>{resp.display}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item-group">
                <label>Orden de Visualización</label>
                <select 
                  className="select-filter-modern"
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="code-desc">Código (Z-A)</option>
                  <option value="code-asc">Código (A-Z)</option>
                  <option value="deadline">Próxima Verif. (Cercana)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="content-assets-card">
        {loading ? (
          <div className="loading-state-box">
            <div className="spinner" />
            <p>Sincronizando base de datos metrológica...</p>
          </div>
        ) : sortedEquipos.length === 0 ? (
          <div className="empty-state-box">
            <ClipboardList size={48} opacity={0.3} />
            <h3>No se encontraron registros</h3>
            <p>Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div>
            {/* 🖥️ DESKTOP VIEW: High-Density Professional Data Table */}
            <div className="desktop-table-container desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}></th>
                    <th style={{ width: '14%' }}>Identificación</th>
                    <th style={{ width: '32%' }}>Nombre del Equipo</th>
                    <th style={{ width: '22%' }}>Responsable / Estado</th>
                    <th style={{ width: '16%' }}>Próxima Verif.</th>
                    <th style={{ textAlign: 'right', width: '12%' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEquipos.map((e) => {
                    const semaforo = calcularSemaforo(e.Fecha_Proximo_Control, e.Estado)
                    const isExpanded = expanded === e.ID_Equipo
                    const statusColor = semaforoHex(semaforo)
                    
                    return (
                      <React.Fragment key={e.ID_Equipo}>
                        <tr 
                          onClick={() => toggleExpand(e.ID_Equipo)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className="semaforo-dot" style={{ 
                              background: statusColor,
                              boxShadow: `0 0 15px ${statusColor}66`
                            }} />
                          </td>
                          <td>
                            <span className="code-chip">{e.ID_Equipo}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <div style={{ fontWeight: 750, fontSize: 14 }}>{e.Nombre_Equipo}</div>
                              {e.Magnitud && (
                                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 12, color: 'var(--accent)', border: '1px solid rgba(0, 229, 255, 0.2)', fontWeight: 700 }}>
                                  {e.Magnitud}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{e.Tipo} · {e.Area_Asignada ?? 'Sin área'}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.Responsable ?? '—'}</div>
                            <div style={{ 
                              fontSize: 11, 
                              fontWeight: 700, 
                              color: statusColor,
                              textTransform: 'uppercase',
                              marginTop: 2
                            }}>
                              ● {semaforoLabel(semaforo, e.Estado)}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 750, fontSize: 13.5, color: 'var(--text-main)' }}>{formatFecha(e.Fecha_Proximo_Control)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{diasRestantes(e.Fecha_Proximo_Control)}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button 
                                className="btn-scan" 
                                style={{ padding: '6px 14px', fontSize: 11, background: 'var(--accent)', color: '#ffffff', fontWeight: 800, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px var(--accent-glow)' }}
                                onClick={(ev) => { ev.stopPropagation(); openModalWithFullDetails(e, setModalEquipo); }}
                              >
                                Verificar
                              </button>
                              <div style={{ color: 'var(--text-dim)', padding: '0 4px' }}>
                                {isExpanded ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} style={{ padding: 0, background: 'rgba(0,0,0,0.06)' }}>
                              {renderExpandedDetails(e)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 📱 MOBILE VIEW: Native Touch-Friendly Cards (No horizontal overflow!) */}
            <div className="mobile-equipment-list mobile-only">
              {sortedEquipos.map((e) => {
                const semaforo = calcularSemaforo(e.Fecha_Proximo_Control, e.Estado)
                const isExpanded = expanded === e.ID_Equipo
                const statusColor = semaforoHex(semaforo)

                return (
                  <div key={e.ID_Equipo} className={`mobile-native-card status-${semaforo.toLowerCase()}`}>
                    {/* Top Row: Tags & Semáforo */}
                    <div className="mobile-card-top">
                      <div className="mobile-tag-group">
                        <span className="code-chip">{e.ID_Equipo}</span>
                        <span className="type-badge-mini">{e.Tipo}</span>
                        {e.Magnitud && <span className="magnitud-badge-mini">{e.Magnitud}</span>}
                      </div>

                      <span className="mobile-semaforo-badge" style={{ 
                        background: `${statusColor}14`, 
                        color: statusColor, 
                        border: `1px solid ${statusColor}28` 
                      }}>
                        <span className="dot" style={{ background: statusColor }} />
                        {semaforoLabel(semaforo, e.Estado)}
                      </span>
                    </div>

                    {/* Title & Location */}
                    <div className="mobile-card-body" onClick={() => toggleExpand(e.ID_Equipo)}>
                      <h3 className="mobile-card-name">{e.Nombre_Equipo}</h3>
                      <div className="mobile-card-meta">
                        <span>📍 {e.Area_Asignada || 'Sin área asignada'}</span>
                        {e.Responsable && <span> · 👤 {e.Responsable}</span>}
                      </div>
                      
                      <div className="mobile-card-due-row">
                        <span className="due-label">Próximo Control:</span>
                        <span className="due-value" style={{ color: statusColor }}>
                          {formatFecha(e.Fecha_Proximo_Control)} ({diasRestantes(e.Fecha_Proximo_Control)})
                        </span>
                      </div>
                    </div>

                    {/* Mobile Action Buttons Bar */}
                    <div className="mobile-card-actions">
                      <button 
                        className="mobile-action-btn primary"
                        onClick={() => openModalWithFullDetails(e, setModalEquipo)}
                      >
                        <Activity size={14} />
                        <span>Verificar</span>
                      </button>

                      <button 
                        className="mobile-action-btn secondary"
                        onClick={() => generateTechnicalSheetPDF(e)}
                        title="Descargar Ficha PDF"
                      >
                        <FileText size={14} />
                        <span>PDF</span>
                      </button>

                      <button 
                        className="mobile-action-btn secondary"
                        onClick={() => openModalWithFullDetails(e, setQrLabelEquipo)}
                        title="Ver Código QR"
                      >
                        <QrCode size={14} />
                        <span>QR</span>
                      </button>

                      <button 
                        className="mobile-action-btn secondary"
                        onClick={() => openModalWithFullDetails(e, setEditEquipo)}
                        title="Editar Activo"
                      >
                        <Edit size={14} />
                        <span>Editar</span>
                      </button>

                      <button 
                        className={`mobile-action-btn expand ${isExpanded ? 'active' : ''}`}
                        onClick={() => toggleExpand(e.ID_Equipo)}
                        title="Expandir detalles"
                      >
                        {isExpanded ? <ChevronsUp size={16} /> : <ChevronsDown size={16} />}
                      </button>
                    </div>

                    {/* Mobile Expanded Content */}
                    {isExpanded && (
                      <div className="mobile-expanded-wrapper">
                        {renderExpandedDetails(e)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .page-header-title-block {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .page-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filters-card-container {
          background: var(--card-bg);
          border: 1.5px solid var(--glass-border);
          border-radius: var(--radius-lg);
          padding: 12px 16px;
          margin-bottom: 16px;
          box-shadow: var(--shadow-sm);
        }

        .filters-main-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-box-wrap {
          position: relative;
          flex: 1;
        }

        .search-icon-box {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 2;
        }

        .search-box-wrap input {
          width: 100%;
          background: var(--page-bg-soft);
          border: 1.5px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 8px 30px 8px 34px;
          font-size: 13px;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .search-box-wrap input:focus {
          background: var(--card-bg);
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .btn-filter-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--page-bg-soft);
          border: 1.5px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .btn-filter-toggle.active {
          background: rgba(14, 165, 233, 0.12);
          border-color: var(--accent);
          color: var(--accent);
        }

        .filter-count-badge {
          background: var(--accent);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 10px;
        }

        .btn-filter-reset {
          background: var(--page-bg-soft);
          border: 1.5px solid var(--glass-border);
          border-radius: var(--radius-md);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-dim);
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .btn-filter-reset:hover {
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.08);
        }

        .filters-expanded-drawer {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--glass-border);
          animation: fadeIn 0.2s ease;
        }

        .filter-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .filter-item-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-item-group label {
          font-size: 10.5px;
          font-weight: 800;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pills-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .filter-chip {
          background: var(--page-bg-soft);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.15s;
        }
        .filter-chip.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .select-filter-modern {
          background: var(--page-bg-soft);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-main);
          outline: none;
          cursor: pointer;
        }

        .content-assets-card {
          background: var(--card-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .code-chip {
          font-family: var(--font-mono);
          font-weight: 800;
          font-size: 11.5px;
          color: var(--accent);
          background: rgba(14, 165, 233, 0.08);
          border: 1px solid rgba(14, 165, 233, 0.2);
          padding: 2px 7px;
          border-radius: 6px;
          display: inline-block;
        }

        /* 📱 Mobile Native Asset Cards */
        .mobile-equipment-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
        }

        .mobile-native-card {
          background: var(--card-bg);
          border: 1.5px solid var(--glass-border);
          border-radius: 16px;
          padding: 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: var(--shadow-sm);
          position: relative;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .mobile-native-card:active {
          transform: scale(0.99);
        }

        .mobile-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .mobile-tag-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .type-badge-mini {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-soft);
          background: var(--alpha-04);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .magnitud-badge-mini {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--accent);
          background: rgba(14, 165, 233, 0.08);
          border: 1px solid rgba(14, 165, 233, 0.2);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .mobile-semaforo-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .mobile-semaforo-badge .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .mobile-card-body {
          cursor: pointer;
        }

        .mobile-card-name {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0 0 4px 0;
          line-height: 1.3;
        }

        .mobile-card-meta {
          font-size: 11.5px;
          color: var(--text-dim);
          margin-bottom: 6px;
        }

        .mobile-card-due-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .due-label {
          font-weight: 700;
          color: var(--text-soft);
        }

        .due-value {
          font-weight: 800;
        }

        .mobile-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--glass-border);
        }

        .mobile-action-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          height: 36px;
          border-radius: 10px;
          font-size: 11.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }

        .mobile-action-btn.primary {
          background: var(--accent);
          color: #ffffff;
          box-shadow: 0 2px 8px var(--accent-glow);
          flex: 1.4;
        }

        .mobile-action-btn.secondary {
          background: var(--page-bg-soft);
          border: 1px solid var(--glass-border);
          color: var(--text-main);
        }

        .mobile-action-btn.secondary:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        .mobile-action-btn.expand {
          flex: 0 0 36px;
          background: var(--page-bg-soft);
          border: 1px solid var(--glass-border);
          color: var(--text-dim);
        }

        .mobile-action-btn.expand.active {
          background: var(--alpha-08);
          color: var(--accent);
        }

        .mobile-expanded-wrapper {
          margin-top: 10px;
          border-top: 1px solid var(--glass-border);
          padding-top: 10px;
        }

        .spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--glass-border);
          gap: 16px;
        }
        .spec-row:last-child {
          border-bottom: none;
        }
        .spec-label {
          font-size: 12px;
          color: var(--text-main);
          font-weight: 800;
          letter-spacing: 0.01em;
          flex-shrink: 0;
        }
        .spec-value {
          font-size: 12px;
          font-weight: 650;
          color: var(--text-soft);
          text-align: right;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .page-header-actions {
            width: 100%;
          }
          .page-header-actions .btn {
            flex: 1;
            justify-content: center;
            font-size: 11.5px;
            padding: 8px 10px;
          }
        }
      `}</style>

      {modalEquipo !== null && (
        <VerificationModal
          equipo={modalEquipo.ID_Equipo ? modalEquipo : null}
          equipos={equipos}
          onClose={() => setModalEquipo(null)}
          onSaved={() => { setModalEquipo(null); load() }}
        />
      )}
      {showCreateModal && (
        <CreateEquipoModal 
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); load() }}
        />
      )}
      {editEquipo && (
        <EditEquipoModal
          equipo={editEquipo}
          onClose={() => setEditEquipo(null)}
          onSaved={() => { setEditEquipo(null); load() }}
        />
      )}
      {renewEquipo && (
        <RenewCertModal
          asset={{
            id: renewEquipo.ID_Equipo,
            name: renewEquipo.Nombre_Equipo,
            type: renewEquipo.Tipo as any,
            nCert: renewEquipo.N_Certificado ?? undefined,
            prov: renewEquipo.Proveedor_Servicio ?? undefined,
            fechaCal: renewEquipo.Fecha_Ultima_Verificacion ? new Date(renewEquipo.Fecha_Ultima_Verificacion).toISOString().split('T')[0] : undefined,
            fechaVenc: renewEquipo.Fecha_Vencimiento_Certificado ? new Date(renewEquipo.Fecha_Vencimiento_Certificado).toISOString().split('T')[0] : undefined
          }}
          onClose={() => setRenewEquipo(null)}
          onSaved={() => { setRenewEquipo(null); load() }}
        />
      )}
      {modalHistorical && (
        <HistoricalVerificationModal
          equipo={modalHistorical}
          equipos={equipos}
          onClose={() => setModalHistorical(null)}
          onSaved={() => { setModalHistorical(null); load() }}
        />
      )}
      {showHistoricalModal && (
        <HistoricalVerificationModal
          equipo={null}
          equipos={equipos}
          onClose={() => setShowHistoricalModal(false)}
          onSaved={() => { setShowHistoricalModal(false); load() }}
        />
      )}
      {editLog && (
        <HistoricalVerificationModal
          equipo={null}
          equipos={equipos}
          logToEdit={editLog}
          onClose={() => setEditLog(null)}
          onSaved={() => { setEditLog(null); load() }}
        />
      )}
      {qrLabelEquipo && (
        <QRLabelModal
          asset={{
            id: qrLabelEquipo.ID_Equipo,
            code: qrLabelEquipo.ID_Equipo,
            name: qrLabelEquipo.Nombre_Equipo,
            status: qrLabelEquipo.Estado,
            statusLabel: semaforoLabel(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control, qrLabelEquipo.Estado), qrLabelEquipo.Estado),
            statusColor: semaforoHex(calcularSemaforo(qrLabelEquipo.Fecha_Proximo_Control, qrLabelEquipo.Estado))
          }}
          onClose={() => setQrLabelEquipo(null)}
        />
      )}
      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)} style={{ zIndex: 4000, display: 'grid', placeItems: 'center', padding: 24, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={ev => ev.stopPropagation()}>
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
              <button onClick={() => setSelectedPhoto(null)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: 20, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
            </div>
            <img src={selectedPhoto} alt="Evidencia ampliada" style={{ maxWidth: '100%', maxHeight: '85vh', display: 'block', objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  )
}
