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
    equipo: { Nombre_Equipo: string; Codigo_Interno: string }
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

  // Modales de detalle
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  // Descarga individual loading states
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)

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

  // Filtrar activos según criterios de búsqueda y selección del gráfico
  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ? true : (
        asset.nombre?.toLowerCase().includes(q) ||
        asset.codigo?.toLowerCase().includes(q) ||
        asset.Responsable?.toLowerCase().includes(q) ||
        asset.Marca?.toLowerCase().includes(q) ||
        asset.Modelo?.toLowerCase().includes(q)
      )

      const matchesStatus = !statusFilter ? true : asset.status === statusFilter
      
      const matchesTipo = !tipoFilter ? true : (
        tipoFilter === 'PATRON' ? asset.categoria === 'patron' : asset.tipoActivo === tipoFilter
      )

      return matchesSearch && matchesStatus && matchesTipo
    })
  }, [allAssets, searchQuery, statusFilter, tipoFilter])

  // Datos para gráfico circular interactivo
  const pieData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Al día', value: stats.alDia || 0, color: 'var(--success)', status: 'VERDE' },
      { name: 'Advertencia', value: stats.proximos || 0, color: 'var(--warning)', status: 'AMARILLO' },
      { name: 'Crítico', value: (stats.vencidos || 0) + (stats.noAptos || 0) + (stats.patronesVencidos || 0), color: 'var(--danger)', status: 'ROJO' }
    ]
  }, [stats])

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
        <div className="kpi-bar-item clickable" onClick={() => { setTipoFilter(null); setStatusFilter(null); }}>
          <div className="kpi-meta">
            <span className="kpi-dot bg-blue" />
            <span className="kpi-bar-label">Activos Totales</span>
          </div>
          <div className="kpi-bar-value-row">
            <span className="kpi-bar-val">{stats.totalActivos}</span>
            <span className="kpi-bar-sub">Eq: {equipos.filter(e => e.Tipo === 'EQUIPO').length} · Ins: {equipos.filter(e => e.Tipo === 'INSTRUMENTO').length} · Pat: {patrones.length}</span>
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
            <span className="kpi-bar-val">{stats.complianceGlobal}%</span>
            <span className="kpi-bar-sub">Conformidad ISO 9001</span>
          </div>
        </div>

        <div className="kpi-bar-divider" />

        {/* KPI 3 */}
        <div className="kpi-bar-item clickable" onClick={() => setStatusFilter('ROJO')}>
          <div className="kpi-meta">
            <span className="kpi-dot bg-red blinking" />
            <span className="kpi-bar-label" style={{ color: (stats.vencidos + stats.noAptos + stats.patronesVencidos) > 0 ? 'var(--danger)' : 'inherit' }}>Alertas Críticas</span>
          </div>
          <div className="kpi-bar-value-row">
            <span className="kpi-bar-val" style={{ color: (stats.vencidos + stats.noAptos + stats.patronesVencidos) > 0 ? 'var(--danger)' : 'inherit' }}>
              {(stats.vencidos || 0) + (stats.noAptos || 0) + (stats.patronesVencidos || 0)}
            </span>
            <span className="kpi-bar-sub">Requieren acción inmediata</span>
          </div>
        </div>

        <div className="kpi-bar-divider" />

        {/* KPI 4 */}
        <div className="kpi-bar-item clickable" onClick={() => setStatusFilter('AMARILLO')}>
          <div className="kpi-meta">
            <span className="kpi-dot bg-yellow" />
            <span className="kpi-bar-label">Por Vencer</span>
          </div>
          <div className="kpi-bar-value-row">
            <span className="kpi-bar-val">{stats.proximos || 0}</span>
            <span className="kpi-bar-sub">Control sig. 30 días</span>
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
                  onClick={() => generateExecutiveSummaryPDF(stats)}
                  title="Generar Reporte Ejecutivo General en PDF"
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
                <span className="dot" /> Por Vencer
              </button>
              <button 
                onClick={() => setStatusFilter('ROJO')} 
                className={`status-pill pill-red ${statusFilter === 'ROJO' ? 'active' : ''}`}
              >
                <span className="dot" /> Críticos
              </button>

              {(statusFilter || searchQuery || tipoFilter) && (
                <button 
                  onClick={() => { setStatusFilter(null); setSearchQuery(''); setTipoFilter(null); }} 
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
                      <div key={asset.id} className="asset-list-row">
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
                            {asset.status === 'VERDE' ? 'Al día' : asset.status === 'AMARILLO' ? 'Por vencer' : 'Crítico'}
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
                <div style={{ width: '100%', height: 140, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={(data) => {
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Cumplimiento en el centro del Donut */}
                  <div className="donut-center-info">
                    <span className="donut-pct">{stats.complianceGlobal}%</span>
                    <span className="donut-lbl">Vigente</span>
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
              {stats.ultimasVerificaciones?.slice(0, 4).map((log) => {
                const statusColor = log.Resultado_Status === 'APTO' ? 'var(--success)' : 'var(--danger)'
                
                return (
                  <div key={log.ID_Log} className="timeline-row-compact" onClick={() => setSelectedLog(log)}>
                    <div className="timeline-left-icon">
                      <div className="icon-pill" style={{ 
                        background: log.Resultado_Status === 'APTO' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        color: statusColor
                      }}>
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
              })}
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
                      background: selectedAsset.status === 'VERDE' ? 'rgba(16, 185, 129, 0.1)' : selectedAsset.status === 'AMARILLO' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: selectedAsset.status === 'VERDE' ? 'var(--success)' : selectedAsset.status === 'AMARILLO' ? 'var(--warning)' : 'var(--danger)',
                    }}>
                      {selectedAsset.status === 'VERDE' ? 'Operativo' : selectedAsset.status === 'AMARILLO' ? 'Por Vencer' : 'Crítico'}
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
                  <span className="spec-lbl">Técnico Ejecutor</span>
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
          padding: 8px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 1. KPIs Ribbon - Glass & Ultra-Compact */
        .kpi-glass-bar {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--snow-3);
          border-radius: 14px;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
          gap: 12px;
        }

        .kpi-bar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .kpi-bar-item.clickable {
          cursor: pointer;
          transition: all 0.2s;
        }
        .kpi-bar-item.clickable:hover {
          opacity: 0.8;
          transform: translateY(-0.5px);
        }

        .kpi-icon-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .kpi-blue-dot { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
        .kpi-green-dot { background: var(--success); box-shadow: 0 0 6px var(--success); }
        .kpi-red-dot { background: var(--danger); box-shadow: 0 0 6px var(--danger); }
        .kpi-yellow-dot { background: var(--warning); box-shadow: 0 0 6px var(--warning); }

        .kpi-text-container {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .kpi-bar-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.1;
        }

        .kpi-bar-value-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 1px;
        }

        .kpi-bar-val {
          font-size: 18px;
          font-weight: 850;
          color: var(--text-main);
          letter-spacing: -0.02em;
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
          height: 24px;
          background: var(--snow-3);
          flex-shrink: 0;
        }

        .blinking {
          animation: blinker 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes blinker {
          50% { opacity: 0.3; }
        }

        /* 2. Dashboard Grid Layout */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.62fr 1fr;
          gap: 16px;
          align-items: start;
        }

        .grid-left {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .grid-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Panel Card */
        .panel-card {
          background: #fff;
          border: 1px solid var(--snow-3);
          border-radius: 16px;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.03);
          padding: 16px;
          display: flex;
          flex-direction: column;
        }

        .panel-card.compact {
          padding: 14px;
        }

        .panel-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--snow-2);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }

        .panel-card-header.no-border {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 6px;
        }

        .panel-card-header h2 {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }

        .card-subtitle {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .panel-badge-count {
          background: var(--snow-2);
          font-size: 10px;
          font-weight: 800;
          color: var(--text-main);
          padding: 2px 8px;
          border-radius: 20px;
        }

        .btn-compact-pdf {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0f172a;
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-compact-pdf:hover {
          background: #1e293b;
          transform: translateY(-0.5px);
        }

        /* Seccion Filtros */
        .filters-section {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          align-items: center;
        }

        .search-bar-wrapper {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-soft);
        }

        .search-bar-wrapper input {
          width: 100%;
          background: var(--snow-1);
          border: 1px solid var(--snow-3);
          border-radius: 10px;
          padding: 7px 10px 7px 30px;
          font-size: 12.5px;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s ease;
        }

        .search-bar-wrapper input:focus {
          background: #fff;
          border-color: var(--accent);
          box-shadow: 0 0 0 2.5px var(--accent-glow);
        }

        .filter-select-group {
          flex-shrink: 0;
        }

        .filter-dropdown {
          background: var(--snow-1);
          border: 1px solid var(--snow-3);
          border-radius: 10px;
          padding: 6.5px 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dim);
          outline: none;
          cursor: pointer;
        }

        /* Pills de estado */
        .status-pills-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--snow-2);
          padding-bottom: 10px;
        }

        .status-pill {
          background: var(--snow-2);
          border: none;
          color: var(--text-dim);
          font-size: 10px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
        }

        .status-pill:hover {
          background: var(--snow-3);
        }

        .status-pill.active {
          background: #0f172a;
          color: #fff;
        }

        .status-pill .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .pill-green .dot { background: var(--success); }
        .pill-yellow .dot { background: var(--warning); }
        .pill-red .dot { background: var(--danger); }

        .pill-green.active { background: var(--success); color: #fff; }
        .pill-yellow.active { background: var(--warning); color: #fff; }
        .pill-red.active { background: var(--danger); color: #fff; }

        .btn-clear-filters {
          background: none;
          border: none;
          color: var(--text-soft);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 6px;
        }

        .btn-clear-filters:hover {
          color: var(--text-main);
        }

        /* Lista de Activos */
        .assets-scroll-container {
          max-height: 330px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .assets-scroll-container::-webkit-scrollbar {
          width: 4px;
        }
        .assets-scroll-container::-webkit-scrollbar-thumb {
          background: var(--snow-3);
          border-radius: 10px;
        }

        .empty-assets-state {
          padding: 30px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .assets-compact-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .asset-list-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid var(--snow-2);
          transition: all 0.15s ease;
          background: #fff;
        }

        .asset-list-row:hover {
          border-color: var(--snow-3);
          background: var(--snow-1);
          transform: translateX(1px);
        }

        .asset-row-main {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
          cursor: pointer;
        }

        .asset-avatar {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
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
          font-weight: 800;
          color: var(--text-main);
        }

        .asset-type-badge {
          font-size: 8.5px;
          font-weight: 700;
          background: var(--snow-2);
          color: var(--text-muted);
          padding: 0px 4px;
          border-radius: 3px;
          text-transform: uppercase;
        }

        .asset-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
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
          gap: 6px;
          flex-shrink: 0;
        }

        .semaforo-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 700;
          padding: 2.5px 6.5px;
          border-radius: 5px;
        }

        .semaforo-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }

        .btn-action-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid var(--snow-3);
          background: #fff;
          color: var(--text-dim);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.15s;
        }

        .btn-action-icon:hover {
          background: var(--snow-1);
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
          gap: 12px;
          justify-content: center;
        }

        .chart-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-dim);
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 5px;
          transition: background 0.15s;
        }

        .legend-item:hover {
          background: var(--snow-2);
        }

        .legend-item-active {
          background: var(--snow-2);
          font-weight: 800;
        }

        .legend-dot {
          width: 6.5px;
          height: 6.5px;
          border-radius: 50%;
        }

        .legend-val {
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .donut-center-info {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .donut-pct {
          font-size: 18px;
          font-weight: 850;
          color: var(--text-main);
          line-height: 1;
        }
        .donut-lbl {
          font-size: 8px;
          font-weight: 700;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 1px;
        }

        .reset-chart-btn {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 8px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 5px;
          background: var(--snow-2);
          border: none;
          color: var(--text-dim);
          cursor: pointer;
        }

        /* Timeline de Actividad */
        .activity-timeline-compact {
          display: flex;
          flex-direction: column;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 2px;
          gap: 2px;
        }

        .timeline-row-compact {
          display: flex;
          gap: 8px;
          cursor: pointer;
        }

        .timeline-left-icon {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .icon-pill {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .timeline-connector {
          width: 1px;
          background: var(--snow-3);
          flex: 1;
          min-height: 16px;
          margin: 3px 0;
        }

        .timeline-row-compact:last-child .timeline-connector {
          display: none;
        }

        .timeline-info-block {
          flex: 1;
          padding-bottom: 8px;
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
          font-size: 11px;
          font-weight: 700;
          color: var(--text-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .timeline-footer-line {
          display: flex;
          gap: 6px;
          font-size: 9.5px;
          color: var(--text-soft);
          align-items: center;
          margin-top: 1px;
        }

        .timeline-footer-line .var-val {
          background: var(--snow-2);
          padding: 0.5px 3px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 8.5px;
        }

        .timeline-status-badge {
          margin-left: auto;
          font-weight: 800;
          font-size: 8.5px;
        }

        /* Spinner en botón */
        .mini-spinner {
          width: 10px;
          height: 10px;
          border: 2px solid #ccc;
          border-top: 2px solid var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Modales */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.3);
          backdrop-filter: blur(6px);
          z-index: 1100;
          display: grid;
          place-items: center;
          padding: 16px;
        }

        .dashboard-modal-card {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          border: 1px solid var(--snow-3);
          overflow: hidden;
          animation: modalPop 0.2s ease-out;
        }

        .dashboard-modal-card.mini {
          max-width: 400px;
        }

        @keyframes modalPop {
          from { transform: scale(0.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--snow-2);
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
          height: 130px;
          background: var(--snow-1);
          border-radius: 10px;
          border: 1px dashed var(--snow-3);
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
          background: #fff;
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
          background: #0f172a;
          color: #fff;
        }

        .modal-btn-primary:hover {
          background: #1e293b;
        }

        .modal-btn-secondary {
          background: #fff;
          border: 1px solid var(--snow-3);
          color: var(--text-main);
        }

        .modal-btn-secondary:hover {
          background: var(--snow-2);
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
