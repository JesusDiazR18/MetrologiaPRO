'use client'
import { useState, useEffect } from 'react'
import { 
  Settings, User, Bell, Shield, Mail, 
  Moon, Sun, Palette, Send, Eye, CheckCircle2, 
  AlertTriangle, RefreshCw, X, FileText, Calendar, ExternalLink 
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { toast } from 'react-hot-toast'

interface SmtpInfo {
  configured: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  targetEmails: string
  ccEmails: string
}

export default function ConfiguracionPage() {
  const { user, logout } = useAuth()
  const [smtpInfo, setSmtpInfo] = useState<SmtpInfo | null>(null)
  const [loadingSmtp, setLoadingSmtp] = useState(true)
  const [testingType, setTestingType] = useState<'alertas' | 'mensual' | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string>('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')

  useEffect(() => {
    fetchSmtpStatus()
  }, [])

  const fetchSmtpStatus = async () => {
    try {
      setLoadingSmtp(true)
      const res = await fetch('/api/cron/test')
      if (res.ok) {
        const data = await res.json()
        setSmtpInfo(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSmtp(false)
    }
  }

  const handleRunEmailTest = async (type: 'alertas' | 'mensual', sendLive: boolean = false) => {
    try {
      setTestingType(type)
      const toastId = toast.loading(sendLive ? 'Enviando correo de prueba...' : 'Generando reporte y previsualización...')

      const res = await fetch('/api/cron/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          recipientEmail: testRecipient || undefined,
          sendLive
        })
      })

      const data = await res.json()
      toast.dismiss(toastId)

      if (res.ok && data.success) {
        setPreviewHtml(data.html)
        setPreviewSubject(data.subject)
        setPreviewData(data.data)
        setShowPreviewModal(true)

        if (sendLive) {
          if (data.emailResult?.simulated) {
            toast.success('Simulación completada (sin credenciales SMTP en Vercel)')
          } else {
            toast.success('¡Correo enviado exitosamente!')
          }
        } else {
          toast.success('Previsualización generada correctamente')
        }
      } else {
        toast.error(data.error || 'Error al procesar el reporte')
      }
    } catch (e: any) {
      toast.error('Error de conexión con el servidor')
    } finally {
      setTestingType(null)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="page-header">
        <div className="page-header-icon" style={{ background: 'var(--oxford-blue)' }}>
          <Settings size={22} color="var(--cyan)" />
        </div>
        <div>
          <h1>Centro de Configuración y Notificaciones</h1>
          <p>Supervisión del sistema metrológico, servicios de correo y auditoría</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        
        {/* ========================================================================= */}
        {/* 1. CENTRO DE CORREOS Y NOTIFICACIONES AUTOMÁTICAS */}
        {/* ========================================================================= */}
        <div className="card" style={{ padding: 28, gridColumn: 'span 2' }}>
          <div className="section-title">
            <Mail size={20} color="var(--accent)" />
            <span>Sistema Automatizado de Correos y Cron Jobs</span>
            {smtpInfo?.configured ? (
              <span className="badge badge-apto" style={{ marginLeft: 'auto' }}>
                <CheckCircle2 size={12} style={{ marginRight: 4 }} /> SMTP Conectado
              </span>
            ) : (
              <span className="badge badge-amarillo" style={{ marginLeft: 'auto' }}>
                <AlertTriangle size={12} style={{ marginRight: 4 }} /> Modo Simulación
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4, marginBottom: 20 }}>
            El sistema ejecuta rutinas periódicas automatizadas y el balance mensual para alertar sobre vencimientos metrológicos y pendientes de calidad.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Alerta Periódica Card */}
            <div className="cron-info-card" style={{ borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
                  🔔 Alertas de Vencimiento
                </div>
                <span className="badge badge-equipo">Semanal / Diario</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.4, marginBottom: 12 }}>
                Identifica activos con vencimiento a $\le 30$ días, $\le 15$ días, $\le 7$ días, vencidos, patrones por calibrar y activos con protocolo de seguimiento activo.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-cyan btn-sm"
                  onClick={() => handleRunEmailTest('alertas', false)}
                  disabled={testingType !== null}
                >
                  <Eye size={13} /> {testingType === 'alertas' ? 'Generando...' : 'Previsualizar'}
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleRunEmailTest('alertas', true)}
                  disabled={testingType !== null}
                >
                  <Send size={13} /> Enviar Prueba
                </button>
              </div>
            </div>

            {/* Balance de Inicio de Mes Card */}
            <div className="cron-info-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
                  📅 Balance de Inicio de Mes
                </div>
                <span className="badge badge-apto">Día 1 de cada Mes</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.4, marginBottom: 12 }}>
                Balance consolidado al iniciar el mes con: <strong>1)</strong> Pendientes arrastrados del mes anterior, <strong>2)</strong> Plan de verificaciones del mes actual, y <strong>3)</strong> Patrones por calibrar.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-cyan btn-sm"
                  onClick={() => handleRunEmailTest('mensual', false)}
                  disabled={testingType !== null}
                >
                  <Eye size={13} /> {testingType === 'mensual' ? 'Generando...' : 'Previsualizar'}
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleRunEmailTest('mensual', true)}
                  disabled={testingType !== null}
                >
                  <Send size={13} /> Enviar Prueba
                </button>
              </div>
            </div>
          </div>

          {/* Configuración de Destinatarios */}
          <div style={{ background: 'var(--page-bg-soft)', padding: 18, borderRadius: 14, border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-main)', marginBottom: 10 }}>
              Destinatarios Oficiales Configurados:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--text-soft)', fontWeight: 600 }}>Para (Destinatarios):</span><br />
                <code style={{ fontSize: 11.5, color: 'var(--accent)' }}>{smtpInfo?.targetEmails || 'cmunizaga@polifusion.cl, vlutz@polifusion.cl'}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-soft)', fontWeight: 600 }}>CC (Copia Supervisión):</span><br />
                <code style={{ fontSize: 11.5, color: 'var(--accent)' }}>{smtpInfo?.ccEmails || 'jdiaz@polifusion.cl'}</code>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PERFIL DE USUARIO */}
        {/* ========================================================================= */}
        <div className="card" style={{ padding: 28 }}>
          <div className="section-title">
            <User size={18} color="var(--accent)" />
            <span>Perfil y Credenciales</span>
          </div>
          <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '20px 0' }}>
            <div className="avatar-big">
              {user?.nombre ? user.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'JD'}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>{user?.nombre || 'Jesus Diaz'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 700 }}>{user?.rol || 'Administrador'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{user?.email || 'jdiaz@polifusion.cl'}</div>
            </div>
          </div>
          
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
            <button 
              onClick={() => logout()}
              className="btn btn-outline" 
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', width: '100%', justifyContent: 'center' }}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. AUDITORÍA DEL SISTEMA */}
        {/* ========================================================================= */}
        <div className="card" style={{ padding: 28 }}>
          <div className="section-title">
            <Shield size={18} color="var(--accent)" />
            <span>Auditoría e Integridad</span>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Base de Datos</div>
              <div className="setting-desc">PostgreSQL en Supabase (Prisma ORM)</div>
            </div>
            <span className="badge badge-apto">Activa</span>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Generador de Reportes PDF</div>
              <div className="setting-desc">jsPDF Engine v2.5 con soporte QR y Multimagnitud</div>
            </div>
            <span className="badge badge-apto">Operativo</span>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Versión de Plataforma</div>
              <div className="setting-desc">QMS Metrología PRO</div>
            </div>
            <span className="badge badge-equipo">v1.0.0</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL DE PREVISUALIZACIÓN DE CORREO */}
      {/* ========================================================================= */}
      {showPreviewModal && previewHtml && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal email-preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 740, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  Previsualización de Correo HTML
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                  {previewSubject}
                </div>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="btn-close-modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: 12 }}>
              <iframe 
                srcDoc={previewHtml}
                title="Email Preview"
                style={{ width: '100%', height: '520px', border: 'none', borderRadius: 8 }}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPreviewModal(false)}>
                Cerrar
              </button>
              <button 
                className="btn btn-cyan btn-sm"
                onClick={() => handleRunEmailTest(testingType || 'alertas', true)}
              >
                <Send size={13} /> Enviar este Correo Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 8px;
        }
        .avatar-big {
          width: 54px;
          height: 54px;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #fff;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 800;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
          flex-shrink: 0;
        }
        .cron-info-card {
          background: var(--card-bg);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 18px;
          box-shadow: var(--shadow-sm);
        }
        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid var(--glass-border);
        }
        .setting-row:last-child {
          border-bottom: none;
        }
        .setting-label {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-main);
        }
        .setting-desc {
          font-size: 11.5px;
          color: var(--text-soft);
          margin-top: 2px;
        }
      `}</style>
    </div>
  )
}
