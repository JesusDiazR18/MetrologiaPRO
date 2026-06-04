'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, CheckCircle, XCircle, AlertTriangle,
  Clock, FlaskConical, Activity, ArrowRight, TrendingUp,
  Zap, Database, Bell, ShieldCheck, AlertCircle, Download,
  FileText, Search, Filter, Eye, RotateCcw, Plus, Calendar,
  Info, ExternalLink, Award, Sparkles, SlidersHorizontal, FileSpreadsheet
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatFecha, semaforoHex, calcularSemaforo, formatFechaLarga } from '@/lib/metrologia'
import { generateExecutiveSummaryPDF, generateTechnicalSheetPDF, generatePatronSheetPDF } from '@/lib/reports'

interface Stats {
  total: number
  operativos: number
  noAptos: number
  vencidos: number
  proximos: number
  alDia: number
  pctApto: number
  complianceGlobal: number
  totalActivos: number
  equiposByTipo: { name: string; value: number }[]
  alertasCriticas: {
    id: string
    codigo: string
    nombre: string
    area: string | null
    status: string
  }[]
  ultimasVerificaciones: {
    ID_Log: string
    Fecha_Ejecucion: string
    Resultado_Status: string
    Variacion_Calculada: number | null
    Tecnico_Ejecutor: string
    FK_ID_Patron_Usado: string | null
    equipo: { Nombre_Equipo: string; Codigo_Interno: string; Tipo: string }
  }[]
  patronesVigentes: number
  patronesVencidos: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [equipos, setEquipos] = useState<any[]>([])
  const [patrones, setPatrones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Filtros locales
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [tipoFilter, setTipoFilter] = useState<string | null>(null)
  const [magnitudFilter, setMagnitudFilter] = useState<string | null>(null)
  const [responsableFilter, setResponsableFilter] = useState<string | null>(null)
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('')
  const [fechaHastaFilter, setFechaHastaFilter] = useState('')

  // Modales de detalle
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  // Descarga individual loading states
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)
  const [hoveredData, setHoveredData] = useState<any | null>(null)

  // AUDITORÍA Y OPTIMIZACIÓN: Solo hacemos 1 fetch consolidado en lugar de 3 para reducir latencia y carga de DB.
  async function loadAllData() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/estadisticas')

      if (!response.ok) {
        throw new Error('Error al sincronizar datos del servidor.')
      }

      const data = await response.json()
      setStats(data)
      setEquipos(data.equipos || [])
      setPatrones(data.patrones || [])
    } catch (err: any) {
      console.error('Error cargando panel:', err)
      setError(err.message || 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
    setMounted(true)
  }, [])

  // Consolidar todos los activos para búsqueda interactiva
  const allAssets = useMemo(() => {
    const list: any[] = []
    
    // Equipos e Instrumentos
    equipos.forEach(e => {
      const status = e.Estado === 'NO_APTO' || e.Estado === 'FUERA_DE_SERVICIO' ? 'ROJO' : calcularSemaforo(e.Fecha_Proximo_Control, e.Estado)
      list.push({
        ...e,
        id: e.ID_Equipo,
        codigo: e.Codigo_Interno || e.ID_Equipo,
        nombre: e.Nombre_Equipo,
        tipoActivo: e.Tipo || 'EQUIPO',
        status,
        categoria: 'equipo'
      })
    })

    // Patrones
    patrones.forEach(p => {
      list.push({
        ...p,
        id: p.ID_Patron,
        codigo: p.Codigo || p.ID_Patron,
        nombre: p.Nombre_Patron,
        tipoActivo: 'PATRON',
        status: p.Estado_Vigencia === 'VIGENTE' ? 'VERDE' : 'ROJO',
        categoria: 'patron'
      })
    })

    return list
  }, [equipos, patrones])

  // Filtrar activos sin aplicar filtro de estado para usar en el gráfico circular
  const filteredAssetsForChart = useMemo(() => {
    return allAssets.filter(asset => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ? true : (
        asset.nombre?.toLowerCase().includes(q) ||
        asset.codigo?.toLowerCase().includes(q) ||
        asset.Responsable?.toLowerCase().includes(q) ||
        asset.Marca?.toLowerCase().includes(q) ||
        asset.Modelo?.toLowerCase().includes(q)
      )

      const matchesTipo = !tipoFilter ? true : (
        tipoFilter === 'PATRON' ? asset.categoria === 'patron' : asset.tipoActivo === tipoFilter
      )

      let matchesDate = true
      if (fechaDesdeFilter || fechaHastaFilter) {
        const dateVal = asset.categoria === 'patron'
          ? asset.Fecha_Vencimiento_Certificado
          : asset.Fecha_Proximo_Control
        if (dateVal) {
          const dateMs = new Date(dateVal).getTime()
          if (fechaDesdeFilter && dateMs < new Date(fechaDesdeFilter).getTime()) {
            matchesDate = false
          }
          if (fechaHastaFilter && dateMs > new Date(fechaHastaFilter).getTime() + 86400000) {
            matchesDate = false
          }
        } else {
          matchesDate = false
        }
      }

      return matchesSearch && matchesTipo && matchesDate
    })
  }, [allAssets, searchQuery, tipoFilter, fechaDesdeFilter, fechaHastaFilter])

  // Filtrar activos aplicando TODOS los filtros (búsqueda, tipo, fecha y estado)
  const filteredAssets = useMemo(() => {
    return filteredAssetsForChart.filter(asset => {
      return !statusFilter ? true : asset.status === statusFilter
    })
  }, [filteredAssetsForChart, statusFilter])

  // Cumplimiento global dinámico
  const complianceGlobalDynamic = useMemo(() => {
    const activeAssets = filteredAssetsForChart.filter(a => a.status !== 'GRIS')
    const total = activeAssets.length
    if (total === 0) return 100
    const alDia = activeAssets.filter(a => a.status === 'VERDE').length
    return Math.round((alDia / total) * 100)
  }, [filteredAssetsForChart])

  // Datos para gráfico circular interactivo calculados dinámicamente
  const pieData = useMemo(() => {
    const activeAssets = filteredAssetsForChart.filter(a => a.status !== 'GRIS')
    const alDia = activeAssets.filter(a => a.status === 'VERDE').length
    const proximos = activeAssets.filter(a => a.status === 'AMARILLO').length
    const criticos = activeAssets.filter(a => a.status === 'ROJO').length
    return [
      { name: 'Al día', value: alDia, color: 'var(--success)', status: 'VERDE' },
      { name: 'Advertencia', value: proximos, color: 'var(--warning)', status: 'AMARILLO' },
      { name: 'Crítico', value: criticos, color: 'var(--danger)', status: 'ROJO' }
    ]
  }, [filteredAssetsForChart])

  // Historial de movimientos filtrado dinámicamente
  const filteredVerificaciones = useMemo(() => {
    if (!stats?.ultimasVerificaciones) return []
    return stats.ultimasVerificaciones.filter(log => {
      // Filtrar por Tipo
      if (tipoFilter) {
        if (tipoFilter === 'PATRON') {
          if (!log.FK_ID_Patron_Usado) return false
        } else {
          if (log.equipo?.Tipo !== tipoFilter) return false
        }
      }

      // Filtrar por Fecha
      if (fechaDesdeFilter) {
        const executionTime = new Date(log.Fecha_Ejecucion).getTime()
        if (executionTime < new Date(fechaDesdeFilter).getTime()) return false
      }
      if (fechaHastaFilter) {
        const executionTime = new Date(log.Fecha_Ejecucion).getTime()
        if (executionTime > new Date(fechaHastaFilter).getTime() + 86400000) return false
      }

      return true
    })
  }, [stats?.ultimasVerificaciones, tipoFilter, fechaDesdeFilter, fechaHastaFilter])

  // Estadísticas consolidadas dinámicamente según filtros para el PDF y KPIs
  const dynamicStats = useMemo(() => {
    if (!stats) return null
    const activeAssetsList = filteredAssetsForChart.filter(a => a.status !== 'GRIS')
    const totalActivos = activeAssetsList.length
    const alDia = activeAssetsList.filter(a => a.status === 'VERDE').length
    const proximos = activeAssetsList.filter(a => a.status === 'AMARILLO').length
    const vencidos = activeAssetsList.filter(a => a.status === 'ROJO').length
    const totalEquipos = activeAssetsList.filter(a => a.categoria === 'equipo' && a.tipoActivo === 'EQUIPO').length
    const totalInstrumentos = activeAssetsList.filter(a => a.categoria === 'equipo' && a.tipoActivo === 'INSTRUMENTO').length
    const totalPatrones = activeAssetsList.filter(a => a.categoria === 'patron').length
    const dadosDeBaja = filteredAssetsForChart.filter(a => a.status === 'GRIS').length

    // Alertas críticas basadas en activos críticos filtrados
    const alertasCriticas = activeAssetsList
      .filter(a => a.status === 'ROJO')
      .map(a => ({
        id: a.id,
        codigo: a.codigo,
        nombre: a.nombre,
        area: a.Area_Asignada || '',
        status: 'ROJO'
      }))

    return {
      ...stats,
      complianceGlobal: complianceGlobalDynamic,
      totalActivos,
      alDia,
      proximos,
      vencidos,
      totalEquipos: totalEquipos + totalInstrumentos,
      totalPatrones,
      dadosDeBaja,
      alertasCriticas
    }
  }, [stats, filteredAssetsForChart, complianceGlobalDynamic])

  const handleDownloadPDF = async (asset: any) => {
    setPdfLoadingId(asset.id)
    try {
      if (asset.categoria === 'patron') {
        await generatePatronSheetPDF(asset)
      } else {
        await generateTechnicalSheetPDF(asset)
      }
    } catch (err) {
      console.error('Error generando pdf:', err)
    } finally {
      setPdfLoadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="loading-center" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '60vh', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #f3f3f3', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-dim)', fontSize: 13 }}>Sincronizando Sistema Metrológico PRO...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="empty-state" style={{ color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', padding: 24, borderRadius: 16, textAlign: 'center', maxWidth: 440, margin: '40px auto' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Error de Sincronización</h2>
        <p style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>{error || 'No se pudieron recuperar las estadísticas.'}</p>
        <button onClick={loadAllData} className="btn btn-primary" style={{ marginTop: 16, background: 'var(--danger)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Reintentar</button>
      </div>
    )
  }

  return (
    <div className="dashboard-wrapper">
      
      {/* 1. KPIs Ribbon (Ultra-Compacto & Premium) */}
      <div className="kpi-glass-bar">
        {/* KPI 1 */}
        <div className="kpi-bar-item clickable" onClick={() => { setTipoFilter(null); setStatusFilter(null); setFechaDesdeFilter(''); setFechaHastaFilter(''); }}>
          <div className="kpi-meta">
            <span className="kpi-dot bg-blue" />
            <span className="kpi-bar-label">Activos Operacionales</span>
          </div>
          <div className="kpi-bar-value-row">
            <span className="kpi-bar-val">{dynamicStats?.totalActivos ?? 0}</span>
            <span className="kpi-bar-sub">
              Eq: {filteredAssetsForChart.filter(a => a.status !== 'GRIS' && a.categoria === 'equipo' && a.tipoActivo === 'EQUIPO').length} · 
              Ins: {filteredAssetsForChart.filter(a => a.status !== 'GRIS' && a.categoria === 'equipo' && a.tipoActivo === 'INSTRUMENTO').length} · 
              Pat: {filteredAssetsForChart.filter(a => a.status !== 'GRIS' && a.categoria === 'patron').length}
              {dynamicStats?.dadosDeBaja && dynamicStats.dadosDeBaja > 0 ? (
                <span style={{ color: '#94a3b8', marginLeft: 6, fontWeight: 700 }}>({dynamicStats.dadosDeBaja} de baja)</span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="kpi-bar-divider" />

        {/* KPI 2 */}
        <div className="kpi-bar-item">
          <div className="kpi-meta">
            <span className="kpi-dot bg-green" />
            <span className="kpi-bar-label">Vigencia Global</span>
          </div>
          <div className="kpi-bar-value-row">
            <span className="kpi-bar-val">{complianceGlobalDynamic}%</span>
            <span className="kpi-bar-sub">Conformidad ISO 9001</span>
          </div>
        </div>

        <div className="kpi-bar-divider" />

        {/* KPI 3 */}
        <div className="kpi-bar-item clickable" onClick={() => setStatusFilter('ROJO')}>
          <div className="kpi-meta">
            <span className="kpi-dot bg-red blinking" />
            <span className="kpi-bar-label" style={{ color: (dynamicStats?.vencidos ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>Alertas Críticas</span>
          </div>
          <div className="kpi-bar-value-row">
            <span className="kpi-bar-val" style={{ color: (dynamicStats?.vencidos ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>
              {dynamicStats?.vencidos ?? 0}
            </span>
            <span className="kpi-bar-sub">Requieren acción inmediata</span>
          </div>
        </div>

        <div className="kpi-bar-divider" />

        {/* KPI 4 */}
        <div className="kpi-bar-item clickable" onClick={() => setStatusFilter('AMARILLO')}>
          <div className="kpi-meta">
            <span className="kpi-dot bg-yellow" />
            <span className="kpi-bar-label">Advertencia</span>
          </div>
          <div className="kpi-bar-value-row">
            <span className="kpi-bar-val">{dynamicStats?.proximos ?? 0}</span>
            <span className="kpi-bar-sub">Controles o detalles</span>
          </div>
        </div>
      </div>

      {/* 2. Panel Principal (Diseño Compacto Integrado) */}
      <div className="dashboard-grid">
        
        {/* Lado Izquierdo: Explorador Inteligente de Activos (60% ancho) */}
        <div className="grid-left">
          <div className="panel-card">
            <div className="panel-card-header">
              <div>
                <h2>Explorador Inteligente de Activos</h2>
                <p className="card-subtitle">Búsqueda rápida de equipos, instrumentos y patrones de referencia</p>
              </div>
              <div className="header-actions">
                <button 
                  className="btn-compact-pdf" 
                  onClick={() => generateExecutiveSummaryPDF(dynamicStats, { tipo: tipoFilter, fechaDesde: fechaDesdeFilter, fechaHasta: fechaHastaFilter, status: statusFilter })}
                  title="Generar Reporte Ejecutivo General en PDF según filtros"
                >
                  <Download size={13} />
                  <span>Reporte Ejecutivo PDF</span>
                </button>
                <div className="panel-badge-count">
                  {filteredAssets.length} de {allAssets.length}
                </div>
              </div>
            </div>

            {/* Filtros e Input de búsqueda */}
            <div className="filters-section">
              <div className="search-bar-wrapper">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Buscar por código, nombre, marca o responsable..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Selector de Tipo */}
              <div className="filter-select-group">
                <select 
                  value={tipoFilter || ''} 
                  onChange={(e) => setTipoFilter(e.target.value || null)}
                  className="filter-dropdown"
                >
                  <option value="">Todos los Tipos</option>
                  <option value="EQUIPO">Equipos</option>
                  <option value="INSTRUMENTO">Instrumentos</option>
                  <option value="PATRON">Patrones de Referencia</option>
                </select>
              </div>

              {/* Rango de Fechas */}
              <div className="filter-date-range">
                <input 
                  type="date" 
                  value={fechaDesdeFilter} 
                  onChange={(e) => setFechaDesdeFilter(e.target.value)}
                  className="filter-date-input"
                  title="Fecha Desde (Vencimiento/Próximo Control)"
                />
                <span className="filter-date-to-separator">a</span>
                <input 
                  type="date" 
                  value={fechaHastaFilter} 
                  onChange={(e) => setFechaHastaFilter(e.target.value)}
                  className="filter-date-input"
                  title="Fecha Hasta (Vencimiento/Próximo Control)"
                />
              </div>
            </div>

            {/* Filtros Rápidos por Color / Semáforo */}
            <div className="status-pills-row">
              <button 
                onClick={() => setStatusFilter(null)} 
                className={`status-pill ${statusFilter === null ? 'active' : ''}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setStatusFilter('VERDE')} 
                className={`status-pill pill-green ${statusFilter === 'VERDE' ? 'active' : ''}`}
              >
                <span className="dot" /> Al Día
              </button>
              <button 
                onClick={() => setStatusFilter('AMARILLO')} 
                className={`status-pill pill-yellow ${statusFilter === 'AMARILLO' ? 'active' : ''}`}
              >
                <span className="dot" /> Advertencia
              </button>
              <button 
                onClick={() => setStatusFilter('ROJO')} 
                className={`status-pill pill-red ${statusFilter === 'ROJO' ? 'active' : ''}`}
              >
                <span className="dot" /> Críticos
              </button>
              <button 
                onClick={() => setStatusFilter('GRIS')} 
                className={`status-pill pill-grey ${statusFilter === 'GRIS' ? 'active' : ''}`}
              >
                <span className="dot" /> De Baja
              </button>

              {(statusFilter || searchQuery || tipoFilter || fechaDesdeFilter || fechaHastaFilter) && (
                <button 
                  onClick={() => { setStatusFilter(null); setSearchQuery(''); setTipoFilter(null); setFechaDesdeFilter(''); setFechaHastaFilter(''); }} 
                  className="btn-clear-filters"
                >
                  <RotateCcw size={10} /> Restablecer filtros
                </button>
              )}
            </div>

            {/* Lista de Activos */}
            <div className="assets-scroll-container">
              {filteredAssets.length === 0 ? (
                <div className="empty-assets-state">
                  <Info size={28} />
                  <p>No se encontraron activos con los filtros aplicados.</p>
                </div>
              ) : (
                <div className="assets-compact-list">
                  {filteredAssets.map(asset => {
                    const isPat = asset.categoria === 'patron'
                    const semColor = asset.status === 'VERDE' ? 'var(--success)' : asset.status === 'AMARILLO' ? 'var(--warning)' : 'var(--danger)'
                    
                    return (
                      <div key={asset.id} className={`asset-list-row status-${asset.status.toLowerCase()}`}>
                        <div className="asset-row-main" onClick={() => setSelectedAsset(asset)}>
                          <div className="asset-avatar" style={{ 
                            background: isPat ? 'rgba(124, 58, 237, 0.08)' : 'var(--accent-glow)',
                            color: isPat ? '#7c3aed' : 'var(--accent)'
                          }}>
                            {isPat ? <FlaskConical size={14} /> : <Award size={14} />}
                          </div>
                          <div className="asset-info-col">
                            <div className="asset-code-row">
                              <span className="asset-code">{asset.codigo}</span>
                              <span className="asset-type-badge">{asset.tipoActivo}</span>
                            </div>
                            <span className="asset-name" title={asset.nombre}>{asset.nombre}</span>
                            <span className="asset-meta">{asset.Magnitud || 'Sin magnitud'} · {asset.Area_Asignada || 'Ubicación no declarada'}</span>
                          </div>
                        </div>

                        <div className="asset-row-actions">
                          {/* Semáforo */}
                          <span className="semaforo-pill" style={{ 
                            background: `${semColor}10`, 
                            color: semColor,
                            border: `1px solid ${semColor}18`
                          }}>
                            <span className="semaforo-dot" style={{ background: semColor }} />
                            {asset.status === 'VERDE' ? 'Al día' : asset.status === 'AMARILLO' ? 'Advertencia' : asset.status === 'GRIS' ? 'De Baja' : 'Crítico'}
                          </span>

                          <button 
                            className="btn-action-icon"
                            onClick={() => handleDownloadPDF(asset)}
                            disabled={pdfLoadingId === asset.id}
                            title="Descargar Ficha Técnica PDF"
                          >
                            {pdfLoadingId === asset.id ? (
                              <div className="mini-spinner" />
                            ) : (
                              <Download size={13} />
                            )}
                          </button>

                          <button 
                            className="btn-action-icon"
                            onClick={() => setSelectedAsset(asset)}
                            title="Ver Ficha Técnica"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Distribución Visual & Logs Recientes (40% ancho) */}
        <div className="grid-right">
          
          {/* Card Gráfico Circular (Donut con info central) */}
          <div className="panel-card compact">
            <div className="panel-card-header no-border">
              <div>
                <h2>Distribución del Parque</h2>
                <p className="card-subtitle">Haz clic en una sección para filtrar la lista</p>
              </div>
            </div>

            <div className="chart-wrapper">
              {mounted && pieData.length > 0 && (
                <div style={{ width: '100%', height: 140, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(data: any) => {
                          if (data && data.payload) {
                            setHoveredData(data.payload)
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredData(null)
                        }}
                        onClick={(data: any) => {
                          if (data && data.status) {
                            setStatusFilter(data.status)
                          }
                        }}
                        style={{ cursor: 'pointer', outline: 'none' }}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Cumplimiento en el centro del Donut (Interactivo con hover) */}
                  <div className="donut-center-info" style={{ pointerEvents: 'none' }}>
                    <span 
                      className="donut-pct" 
                      style={{ 
                        color: hoveredData ? hoveredData.color : 'var(--text-main)',
                        transition: 'color 0.2s ease-in-out'
                      }}
                    >
                      {hoveredData ? hoveredData.value : `${complianceGlobalDynamic}%`}
                    </span>
                    <span className="donut-lbl">
                      {hoveredData ? hoveredData.name : 'Vigente'}
                    </span>
                  </div>

                  {statusFilter && (
                    <button className="reset-chart-btn" onClick={() => setStatusFilter(null)}>
                      <RotateCcw size={10} /> Resetear
                    </button>
                  )}
                </div>
              )}

              {/* Leyenda Gráfica */}
              <div className="chart-legend">
                {pieData.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`legend-item ${statusFilter === item.status ? 'legend-item-active' : ''}`}
                    onClick={() => setStatusFilter(statusFilter === item.status ? null : item.status)}
                  >
                    <span className="legend-dot" style={{ background: item.color }} />
                    <span className="legend-name">{item.name}</span>
                    <span className="legend-val">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card Historial de Movimientos */}
          <div className="panel-card compact">
            <div className="panel-card-header">
              <div>
                <h2>Movimientos Recientes</h2>
                <p className="card-subtitle">Historial de calibraciones y controles ejecutados</p>
              </div>
            </div>

            <div className="activity-timeline-compact">
              {filteredVerificaciones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-soft)', fontSize: '11.5px' }}>
                  Sin movimientos registrados para los filtros actuales.
                </div>
              ) : (
                filteredVerificaciones.slice(0, 4).map((log) => {
                  const statusColor = log.Resultado_Status === 'APTO' ? 'var(--success)' : 'var(--danger)'
                  
                  return (
                    <div key={log.ID_Log} className="timeline-row-compact" onClick={() => setSelectedLog(log)}>
                      <div className="timeline-left-icon">
                        <div className={`icon-pill ${log.Resultado_Status === 'APTO' ? 'status-badge-vigente' : 'status-badge-vencido'}`} style={{ border: 'none', padding: 0 }}>
                          {log.Resultado_Status === 'APTO' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        </div>
                        <div className="timeline-connector" />
                      </div>

                      <div className="timeline-info-block">
                        <div className="timeline-header-line">
                          <span className="timeline-title-code">{log.equipo.Codigo_Interno}</span>
                          <span className="timeline-date">{formatFecha(log.Fecha_Ejecucion)}</span>
                        </div>
                        <div className="timeline-desc-name">{log.equipo.Nombre_Equipo}</div>
                        <div className="timeline-footer-line">
                          <span>Tec: {log.Tecnico_Ejecutor.split(' ')[0]}</span>
                          {log.Variacion_Calculada !== null && (
                            <span className="var-val">Var: {log.Variacion_Calculada.toFixed(3)}</span>
                          )}
                          <span className="timeline-status-badge" style={{ color: statusColor }}>
                            {log.Resultado_Status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL DETALLE DE ACTIVO */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
          <div className="dashboard-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="avatar-header" style={{
                background: selectedAsset.categoria === 'patron' ? 'rgba(124, 58, 237, 0.1)' : 'var(--accent-glow)',
                color: selectedAsset.categoria === 'patron' ? '#7c3aed' : 'var(--accent)'
              }}>
                {selectedAsset.categoria === 'patron' ? <FlaskConical size={18} /> : <Award size={18} />}
              </div>
              <div className="modal-title-col">
                <span className="modal-asset-type">{selectedAsset.tipoActivo}</span>
                <h3>{selectedAsset.nombre}</h3>
                <span className="modal-asset-code">{selectedAsset.codigo}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAsset(null)}>×</button>
            </div>

            <div className="modal-body-content">
              {/* Imagen si existe */}
              <div className="modal-photo-section">
                {selectedAsset.Foto_Equipo || selectedAsset.Foto_Patron ? (
                  <img src={selectedAsset.Foto_Equipo || selectedAsset.Foto_Patron} alt="Evidencia del activo" className="modal-photo-img" />
                ) : (
                  <div className="modal-no-photo">
                    <Info size={20} color="var(--text-soft)" />
                    <span>Sin registro fotográfico disponible</span>
                  </div>
                )}
              </div>

              {/* Ficha técnica compacta */}
              <div className="specs-table-compact">
                <div className="specs-row">
                  <span className="spec-lbl">Magnitud</span>
                  <span className="spec-val font-bold">{selectedAsset.Magnitud || '—'}</span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Ubicación / Área</span>
                  <span className="spec-val">{selectedAsset.Area_Asignada || '—'}</span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Responsable</span>
                  <span className="spec-val">{selectedAsset.Responsable || '—'}</span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Marca y Modelo</span>
                  <span className="spec-val">{selectedAsset.Marca ? `${selectedAsset.Marca} - ${selectedAsset.Modelo || '—'}` : '—'}</span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Número de Serie</span>
                  <span className="spec-val mono-font">{selectedAsset.Serie || '—'}</span>
                </div>
                {selectedAsset.Rango_Medida && (
                  <div className="specs-row">
                    <span className="spec-lbl">Rango de Medida</span>
                    <span className="spec-val">{selectedAsset.Rango_Medida}</span>
                  </div>
                )}
                {selectedAsset.Resolucion && (
                  <div className="specs-row">
                    <span className="spec-lbl">Resolución</span>
                    <span className="spec-val">{selectedAsset.Resolucion}</span>
                  </div>
                )}
                <div className="specs-row">
                  <span className="spec-lbl">Última Verificación</span>
                  <span className="spec-val">{formatFecha(selectedAsset.Fecha_Calibracion_Externa || selectedAsset.Fecha_Ultima_Verificacion)}</span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Próximo Control</span>
                  <span className="spec-val font-bold" style={{
                    color: selectedAsset.status === 'VERDE' ? 'var(--success)' : selectedAsset.status === 'AMARILLO' ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {formatFecha(selectedAsset.Fecha_Vencimiento_Certificado || selectedAsset.Fecha_Proximo_Control)}
                  </span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Estado Metrológico</span>
                  <span className="spec-val">
                    <span className="badge-status-fill" style={{
                      background: selectedAsset.status === 'VERDE' ? 'rgba(16, 185, 129, 0.1)' : selectedAsset.status === 'AMARILLO' ? 'rgba(245, 158, 11, 0.1)' : selectedAsset.status === 'GRIS' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: selectedAsset.status === 'VERDE' ? 'var(--success)' : selectedAsset.status === 'AMARILLO' ? 'var(--warning)' : selectedAsset.status === 'GRIS' ? '#64748b' : 'var(--danger)',
                    }}>
                      {selectedAsset.status === 'VERDE' ? 'Al día' : selectedAsset.status === 'AMARILLO' ? 'Advertencia' : selectedAsset.status === 'GRIS' ? 'De Baja' : 'Crítico'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button 
                className="modal-btn modal-btn-primary"
                onClick={() => handleDownloadPDF(selectedAsset)}
                disabled={pdfLoadingId === selectedAsset.id}
              >
                {pdfLoadingId === selectedAsset.id ? <div className="mini-spinner" /> : <Download size={13} />}
                <span>Descargar PDF</span>
              </button>
              
              <Link 
                href={selectedAsset.categoria === 'patron' ? `/patrones?q=${selectedAsset.codigo}` : `/equipos?q=${selectedAsset.codigo}`} 
                className="modal-btn modal-btn-secondary"
                onClick={() => setSelectedAsset(null)}
              >
                <ExternalLink size={13} />
                <span>Ir al Registro</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALLE DE MOVIMIENTO/LOG */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="dashboard-modal-card mini" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="avatar-header" style={{
                background: logStatusColor(selectedLog.Resultado_Status) + '12',
                color: logStatusColor(selectedLog.Resultado_Status)
              }}>
                {selectedLog.Resultado_Status === 'APTO' ? <CheckCircle size={18} /> : <XCircle size={18} />}
              </div>
              <div className="modal-title-col">
                <span className="modal-asset-type">Registro de Control Metrológico</span>
                <h3>Control de Instrumento</h3>
                <span className="modal-asset-code">{selectedLog.equipo.Codigo_Interno} - {selectedLog.equipo.Nombre_Equipo}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedLog(null)}>×</button>
            </div>

            <div className="modal-body-content">
              <div className="specs-table-compact">
                <div className="specs-row">
                  <span className="spec-lbl">Fecha de Control</span>
                  <span className="spec-val font-bold">{formatFecha(selectedLog.Fecha_Ejecucion)}</span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Responsable</span>
                  <span className="spec-val">{selectedLog.Tecnico_Ejecutor}</span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Resultado Oficial</span>
                  <span className="spec-val font-bold" style={{ color: logStatusColor(selectedLog.Resultado_Status) }}>
                    {selectedLog.Resultado_Status}
                  </span>
                </div>
                <div className="specs-row">
                  <span className="spec-lbl">Variación Medida</span>
                  <span className="spec-val mono-font font-bold">
                    {selectedLog.Variacion_Calculada !== null ? `${selectedLog.Variacion_Calculada.toFixed(5)}` : '—'}
                  </span>
                </div>
                <div className="specs-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '10px 0' }}>
                  <span className="spec-lbl">Observaciones del Informe</span>
                  <div className="spec-textarea-display">
                    {selectedLog.Observaciones || 'Sin observaciones registradas.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button className="modal-btn modal-btn-secondary" style={{ width: '100%' }} onClick={() => setSelectedLog(null)}>
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS del Dashboard */}
      <style jsx>{`
        .dashboard-wrapper {
          padding: 4px 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 1. KPIs Ribbon - Glass & Ultra-Compact */
        .kpi-glass-bar {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(15, 23, 42, 0.05);
          border-radius: 16px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          gap: 16px;
        }

        .kpi-bar-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .kpi-bar-item.clickable {
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 6px 12px;
          border-radius: 10px;
        }
        .kpi-bar-item.clickable:hover {
          background: var(--alpha-02);
          transform: translateY(-1px);
        }

        .kpi-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .kpi-dot.bg-blue { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
        .kpi-dot.bg-green { background: var(--success); box-shadow: 0 0 8px var(--success); }
        .kpi-dot.bg-red { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
        .kpi-dot.bg-yellow { background: var(--warning); box-shadow: 0 0 8px var(--warning); }

        .kpi-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kpi-bar-label {
          font-size: 10px;
          font-weight: 750;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          line-height: 1.1;
        }

        .kpi-bar-value-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-top: 2px;
          min-width: 0;
          width: 100%;
        }

        .kpi-bar-val {
          font-size: 20px;
          font-weight: 900;
          color: var(--text-main);
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .kpi-bar-sub {
          font-size: 9px;
          color: var(--text-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kpi-bar-divider {
          width: 1px;
          height: 34px;
          background: var(--glass-border);
          flex-shrink: 0;
        }

        .blinking {
          animation: blinker 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes blinker {
          50% { opacity: 0.35; }
        }

        /* 2. Dashboard Grid Layout */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.62fr 1fr;
          gap: 20px;
          align-items: start;
        }

        .grid-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .grid-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Panel Card */
        .panel-card {
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--glass-border);
          border-radius: 18px;
          box-shadow: var(--shadow-sm);
          padding: 20px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .panel-card:hover {
          box-shadow: var(--shadow-md);
        }

        .panel-card.compact {
          padding: 16px;
        }

        .panel-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 12px;
          margin-bottom: 14px;
        }

        .panel-card-header.no-border {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 8px;
        }

        .panel-card-header h2 {
          font-size: 15px;
          font-weight: 850;
          color: var(--oxford-blue);
          letter-spacing: -0.018em;
        }

        .card-subtitle {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .panel-badge-count {
          background: var(--alpha-04);
          font-size: 10px;
          font-weight: 850;
          color: var(--text-main);
          padding: 3px 10px;
          border-radius: 20px;
        }

        .btn-compact-pdf {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, var(--oxford-blue) 0%, var(--oxford-blue-light) 100%);
          color: var(--card-bg);
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--shadow-sm);
        }
        .btn-compact-pdf:hover {
          background: linear-gradient(135deg, var(--oxford-blue-light) 0%, var(--snow-3) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        /* Seccion Filtros */
        .filters-section {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-bar-wrapper {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-soft);
        }

        .search-bar-wrapper input {
          width: 100%;
          background: var(--alpha-02);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 9px 12px 9px 34px;
          font-size: 13px;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .search-bar-wrapper input:focus {
          background: var(--card-bg);
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .filter-select-group {
          flex-shrink: 0;
        }

        .filter-dropdown {
          background: var(--alpha-02);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 8.5px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-dim);
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-dropdown:focus {
          background: var(--card-bg);
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .filter-date-range {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .filter-date-input {
          background: var(--alpha-02);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dim);
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .filter-date-input:focus {
          background: var(--card-bg);
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .filter-date-to-separator {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-soft);
          text-transform: uppercase;
        }

        /* Pills de estado */
        .status-pills-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 12px;
        }

        .status-pill {
          background: var(--alpha-04);
          border: none;
          color: var(--text-dim);
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 9px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .status-pill:hover {
          background: var(--alpha-08);
        }

        .status-pill.active {
          background: var(--oxford-blue);
          color: var(--card-bg);
        }

        .status-pill .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .pill-green .dot { background: var(--success); }
        .pill-yellow .dot { background: var(--warning); }
        .pill-red .dot { background: var(--danger); }
        .pill-grey .dot { background: #94a3b8; }

        .pill-green.active { background: var(--success); color: var(--card-bg); }
        .pill-yellow.active { background: var(--warning); color: var(--card-bg); }
        .pill-red.active { background: var(--danger); color: var(--card-bg); }
        .pill-grey.active { background: #64748b; color: var(--card-bg); }

        .btn-clear-filters {
          background: var(--alpha-02);
          border: none;
          color: var(--text-dim);
          font-size: 10px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .btn-clear-filters:hover {
          background: var(--alpha-08);
          color: var(--text-main);
        }

        /* Lista de Activos */
        .assets-scroll-container {
          max-height: 420px;
          overflow-y: auto;
          padding-right: 6px;
        }

        .assets-scroll-container::-webkit-scrollbar {
          width: 6px;
        }
        .assets-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .assets-scroll-container::-webkit-scrollbar-thumb {
          background: var(--alpha-12);
          border-radius: 10px;
        }
        .assets-scroll-container::-webkit-scrollbar-thumb:hover {
          background: var(--glass-border);
        }

        .empty-assets-state {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .assets-compact-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .asset-list-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          background: var(--card-bg);
          position: relative;
          overflow: hidden;
        }

        .asset-list-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3.5px;
          background: transparent;
          transition: all 0.2s;
        }

        .asset-list-row.status-verde::before {
          background: var(--success);
        }
        .asset-list-row.status-amarillo::before {
          background: var(--warning);
        }
        .asset-list-row.status-rojo::before {
          background: var(--danger);
        }
        .asset-list-row.status-gris::before {
          background: #94a3b8;
        }

        .asset-list-row:hover {
          border-color: var(--accent);
          background: var(--page-bg-soft);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .asset-row-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
          cursor: pointer;
        }

        .asset-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .asset-info-col {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .asset-code-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .asset-code {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 850;
          color: var(--text-main);
        }

        .asset-type-badge {
          font-size: 8.5px;
          font-weight: 800;
          background: var(--alpha-04);
          color: var(--text-muted);
          padding: 0px 5px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .asset-name {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
          margin-top: 1px;
        }

        .asset-meta {
          font-size: 9.5px;
          color: var(--text-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .asset-row-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .semaforo-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .semaforo-dot {
          width: 4.5px;
          height: 4.5px;
          border-radius: 50%;
        }

        .btn-action-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: var(--card-bg);
          color: var(--text-dim);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.15s;
        }

        .btn-action-icon:hover {
          background: var(--alpha-02);
          color: var(--accent);
          border-color: var(--accent);
        }

        .btn-action-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Gráfico Circular */
        .chart-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          justify-content: center;
          min-height: 140px;
        }

        .chart-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-dim);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s;
        }

        .legend-item:hover {
          background: var(--alpha-04);
        }

        .legend-item-active {
          background: var(--alpha-04);
          font-weight: 800;
        }

        .legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .legend-val {
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 9.5px;
        }

        .donut-center-info {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .donut-pct {
          font-size: 20px;
          font-weight: 900;
          color: var(--text-main);
          line-height: 1;
        }
        .donut-lbl {
          font-size: 8px;
          font-weight: 800;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 2px;
        }

        .reset-chart-btn {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 8px;
          font-weight: 700;
          padding: 3px 6px;
          border-radius: 6px;
          background: var(--alpha-04);
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
        }
        .reset-chart-btn:hover {
          background: var(--alpha-08);
        }

        /* Timeline de Actividad */
        .activity-timeline-compact {
          display: flex;
          flex-direction: column;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 4px;
          gap: 4px;
        }

        .timeline-row-compact {
          display: flex;
          gap: 10px;
          cursor: pointer;
        }

        .timeline-left-icon {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .icon-pill {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .timeline-connector {
          width: 1px;
          background: rgba(15, 23, 42, 0.06);
          flex: 1;
          min-height: 20px;
          margin: 4px 0;
        }

        .timeline-row-compact:last-child .timeline-connector {
          display: none;
        }

        .timeline-info-block {
          flex: 1;
          padding-bottom: 10px;
          min-width: 0;
        }

        .timeline-header-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .timeline-title-code {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 850;
          color: var(--text-main);
        }

        .timeline-date {
          font-size: 8.5px;
          color: var(--text-muted);
        }

        .timeline-desc-name {
          font-size: 11.5px;
          font-weight: 750;
          color: var(--text-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .timeline-footer-line {
          display: flex;
          gap: 8px;
          font-size: 9.5px;
          color: var(--text-soft);
          align-items: center;
          margin-top: 2px;
        }

        .timeline-footer-line .var-val {
          background: rgba(15, 23, 42, 0.04);
          padding: 1px 4px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 9px;
        }

        .timeline-status-badge {
          margin-left: auto;
          font-weight: 850;
          font-size: 8.5px;
        }

        /* Spinner en botón */
        .mini-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top: 2px solid var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Modales */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .dashboard-modal-card {
          background: var(--card-bg);
          border-radius: 20px;
          border: 1px solid var(--glass-border);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dashboard-modal-card.mini {
          max-width: 380px;
        }

        @keyframes modalScaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--snow-2);
          background: var(--card-bg);
        }

        .avatar-header {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .modal-title-col {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .modal-asset-type {
          font-size: 8.5px;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--text-soft);
          letter-spacing: 0.05em;
        }

        .modal-title-col h3 {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.2;
        }

        .modal-asset-code {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: var(--text-soft);
          font-size: 20px;
          cursor: pointer;
          padding: 2px;
        }

        .modal-body-content {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-photo-section {
          width: 100%;
          height: 120px;
          background: rgba(15, 23, 42, 0.02);
          border-radius: 12px;
          border: 1px dashed rgba(15, 23, 42, 0.08);
          overflow: hidden;
          display: grid;
          place-items: center;
        }

        .modal-photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modal-no-photo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-soft);
        }

        .specs-table-compact {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--snow-2);
          border-radius: 10px;
          overflow: hidden;
        }

        .specs-row {
          display: flex;
          justify-content: space-between;
          padding: 6.5px 10px;
          font-size: 11.5px;
          border-bottom: 1px solid var(--snow-2);
          background: var(--card-bg);
          align-items: center;
        }

        .specs-row:last-child {
          border-bottom: none;
        }

        .spec-lbl {
          font-weight: 600;
          color: var(--text-muted);
        }

        .spec-val {
          color: var(--text-main);
          text-align: right;
        }

        .spec-val.font-bold {
          font-weight: 700;
        }

        .spec-val.mono-font {
          font-family: var(--font-mono);
        }

        .spec-textarea-display {
          background: var(--snow-1);
          border: 1px solid var(--snow-3);
          border-radius: 6px;
          padding: 8px;
          font-size: 11.5px;
          color: var(--text-dim);
          line-height: 1.4;
          min-height: 44px;
        }

        .badge-status-fill {
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 6.5px;
          border-radius: 5px;
          text-transform: uppercase;
        }

        .modal-actions-footer {
          background: var(--snow-1);
          padding: 10px 16px;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          border-top: 1px solid var(--snow-2);
        }

        .modal-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 32px;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          text-decoration: none;
        }

        .modal-btn-primary {
          background: var(--oxford-blue);
          color: var(--card-bg);
        }

        .modal-btn-primary:hover {
          background: var(--oxford-blue-light);
        }

        .modal-btn-secondary {
          background: var(--card-bg);
          border: 1px solid rgba(15, 23, 42, 0.08);
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
        }

        .modal-btn-secondary:hover {
          background: var(--alpha-02);
          border-color: rgba(15, 23, 42, 0.15);
          color: var(--accent-hover);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .kpi-glass-bar {
            flex-wrap: wrap;
            gap: 16px 8px;
          }
          .kpi-bar-divider {
            display: none;
          }
          .kpi-bar-item {
            flex: 1 1 40%;
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .kpi-glass-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .kpi-bar-item {
            flex: 1 1 100%;
          }
          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-dropdown {
            width: 100%;
          }
          .chart-wrapper {
            flex-direction: column;
          }
          .panel-card-header {
            flex-direction: column;
            gap: 8px;
          }
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  )
}

function logStatusColor(status: string) {
  if (status === 'APTO') return 'var(--success)'
  return 'var(--danger)'
}
