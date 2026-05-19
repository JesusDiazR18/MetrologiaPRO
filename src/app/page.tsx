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
  const [tipoFilter, setTipoFilter] = useState<string | null>(null) // null, 'EQUIPO', 'INSTRUMENTO', 'PATRON'

  // Modales de detalle
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  // Descarga individual loading states
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)

  async function loadAllData() {
    try {
      setLoading(true)
      setError(null)
      const [rStats, rEquipos, rPatrones] = await Promise.all([
        fetch('/api/estadisticas'),
        fetch('/api/equipos'),
        fetch('/api/patrones')
      ])

      if (!rStats.ok || !rEquipos.ok || !rPatrones.ok) {
        throw new Error('Error de comunicación con la base de datos central.')
      }

      const [dStats, dEquipos, dPatrones] = await Promise.all([
        rStats.json(),
        rEquipos.json(),
        rPatrones.json()
      ])

      setStats(dStats)
      setEquipos(dEquipos)
      setPatrones(dPatrones)
    } catch (err: any) {
      console.error('Error cargando panel:', err)
      setError(err.message || 'Error al conectar con el centro de datos metrológicos.')
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
        tipoActivo: e.Tipo || 'EQUIPO', // 'EQUIPO' o 'INSTRUMENTO'
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
        <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Sincronizando Sistema Metrológico Pro...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="empty-state" style={{ color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', padding: 32, borderRadius: 20, textAlign: 'center', maxWidth: 500, margin: '40px auto' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Anomalía de Sincronización</h2>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>{error || 'No se pudieron recuperar las estadísticas del sistema.'}</p>
        <button onClick={loadAllData} className="btn btn-primary" style={{ marginTop: 20, background: 'var(--danger)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 12, cursor: 'pointer' }}>Reintentar Sincronización</button>
      </div>
    )
  }

  return (
    <div className="dashboard-wrapper">
      {/* 1. Header del Dashboard */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-badge">
            <Sparkles size={12} color="var(--accent)" />
            <span>Centro de Operaciones Metrológicas</span>
          </div>
          <h1>Panel de Control</h1>
          <p className="subtitle">{formatFechaLarga(new Date())} · Todo en línea</p>
        </div>

        <div className="action-buttons-row">
          <button 
            className="btn-dashboard btn-primary-gradient" 
            onClick={() => generateExecutiveSummaryPDF(stats)}
          >
            <Download size={15} />
            <span>Generar Reporte PDF</span>
          </button>
          
          <Link href="/escaneo" className="btn-dashboard btn-secondary-outline">
            <Zap size={15} />
            <span>Escanear QR</span>
          </Link>

          <Link href="/equipos" className="btn-dashboard btn-ghost">
            <Plus size={15} />
            <span>Registrar Activo</span>
          </Link>
        </div>
      </div>

      {/* 2. KPIs Compactos */}
      <div className="kpis-container">
        {/* KPI 1 */}
        <div className="kpi-card" onClick={() => { setTipoFilter(null); setStatusFilter(null); }}>
          <div className="kpi-icon-wrapper" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <Activity size={18} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Activos Totales</span>
            <span className="kpi-val">{stats.totalActivos}</span>
            <span className="kpi-info-sub">Eq: {equipos.filter(e => e.Tipo === 'EQUIPO').length} · Ins: {equipos.filter(e => e.Tipo === 'INSTRUMENTO').length} · Pat: {patrones.length}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <ShieldCheck size={18} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Vigencia Global</span>
            <span className="kpi-val">{stats.complianceGlobal}%</span>
            <span className="kpi-info-sub">Activos en norma ISO 9001</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="kpi-card" onClick={() => setStatusFilter('ROJO')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <AlertTriangle size={18} className={stats.vencidos + stats.noAptos + stats.patronesVencidos > 0 ? 'pulse-alert' : ''} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Alertas Críticas</span>
            <span className="kpi-val" style={{ color: (stats.vencidos + stats.noAptos + stats.patronesVencidos) > 0 ? 'var(--danger)' : 'inherit' }}>
              {(stats.vencidos || 0) + (stats.noAptos || 0) + (stats.patronesVencidos || 0)}
            </span>
            <span className="kpi-info-sub">Acción metrológica urgente</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="kpi-card" onClick={() => setStatusFilter('AMARILLO')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Clock size={18} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Próximos Controles</span>
            <span className="kpi-val">{stats.proximos || 0}</span>
            <span className="kpi-info-sub">Control en los sig. 30 días</span>
          </div>
        </div>
      </div>

      {/* 3. Panel Principal */}
      <div className="dashboard-grid">
        
        {/* Lado Izquierdo: Explorador Inteligente de Activos (60% ancho) */}
        <div className="grid-left">
          <div className="panel-card">
            <div className="panel-card-header">
              <div>
                <h2>Explorador Inteligente de Activos</h2>
                <p className="card-subtitle">Filtra, busca y descarga reportes de calibración al instante</p>
              </div>
              <div className="panel-badge-count">
                {filteredAssets.length} de {allAssets.length}
              </div>
            </div>

            {/* Filtros e Input de búsqueda */}
            <div className="filters-section">
              <div className="search-bar-wrapper">
                <Search size={16} className="search-icon" />
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
                <span className="dot" /> Críticos / Fuera de Norma
              </button>

              {(statusFilter || searchQuery || tipoFilter) && (
                <button 
                  onClick={() => { setStatusFilter(null); setSearchQuery(''); setTipoFilter(null); }} 
                  className="btn-clear-filters"
                  title="Restaurar Filtros"
                >
                  <RotateCcw size={12} /> Limpiar
                </button>
              )}
            </div>

            {/* Lista de Activos */}
            <div className="assets-scroll-container">
              {filteredAssets.length === 0 ? (
                <div className="empty-assets-state">
                  <Info size={32} />
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
                            {isPat ? <FlaskConical size={15} /> : <Award size={15} />}
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
                            background: `${semColor}12`, 
                            color: semColor,
                            border: `1px solid ${semColor}20`
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
                              <Download size={14} />
                            )}
                          </button>

                          <button 
                            className="btn-action-icon"
                            onClick={() => setSelectedAsset(asset)}
                            title="Ver Ficha Técnica Interactiva"
                          >
                            <Eye size={14} />
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
          
          {/* Card Gráfico Circular */}
          <div className="panel-card compact">
            <div className="panel-card-header no-border">
              <div>
                <h2>Distribución del Parque</h2>
                <p className="card-subtitle">Haz clic en una sección para filtrar la lista</p>
              </div>
            </div>

            <div className="chart-wrapper">
              {mounted && pieData.length > 0 && (
                <div style={{ width: '100%', height: 160, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
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
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
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
              {stats.ultimasVerificaciones?.slice(0, 5).map((log) => {
                const statusColor = log.Resultado_Status === 'APTO' ? 'var(--success)' : 'var(--danger)'
                
                return (
                  <div key={log.ID_Log} className="timeline-row-compact" onClick={() => setSelectedLog(log)}>
                    <div className="timeline-left-icon">
                      <div className="icon-pill" style={{ 
                        background: log.Resultado_Status === 'APTO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: statusColor
                      }}>
                        {log.Resultado_Status === 'APTO' ? <CheckCircle size={12} /> : <XCircle size={12} />}
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
      {/* 4. MODAL DETALLE DE ACTIVO */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
          <div className="dashboard-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="avatar-header" style={{
                background: selectedAsset.categoria === 'patron' ? 'rgba(124, 58, 237, 0.1)' : 'var(--accent-glow)',
                color: selectedAsset.categoria === 'patron' ? '#7c3aed' : 'var(--accent)'
              }}>
                {selectedAsset.categoria === 'patron' ? <FlaskConical size={20} /> : <Award size={20} />}
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
                    <Info size={24} color="var(--text-soft)" />
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
                {pdfLoadingId === selectedAsset.id ? <div className="mini-spinner" /> : <Download size={14} />}
                <span>Descargar PDF</span>
              </button>
              
              <Link 
                href={selectedAsset.categoria === 'patron' ? `/patrones?q=${selectedAsset.codigo}` : `/equipos?q=${selectedAsset.codigo}`} 
                className="modal-btn modal-btn-secondary"
                onClick={() => setSelectedAsset(null)}
              >
                <ExternalLink size={14} />
                <span>Ir al Registro</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DETALLE DE MOVIMIENTO/LOG */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="dashboard-modal-card mini" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="avatar-header" style={{
                background: logStatusColor(selectedLog.Resultado_Status) + '15',
                color: logStatusColor(selectedLog.Resultado_Status)
              }}>
                {selectedLog.Resultado_Status === 'APTO' ? <CheckCircle size={20} /> : <XCircle size={20} />}
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
                <div className="specs-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '12px 0' }}>
                  <span className="spec-lbl">Observaciones del Informe</span>
                  <div className="spec-textarea-display">
                    {selectedLog.Observaciones || 'Sin observaciones o notas registradas para este control.'}
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
          padding: 12px 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .dashboard-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-glow);
          color: var(--accent);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid rgba(14, 165, 233, 0.15);
          margin-bottom: 8px;
        }

        .dashboard-header h1 {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--text-main);
          line-height: 1.1;
        }

        .dashboard-header .subtitle {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .action-buttons-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-dashboard {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          height: 40px;
          border: none;
        }

        .btn-primary-gradient {
          background: linear-gradient(135deg, var(--accent) 0%, #0284c7 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
        }

        .btn-primary-gradient:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(14, 165, 233, 0.35);
        }

        .btn-secondary-outline {
          background: #fff;
          border: 1px solid var(--snow-3);
          color: var(--text-main);
        }

        .btn-secondary-outline:hover {
          background: var(--snow-1);
          border-color: var(--snow-3);
        }

        .btn-ghost {
          background: var(--snow-2);
          color: var(--text-main);
        }

        .btn-ghost:hover {
          background: var(--snow-3);
        }

        /* KPIs */
        .kpis-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .kpi-card {
          background: #fff;
          border: 1px solid var(--snow-3);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--accent-glow);
        }

        .kpi-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .kpi-data {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .kpi-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .kpi-val {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 2px 0;
        }

        .kpi-info-sub {
          font-size: 10px;
          color: var(--text-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Dashboard Grid Layout */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
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
          background: #fff;
          border: 1px solid var(--snow-3);
          border-radius: 20px;
          box-shadow: var(--shadow-sm);
          padding: 20px;
          display: flex;
          flex-direction: column;
        }

        .panel-card.compact {
          padding: 16px;
        }

        .panel-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--snow-2);
          padding-bottom: 12px;
          margin-bottom: 14px;
        }

        .panel-card-header.no-border {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 8px;
        }

        .panel-card-header h2 {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }

        .card-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .panel-badge-count {
          background: var(--snow-2);
          font-size: 11px;
          font-weight: 800;
          color: var(--text-main);
          padding: 4px 10px;
          border-radius: 20px;
        }

        /* Seccion Filtros */
        .filters-section {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          align-items: center;
        }

        .search-bar-wrapper {
          position: relative;
          flex: 1;
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
          background: var(--snow-1);
          border: 1px solid var(--snow-3);
          border-radius: 12px;
          padding: 9px 12px 9px 36px;
          font-size: 13px;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s ease;
        }

        .search-bar-wrapper input:focus {
          background: #fff;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .filter-select-group {
          flex-shrink: 0;
        }

        .filter-dropdown {
          background: var(--snow-1);
          border: 1px solid var(--snow-3);
          border-radius: 12px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dim);
          outline: none;
          cursor: pointer;
        }

        .filter-dropdown:focus {
          border-color: var(--accent);
        }

        /* Pills de estado */
        .status-pills-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--snow-2);
          padding-bottom: 12px;
        }

        .status-pill {
          background: var(--snow-2);
          border: none;
          color: var(--text-dim);
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .status-pill:hover {
          background: var(--snow-3);
        }

        .status-pill.active {
          background: var(--nav-bg-accent);
          color: #fff;
        }

        .status-pill .dot {
          width: 6px;
          height: 6px;
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
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 8px;
        }

        .btn-clear-filters:hover {
          color: var(--text-main);
        }

        /* Lista de Activos */
        .assets-scroll-container {
          max-height: 380px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .assets-scroll-container::-webkit-scrollbar {
          width: 5px;
        }
        .assets-scroll-container::-webkit-scrollbar-thumb {
          background: var(--snow-3);
          border-radius: 10px;
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
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid var(--snow-2);
          transition: all 0.2s ease;
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
          gap: 12px;
          flex: 1;
          min-width: 0;
          cursor: pointer;
        }

        .asset-avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;
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
          font-size: 11px;
          font-weight: 800;
          color: var(--text-main);
        }

        .asset-type-badge {
          font-size: 9px;
          font-weight: 700;
          background: var(--snow-2);
          color: var(--text-muted);
          padding: 1px 5px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .asset-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .asset-meta {
          font-size: 10px;
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
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .semaforo-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .btn-action-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid var(--snow-3);
          background: #fff;
          color: var(--text-dim);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.2s;
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
          gap: 16px;
          justify-content: center;
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
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-dim);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .legend-item:hover {
          background: var(--snow-2);
        }

        .legend-item-active {
          background: var(--snow-2);
          font-weight: 800;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-val {
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .reset-chart-btn {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          background: var(--snow-2);
          border: none;
          color: var(--text-dim);
          cursor: pointer;
        }

        /* Timeline de Actividad */
        .activity-timeline-compact {
          display: flex;
          flex-direction: column;
          max-height: 280px;
          overflow-y: auto;
          padding-right: 2px;
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
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .timeline-connector {
          width: 1px;
          background: var(--snow-3);
          flex: 1;
          min-height: 20px;
          margin: 4px 0;
        }

        .timeline-row-compact:last-child .timeline-connector {
          display: none;
        }

        .timeline-info-block {
          flex: 1;
          padding-bottom: 12px;
          min-width: 0;
        }

        .timeline-header-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .timeline-title-code {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 800;
          color: var(--text-main);
        }

        .timeline-date {
          font-size: 9px;
          color: var(--text-muted);
        }

        .timeline-desc-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .timeline-footer-line {
          display: flex;
          gap: 8px;
          font-size: 10px;
          color: var(--text-soft);
          align-items: center;
          margin-top: 2px;
        }

        .timeline-footer-line .var-val {
          background: var(--snow-2);
          padding: 1px 4px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 9px;
        }

        .timeline-status-badge {
          margin-left: auto;
          font-weight: 800;
          font-size: 9px;
        }

        /* Pulsado de alerta */
        .pulse-alert {
          animation: pulse-red 1.8s infinite;
        }

        @keyframes pulse-red {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0.4)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.7)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0)); }
        }

        /* Spinner en botón */
        .mini-spinner {
          width: 12px;
          height: 12px;
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
          background: rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(8px);
          z-index: 1100;
          display: grid;
          place-items: center;
          padding: 16px;
        }

        .dashboard-modal-card {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          border: 1px solid var(--snow-3);
          overflow: hidden;
          animation: modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .dashboard-modal-card.mini {
          max-width: 440px;
        }

        @keyframes modalPop {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--snow-2);
        }

        .avatar-header {
          width: 40px;
          height: 40px;
          border-radius: 12px;
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
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--text-soft);
          letter-spacing: 0.05em;
        }

        .modal-title-col h3 {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.2;
        }

        .modal-asset-code {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: var(--text-soft);
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
        }

        .modal-body-content {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-photo-section {
          width: 100%;
          height: 150px;
          background: var(--snow-1);
          border-radius: 12px;
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
          gap: 6px;
          font-size: 11px;
          color: var(--text-soft);
        }

        .specs-table-compact {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--snow-2);
          border-radius: 12px;
          overflow: hidden;
        }

        .specs-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          font-size: 12px;
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
          border-radius: 8px;
          padding: 10px;
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.4;
          min-height: 60px;
        }

        .badge-status-fill {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .modal-actions-footer {
          background: var(--snow-1);
          padding: 12px 20px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          border-top: 1px solid var(--snow-2);
        }

        .modal-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          border: none;
          text-decoration: none;
        }

        .modal-btn-primary {
          background: var(--nav-bg);
          color: #fff;
        }

        .modal-btn-primary:hover {
          background: var(--nav-bg-accent);
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
          .kpis-container {
            grid-template-columns: repeat(2, 1fr);
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .dashboard-header {
            flex-direction: column;
            align-items: stretch;
          }
          .action-buttons-row {
            flex-direction: column;
            align-items: stretch;
          }
          .btn-dashboard {
            width: 100%;
            justify-content: center;
          }
          .kpis-container {
            grid-template-columns: 1fr;
            gap: 12px;
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
        }
      `}</style>
    </div>
  )
}

function logStatusColor(status: string) {
  if (status === 'APTO') return 'var(--success)'
  return 'var(--danger)'
}
