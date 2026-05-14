'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, CheckCircle, XCircle, AlertTriangle,
  Clock, FlaskConical, Activity, ArrowRight, TrendingUp,
  Zap, Database, Bell, ShieldCheck, AlertCircle, Download, FileText
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatFecha, semaforoHex, calcularSemaforo, formatFechaLarga } from '@/lib/metrologia'
import { generateExecutiveSummaryPDF } from '@/lib/reports'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadStats() {
    try {
      setLoading(true)
      setError(null)
      const r = await fetch('/api/estadisticas')
      
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}))
        throw new Error(errData.details || `Error del servidor (${r.status})`)
      }

      const data = await r.json()
      setStats(data)
    } catch (err: any) {
      console.error('Error loading stats:', err)
      setError(err.message || 'Error al conectar con el centro de datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <p>Sincronizando Sistema Metrológico Pro...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="empty-state" style={{ color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid var(--danger)' }}>
        <AlertCircle size={48} />
        <h2 style={{ marginTop: 16 }}>Anomalía en el Centro de Datos</h2>
        <p>{error}</p>
        <button onClick={loadStats} className="btn btn-primary" style={{ marginTop: 16 }}>Reintentar Sincronización</button>
      </div>
    )
  }

  const isEmpty = !stats || stats.total === 0

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-icon">
          <Zap size={22} color="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800 }}>Panel de Control Estratégico</h1>
          <p style={{ fontSize: 'var(--fs-body)' }}>{formatFechaLarga(new Date())} · Sistema Operativo al 100%</p>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button 
            className="btn btn-ghost" 
            style={{ border: '1px solid var(--snow-3)', gap: 8 }}
            onClick={() => stats && generateExecutiveSummaryPDF(stats)}
            disabled={!stats}
          >
            <Download size={16} /> Exportar Informe PDF
          </button>
          <div className="card-sm" style={{ padding: '8px 16px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={14} color="var(--accent)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>SYNC ONLINE</span>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <Activity size={48} />
          <p>Base de datos vacía. Por favor, reinicia el sistema para cargar los datos reales.</p>
        </div>
      ) : (
        <>
          {/* Top Row Stats */}
          <div className="kpi-grid" style={{ marginBottom: 32 }}>
            {[
              { label: 'Unidades Totales', value: stats.totalActivos, icon: Activity, color: 'var(--accent)', desc: 'Equipos + Patrones' },
              { label: 'Vigencia Sistema', value: `${stats.complianceGlobal}%`, icon: ShieldCheck, color: 'var(--success)', desc: 'Cumplimiento Total' },
              { label: 'Próximos Controles', value: stats.proximos, icon: Clock, color: 'var(--warning)', desc: 'Siguientes 30 días' },
              { label: 'Estado Crítico', value: stats.vencidos + stats.noAptos, icon: AlertCircle, color: 'var(--danger)', desc: 'Acción inmediata' }
            ].map((k, i) => (
              <div key={i} className="kpi-card-pro">
                <div className="kpi-content">
                  <div className="kpi-info">
                    <span className="kpi-label-pro">{k.label}</span>
                    <span className="kpi-value-pro">{k.value}</span>
                    <span className="kpi-desc-pro desktop-only">{k.desc}</span>
                  </div>
                  <div className="kpi-icon-pro" style={{ color: k.color, background: `${k.color}15` }}>
                    <k.icon size={24} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid-pro">
            {/* Main Visual Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #fff 0%, var(--snow-1) 100%)' }}>
                <div className="card-header" style={{ marginBottom: 24 }}>
                  <TrendingUp size={18} color="var(--accent)" />
                  <span className="card-title">Distribución Operativa de Activos</span>
                </div>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                  <div style={{ flex: '1 1 200px', height: 280, minWidth: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[
                          { name: 'Al día', value: stats.alDia },
                          { name: 'Advertencia', value: stats.proximos },
                          { name: 'Crítico', value: stats.vencidos + stats.noAptos },
                        ]} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                          <Cell fill="var(--success)" stroke="white" strokeWidth={2} />
                          <Cell fill="var(--warning)" stroke="white" strokeWidth={2} />
                          <Cell fill="var(--danger)" stroke="white" strokeWidth={2} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { label: 'Operativo / Al Día', val: stats.alDia, color: 'var(--success)', pct: Math.round(stats.alDia / (stats.total || 1) * 100) },
                      { label: 'Control Cercano', val: stats.proximos, color: 'var(--warning)', pct: Math.round(stats.proximos / (stats.total || 1) * 100) },
                      { label: 'Fuera de Norma', val: stats.vencidos + stats.noAptos, color: 'var(--danger)', pct: Math.round((stats.vencidos + stats.noAptos) / (stats.total || 1) * 100) }
                    ].map(it => (
                      <div key={it.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                          <span>{it.label}</span>
                          <span style={{ color: it.color }}>{it.pct}%</span>
                        </div>
                        <div className="mini-progress-bg">
                          <div className="mini-progress-bar" style={{ width: `${it.pct}%`, background: it.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PDF Reports Placeholder (Future Master Plan item) */}
              <div className="card" style={{ padding: 24, background: 'var(--page-bg-soft)', border: '1px dashed var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Bell size={20} color="var(--accent)" />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Reporte Ejecutivo Mensual</div>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Genera un resumen detallado de cumplimiento ISO 9001.</div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" disabled title="Próximamente">Exportar PDF</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Alertas Críticas */}
              {stats.alertasCriticas.length > 0 && (
                <div className="card" style={{ padding: 20, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div className="card-header" style={{ marginBottom: 16 }}>
                    <AlertTriangle size={18} color="var(--danger)" />
                    <span className="card-title" style={{ color: 'var(--danger)' }}>Alertas Críticas</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.alertasCriticas.map(a => (
                      <Link key={a.id} href={`/equipos?q=${a.codigo}`} className="alert-item-pro">
                        <div style={{ background: 'var(--danger)', width: 4, borderRadius: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{a.nombre}</div>
                          <div style={{ fontSize: 11, opacity: 0.7 }}>{a.codigo} · {a.area || 'Sin área'}</div>
                        </div>
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: 24 }}>
                <div className="card-header" style={{ marginBottom: 24 }}>
                  <Activity size={18} color="var(--accent)" />
                  <span className="card-title">Últimos Movimientos</span>
                </div>
                <div className="activity-feed-pro">
                  {stats.ultimasVerificaciones.slice(0, 6).map((h) => (
                    <div key={h.ID_Log} className="feed-item-pro">
                      <div className="feed-icon" style={{ 
                        background: h.Resultado_Status === 'APTO' ? 'var(--success-dim)' : 'var(--danger-dim)',
                        color: h.Resultado_Status === 'APTO' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {h.Resultado_Status === 'APTO' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </div>
                      <div className="feed-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{h.equipo.Nombre_Equipo}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{formatFecha(h.Fecha_Ejecucion)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                          {h.equipo.Codigo_Interno} · Ref: {h.Tecnico_Ejecutor.split(' ')[0]}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link href="/equipos" className="btn btn-full btn-ghost btn-sm" style={{ marginTop: 12 }}>
                    Ver Historial Completo <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .alert-item-pro {
          display: flex;
          gap: 12px;
          padding: 10px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid rgba(239, 68, 68, 0.1);
          color: var(--text-main);
          text-decoration: none;
          transition: all 0.2s;
        }
        .alert-item-pro:hover {
          transform: translateX(4px);
          border-color: var(--danger);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .kpi-card-pro {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid var(--snow-3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kpi-card-pro:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
          border-color: var(--accent-dim);
        }
        .kpi-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .kpi-info {
          display: flex;
          flex-direction: column;
        }
        .kpi-label-pro {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .kpi-value-pro {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-main);
          margin: 6px 0;
          letter-spacing: -0.02em;
        }
        .kpi-desc-pro {
          font-size: 11px;
          color: var(--text-muted);
        }
        .kpi-icon-pro {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          display: grid;
          place-items: center;
        }
        
        .dashboard-grid-pro {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }
        
        .mini-progress-bg {
          height: 6px;
          background: var(--snow-2);
          border-radius: 10px;
          overflow: hidden;
        }
        .mini-progress-bar {
          height: 100%;
          border-radius: 10px;
          transition: width 1s ease-out;
        }
        
        .activity-feed-pro {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .feed-item-pro {
          display: flex;
          gap: 16px;
          padding: 14px;
          border-radius: 16px;
          transition: background 0.2s;
          border: 1px solid transparent;
        }
        .feed-item-pro:hover {
          background: var(--page-bg-soft);
          border-color: var(--snow-3);
        }
        .feed-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .feed-content {
          flex: 1;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 1100px) {
          .dashboard-grid-pro {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .kpi-card-pro {
            padding: 16px;
          }
          .kpi-value-pro {
            font-size: 24px;
          }
          .kpi-label-pro {
            font-size: 11px;
          }
          .kpi-icon-pro {
            width: 40px;
            height: 40px;
          }
          .kpi-icon-pro svg {
            width: 18px;
            height: 18px;
          }
        }
        @media (max-width: 480px) {
           .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
