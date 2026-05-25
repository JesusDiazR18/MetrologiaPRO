'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CalendarDays, ChevronLeft, ChevronRight, Filter, 
  Search, Info, Clock, CheckCircle2, AlertCircle 
} from 'lucide-react'
import Link from 'next/link'

import { calcularSemaforo, semaforoHex, formatFecha, diasRestantes } from '@/lib/metrologia'
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tipo: string
  Responsable: string | null
  Fecha_Proximo_Control: string | null
  Fecha_Ultima_Verificacion: string | null
  Estado: string
  Area_Asignada: string | null
  Requiere_Seguimiento?: boolean | null
  Periodicidad_Seguimiento?: number | null
}

export default function CalendarioPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'EQUIPO' | 'INSTRUMENTO'>('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/equipos').then(r => r.json()).then(data => {
      setEquipos(data)
      setLoading(false)
    })
  }, [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })

  const days: Date[] = []
  let d = calStart
  while (d <= monthEnd || days.length % 7 !== 0) {
    days.push(d)
    d = addDays(d, 1)
  }

  function equiposForDay(day: Date) {
    return equipos.filter(e => {
      const matchDate = e.Fecha_Proximo_Control && isSameDay(new Date(e.Fecha_Proximo_Control), day)
      const matchFilter = filter === 'ALL' || e.Tipo === filter
      const active = e.Estado !== 'OBSOLETO' && e.Estado !== 'FUERA_DE_SERVICIO' && e.Estado !== 'DE_BAJA_OBSOLETO'
      return matchDate && matchFilter && active
    })
  }

  // Generate seguimiento events based on Periodicidad_Seguimiento
  function seguimientoForDay(day: Date) {
    return equipos.filter(e => {
      if (!e.Requiere_Seguimiento || !e.Periodicidad_Seguimiento) return false
      if (e.Estado === 'OBSOLETO' || e.Estado === 'FUERA_DE_SERVICIO' || e.Estado === 'DE_BAJA_OBSOLETO') return false
      if (filter !== 'ALL' && e.Tipo !== filter) return false
      // Check if this day is a follow-up day based on the last verification date
      const baseDate = e.Fecha_Ultima_Verificacion ? new Date(e.Fecha_Ultima_Verificacion) : new Date()
      const d1 = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const d2 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
      const diffTime = d1.getTime() - d2.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays <= 0) return false
      return diffDays % e.Periodicidad_Seguimiento === 0
    })
  }

  const selectedEquipos = selected ? equiposForDay(selected) : []
  const selectedSeguimiento = selected ? seguimientoForDay(selected) : []
  
  const todayDate = new Date()
  todayDate.setHours(0,0,0,0)

  const monthLabels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  
  const upcomingEvents = equipos
    .filter(e => {
      const active = e.Estado !== 'OBSOLETO' && e.Estado !== 'FUERA_DE_SERVICIO'
      const matchFilter = filter === 'ALL' || e.Tipo === filter
      return active && matchFilter && e.Fecha_Proximo_Control && new Date(e.Fecha_Proximo_Control) >= todayDate
    })
    .sort((a, b) => new Date(a.Fecha_Proximo_Control!).getTime() - new Date(b.Fecha_Proximo_Control!).getTime())

  // Group events by date for sidebar

  const groupedEvents: Record<string, Equipo[]> = {};
  (selected ? selectedEquipos : upcomingEvents.slice(0, 3)).forEach(e => {
    const dateKey = e.Fecha_Proximo_Control ? format(new Date(e.Fecha_Proximo_Control), 'yyyy-MM-dd') : 'Sin Fecha';
    if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
    groupedEvents[dateKey].push(e);
  });

  // Calculate real compliance for the current month
  const monthEvents = equipos.filter(e => {
    return e.Fecha_Proximo_Control && isSameMonth(new Date(e.Fecha_Proximo_Control), currentMonth);
  });
  const totalInMonth = monthEvents.length;
  // Simulating "verified" as those that are not in RED status (just for display logic)
  const verifiedInMonth = monthEvents.filter(e => calcularSemaforo(e.Fecha_Proximo_Control) !== 'ROJO').length;
  const complianceRate = totalInMonth > 0 ? Math.round((verifiedInMonth / totalInMonth) * 100) : 100;




  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', padding: '0 20px' }}>


      <div className="calendar-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

        {/* Main Calendar View */}
        <div className="card" style={{ 
          padding: '16px', 
          background: '#ffffff', 
          borderRadius: 20,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f1f5f9'
        }}>
          <div className="calendar-header-controls" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20,
            padding: '8px 4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                width: 40,
                height: 40,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.3)'
              }}>
                <CalendarDays size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', textTransform: 'capitalize' }}>
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Gestión de Vencimientos</p>
              </div>
              <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', padding: 3, borderRadius: 10, marginLeft: 8 }}>
                <button className="btn-icon-sm" onClick={() => setCurrentMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><ChevronLeft size={16} /></button>
                <button className="btn-icon-sm" onClick={() => setCurrentMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><ChevronRight size={16} /></button>
              </div>
            </div>

            
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>CAL</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>VER</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>SEG</span>
                </div>
              </div>
              <div style={{ display: 'flex', background: '#f8fafc', padding: 3, borderRadius: 10 }}>
                {(['ALL', 'EQUIPO', 'INSTRUMENTO'] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{ 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: 8, 
                      fontSize: 12, 
                      fontWeight: 700,
                      background: filter === f ? '#fff' : 'transparent',
                      color: filter === f ? '#2563eb' : '#64748b',
                      boxShadow: filter === f ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {f === 'ALL' ? 'Todos' : f === 'EQUIPO' ? 'Equipos' : 'Ins.'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #f1f5f9' }}>
            {dayLabels.map(l => (
              <div key={l} style={{ 
                padding: '12px 0', 
                textAlign: 'center', 
                fontSize: 11, 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                color: '#94a3b8',
                letterSpacing: '0.05em'
              }}>{l}</div>
            ))}
            {days.map((day, i) => {
              const dayItems = equiposForDay(day)
              const muted = !isSameMonth(day, currentMonth)
              const today = isToday(day)
              const sel = selected && isSameDay(day, selected)
              
              return (
                <div
                  key={i}
                  onClick={() => setSelected(day)}
                  style={{
                    background: '#fff',
                    minHeight: 85,
                    padding: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    borderTop: '1px solid #f8fafc',
                    borderLeft: i % 7 !== 0 ? '1px solid #f8fafc' : 'none',
                    opacity: muted ? 0.2 : 1

                  }}
                  className="cal-day-box"
                >
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 700, 
                    color: today ? '#2563eb' : '#1e293b',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }} className="day-number">
                    {format(day, 'd')}
                    {today && <span className="today-badge" style={{ fontSize: 9, background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(37, 99, 235, 0.2)' }}>Hoy</span>}
                  </div>

                  <div className="day-dots" style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {dayItems.map(e => (
                      <div 
                        key={e.ID_Equipo} 
                        style={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          background: e.Tipo === 'EQUIPO' ? '#2563eb' : '#00e5ff',
                          boxShadow: `0 0 8px ${e.Tipo === 'EQUIPO' ? 'rgba(37, 99, 235, 0.4)' : 'rgba(0, 229, 255, 0.4)'}`
                        }} 
                      />
                    ))}
                    {seguimientoForDay(day).map(e => (
                      <div 
                        key={`seg-${e.ID_Equipo}`} 
                        title={`Seguimiento: ${e.Nombre_Equipo}`}
                        style={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          background: '#f59e0b',
                          boxShadow: '0 0 8px rgba(245,158,11,0.5)'
                        }} 
                      />
                    ))}
                  </div>
                  {dayItems.length > 0 && sel && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      height: 3, 
                      background: '#2563eb',
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar: Upcoming Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: 8, borderRadius: 10 }}>
                <Clock size={18} color="#2563eb" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                Próximas Tareas {selected && `(${format(selected, 'd MMM')})`}
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.keys(groupedEvents).length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', borderRadius: 16, color: '#94a3b8' }}>
                  <Info size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: 13 }}>No hay tareas para mostrar</p>
                </div>
              ) : (
                Object.entries(groupedEvents).map(([date, items]) => (
                  <div key={date} style={{ marginBottom: 8 }}>
                    {!selected && (
                      <div style={{ 
                        fontSize: 10, 
                        fontWeight: 800, 
                        color: '#94a3b8', 
                        textTransform: 'uppercase', 
                        padding: '4px 8px',
                        letterSpacing: '0.05em'
                      }}>
                        {isToday(new Date(date)) ? 'Hoy' : isSameDay(new Date(date), addDays(new Date(), 1)) ? 'Mañana' : format(new Date(date), 'd MMMM', { locale: es })}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {items.map(e => {
                        const s = calcularSemaforo(e.Fecha_Proximo_Control)
                        const isCalibration = e.Tipo === 'EQUIPO'
                        return (
                          <Link 
                            key={e.ID_Equipo} 
                            href={`/equipos?q=${encodeURIComponent(e.ID_Equipo)}`}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <div style={{ 
                              padding: '12px 14px', 
                              borderRadius: 14, 
                              background: '#fff', 
                              border: '1px solid #f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              transition: 'all 0.2s',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden'
                            }} className="task-item-compact">
                              <div style={{ 
                                width: 3, 
                                height: '100%', 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                background: isCalibration ? '#00e5ff' : '#2563eb' 
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.Nombre_Equipo}</h4>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: semaforoHex(s) }}>{diasRestantes(e.Fecha_Proximo_Control)}</span>
                                </div>
                                <p style={{ fontSize: 11, color: '#64748b' }}>ID: {e.ID_Equipo}</p>
                              </div>
                              <ChevronRight size={14} color="#cbd5e1" />
                            </div>
                          </Link>
                        )

                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>


          {/* Monthly Status Card */}
          <div style={{ 
            padding: '24px', 
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
            borderRadius: 20, 
            color: '#fff',
            boxShadow: '0 15px 20px -5px rgba(37, 99, 235, 0.2)',
            marginTop: 'auto'
          }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, opacity: 0.9 }}>Estado Mensual</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 32, fontWeight: 900 }}>{complianceRate}%</span>
                <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>Cumplimiento</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{verifiedInMonth}/{totalInMonth}</span>
                <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>En Regla</p>
              </div>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${complianceRate}%`, height: '100%', background: '#fff', borderRadius: 3, transition: 'width 1s ease-out' }} />
            </div>

          </div>

        </div>
      </div>

      <style jsx global>{`
        .cal-day-box:hover {
          background: #f8fafc !important;
          transform: scale(1.02);
          z-index: 10;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .task-item-compact:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.08);
          border-color: #2563eb;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1200px) {
          .calendar-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .calendar-header-controls {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 16px;
          }
          .cal-day-box {
            min-height: 50px !important;
            padding: 4px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .day-number {
            margin-bottom: 0 !important;
            font-size: 13px !important;
          }
          .today-badge, .day-dots {
            display: none !important;
          }
          .calendar-main-grid {
            gap: 16px !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }
          .card {
            padding: 8px !important;
            border-radius: 12px !important;
          }
          h2 { font-size: 15px !important; }
        }
      `}</style>
    </div>
  )
}
