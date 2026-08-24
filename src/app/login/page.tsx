'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { 
  Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, 
  AlertCircle, Sun, Moon, Activity, Sparkles, QrCode
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  
  const { user, login, isAuthenticated, loading: authLoading } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  // Auto redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectUrl)
    }
  }, [authLoading, isAuthenticated, redirectUrl, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Por favor ingrese su usuario y contraseña')
      return
    }

    setLoading(true)
    setError('')

    const res = await login(username.trim(), password)

    if (res.success) {
      router.replace(redirectUrl)
    } else {
      setError(res.error || 'Credenciales inválidas. Verifique su usuario y contraseña.')
      setLoading(false)
    }
  }

  return (
    <div className="login-viewport">
      {/* Subtle Background Glow Elements */}
      <div className="ambient-glow glow-top" />
      <div className="ambient-glow glow-bottom" />

      {/* Top Header Controls */}
      <header className="login-top-bar">
        <div className="brand-badge-mini">
          <span className="brand-dot" />
          <span className="brand-status">Sistema Operativo</span>
        </div>

        <button 
          onClick={toggleTheme} 
          className="theme-toggle"
          title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          type="button"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      {/* Main Container */}
      <main className="login-stage">
        <div className="login-frame">
          
          {/* LEFT: Editorial Showcase / Brand Context (Desktop) */}
          <div className="frame-presentation">
            <div className="presentation-content">
              {/* Logo with Pure Transparent Background */}
              <div className="logo-wrapper">
                <img 
                  src="/logo.png" 
                  alt="Polifusion" 
                  className="brand-logo-img" 
                />
              </div>

              <div className="hero-copy">
                <span className="kicker-tag">CONTROL METROLÓGICO</span>
                <h1 className="hero-title">
                  Precisión, control <br />
                  <span className="serif-accent">y trazabilidad digital.</span>
                </h1>
                <p className="hero-text">
                  Gestión integral de equipos de ensayo, instrumentos de medición y patrones de referencia en planta y laboratorio.
                </p>
              </div>

              {/* Minimalist Feature Pillars */}
              <div className="feature-pillars">
                <div className="pillar-item">
                  <div className="pillar-dot" />
                  <div>
                    <h4>Trazabilidad QR Directa</h4>
                    <p>Fichas técnicas y procedimientos accesibles in-situ.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-dot" />
                  <div>
                    <h4>Semáforo & Vigilancia</h4>
                    <p>Monitoreo preventivo de vigencias y tolerancias.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-dot" />
                  <div>
                    <h4>Confirmación Metrológica</h4>
                    <p>Historiales auditables con firma digital del técnico.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="presentation-footer">
              <span>POLIFUSIÓN S.A.</span>
              <span className="version-tag">v1.0.0</span>
            </div>
          </div>

          {/* RIGHT: High-Precision Authentication Card */}
          <div className="frame-auth">
            <div className="auth-panel">
              {/* Mobile-only logo presentation */}
              <div className="mobile-brand-head">
                <img 
                  src="/logo.png" 
                  alt="Polifusion" 
                  className="mobile-brand-logo" 
                />
                <h2>Control Metrológico</h2>
                <p>Ingreso a la plataforma de gestión</p>
              </div>

              <div className="auth-panel-header">
                <div className="auth-badge">
                  <ShieldCheck size={14} />
                  <span>Acceso Institucional</span>
                </div>
                <h2 className="panel-title">Iniciar Sesión</h2>
                <p className="panel-subtitle">Ingrese sus credenciales autorizadas para continuar</p>
              </div>

              {error && (
                <div className="feedback-alert error">
                  <AlertCircle size={16} className="alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form-body">
                <div className="field-group">
                  <label htmlFor="username">Usuario o Correo</label>
                  <div className="field-control">
                    <User size={16} className="control-icon" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="Ej. jdiaz"
                      autoComplete="username"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <div className="field-label-row">
                    <label htmlFor="password">Contraseña</label>
                  </div>
                  <div className="field-control">
                    <Lock size={16} className="control-icon" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="eye-toggle"
                      tabIndex={-1}
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? (
                    <span className="submit-loading">
                      <span className="spinner-ring" />
                      <span>Validando credenciales...</span>
                    </span>
                  ) : (
                    <span className="submit-ready">
                      <span>Ingresar al Sistema</span>
                      <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>

              <div className="auth-panel-footer">
                <div className="secure-badge">
                  <Lock size={12} />
                  <span>Conexión segura y autenticada</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <style jsx>{`
        /* Claude-Inspired Minimalist Palette & Tokens */
        .login-viewport {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--page-bg, #0b0f19);
          color: var(--text-main, #f8fafc);
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          box-sizing: border-box;
        }

        /* Ambient Glow Layers */
        .ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.35;
        }

        .glow-top {
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(2, 132, 199, 0.28) 0%, transparent 70%);
          top: -180px;
          left: -100px;
        }

        .glow-bottom {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
          bottom: -160px;
          right: -100px;
        }

        /* Top Bar Controls */
        .login-top-bar {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          max-width: 1240px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .brand-badge-mini {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 100px;
          background: var(--card-bg, rgba(255, 255, 255, 0.04));
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
          backdrop-filter: blur(12px);
        }

        .brand-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .brand-status {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--text-dim, #94a3b8);
        }

        .theme-toggle {
          background: var(--card-bg, rgba(255, 255, 255, 0.06));
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
          color: var(--text-main, #f8fafc);
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .theme-toggle:hover {
          background: var(--page-bg-soft, rgba(255, 255, 255, 0.12));
          transform: translateY(-1px);
        }

        /* Main Stage */
        .login-stage {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px 36px;
        }

        .login-frame {
          width: 100%;
          max-width: 1060px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 56px;
          align-items: center;
        }

        /* LEFT PRESENTATION COLUMN */
        .frame-presentation {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          min-height: 480px;
          padding: 8px 0;
        }

        .presentation-content {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .logo-wrapper {
          display: inline-block;
          margin-bottom: 4px;
        }

        .brand-logo-img {
          height: 44px;
          width: auto;
          object-fit: contain;
          background: transparent;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.08));
        }

        [data-theme="dark"] .brand-logo-img {
          filter: drop-shadow(0 0 16px rgba(14, 165, 233, 0.25)) brightness(1.1);
        }

        .hero-copy {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .kicker-tag {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0284c7;
        }

        .hero-title {
          font-size: clamp(30px, 3.4vw, 42px);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--text-main, #ffffff);
          margin: 0;
        }

        .serif-accent {
          font-weight: 600;
          color: var(--text-dim, #94a3b8);
          font-style: normal;
        }

        .hero-text {
          font-size: 14.5px;
          color: var(--text-dim, #94a3b8);
          line-height: 1.55;
          margin: 0;
          max-width: 480px;
        }

        /* Feature Pillars */
        .feature-pillars {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 8px;
        }

        .pillar-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .pillar-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0284c7;
          margin-top: 6px;
          flex-shrink: 0;
        }

        .pillar-item h4 {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-main, #ffffff);
          margin: 0 0 2px;
        }

        .pillar-item p {
          font-size: 12.5px;
          color: var(--text-soft, #64748b);
          margin: 0;
          line-height: 1.35;
        }

        .presentation-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-soft, #64748b);
          border-top: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
          padding-top: 20px;
        }

        .version-tag {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          letter-spacing: 0.05em;
        }

        /* RIGHT AUTH PANEL */
        .frame-auth {
          display: flex;
          justify-content: center;
        }

        .auth-panel {
          width: 100%;
          max-width: 420px;
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
          border-radius: 28px;
          padding: 36px 32px;
          box-shadow: 
            0 24px 48px -12px rgba(0, 0, 0, 0.18),
            0 0 0 1px var(--glass-border, rgba(255, 255, 255, 0.06));
          backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          gap: 22px;
          box-sizing: border-box;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mobile-brand-head {
          display: none;
        }

        .auth-panel-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #0284c7;
          background: rgba(2, 132, 199, 0.08);
          border: 1px solid rgba(2, 132, 199, 0.2);
          padding: 3px 10px;
          border-radius: 100px;
          width: fit-content;
        }

        .panel-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .panel-subtitle {
          font-size: 13px;
          color: var(--text-dim, #64748b);
          margin: 0;
          line-height: 1.4;
        }

        /* Feedback Error */
        .feedback-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 600;
        }

        .feedback-alert.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        [data-theme="dark"] .feedback-alert.error {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
        }

        .alert-icon {
          flex-shrink: 0;
        }

        /* Form */
        .auth-form-body {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field-group label {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-main, #1e293b);
          letter-spacing: 0.01em;
        }

        .field-control {
          position: relative;
          display: flex;
          align-items: center;
        }

        .control-icon {
          position: absolute;
          left: 14px;
          color: var(--text-soft, #94a3b8);
          pointer-events: none;
          transition: color 0.2s;
        }

        .field-control input {
          width: 100%;
          height: 46px;
          padding: 0 44px 0 42px;
          border-radius: 14px;
          border: 1.5px solid var(--glass-border, #e2e8f0);
          background: var(--page-bg-soft, #f8fafc);
          color: var(--text-main, #0f172a);
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .field-control input:focus {
          border-color: #0284c7;
          background: var(--card-bg, #ffffff);
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
        }

        .field-control:focus-within .control-icon {
          color: #0284c7;
        }

        .eye-toggle {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-soft, #94a3b8);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .eye-toggle:hover {
          color: var(--text-main, #0f172a);
        }

        /* Submit Action */
        .auth-submit-btn {
          height: 48px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px -4px rgba(2, 132, 199, 0.4);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
        }

        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px -4px rgba(2, 132, 199, 0.55);
        }

        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .submit-ready {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .submit-loading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spinner-ring {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-panel-footer {
          display: flex;
          justify-content: center;
          margin-top: 2px;
        }

        .secure-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-soft, #64748b);
        }

        /* RESPONSIVE LAYOUT FOR MOBILE */
        @media (max-width: 900px) {
          .login-top-bar {
            padding: 16px 20px;
          }

          .login-frame {
            grid-template-columns: 1fr;
            max-width: 440px;
            gap: 0;
          }

          .frame-presentation {
            display: none;
          }

          .mobile-brand-head {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 4px;
            margin-bottom: 4px;
          }

          .mobile-brand-logo {
            height: 38px;
            width: auto;
            object-fit: contain;
            background: transparent;
            margin-bottom: 8px;
          }

          .mobile-brand-head h2 {
            font-size: 20px;
            font-weight: 800;
            color: var(--text-main, #0f172a);
            margin: 0;
          }

          .mobile-brand-head p {
            font-size: 12px;
            color: var(--text-dim, #64748b);
            margin: 0;
            font-weight: 500;
          }

          .auth-panel-header {
            display: none;
          }

          .auth-panel {
            padding: 28px 24px;
            border-radius: 24px;
          }
        }
      `}</style>
    </div>
  )
}
