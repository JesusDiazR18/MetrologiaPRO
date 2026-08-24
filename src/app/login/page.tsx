'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { 
  Lock, User, Eye, EyeOff, LogIn, ShieldCheck, 
  AlertCircle, QrCode, Activity, Sparkles, Sun, Moon,
  ArrowRight, CheckCircle2
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
      setError('Por favor complete su usuario y contraseña')
      return
    }

    setLoading(true)
    setError('')

    const res = await login(username.trim(), password)

    if (res.success) {
      router.replace(redirectUrl)
    } else {
      setError(res.error || 'Usuario o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* Background ambient orbs */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      {/* Top Header Controls */}
      <header className="login-top-nav">
        <div className="status-live-pill">
          <span className="live-dot" />
          <span>Sistema Operativo & Conectado</span>
        </div>

        <button 
          onClick={toggleTheme} 
          className="theme-switch-btn"
          title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          type="button"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <div className="login-wrapper">
        {/* LEFT COLUMN: Rich Enterprise Presentation Hero (Desktop) */}
        <div className="hero-column">
          <div className="hero-brand-header">
            <div className="hero-logo-box">
              <img src="/logo.png" alt="Polifusion" className="hero-logo" />
            </div>
          </div>

          <div className="hero-text-block">
            <h1 className="hero-headline">
              Control <span className="gradient-text">Metrológico</span>
            </h1>
            <p className="hero-description">
              Plataforma digital centralizada para el aseguramiento, calibración y trazabilidad técnica de equipos, instrumentos y patrones de referencia.
            </p>
          </div>

          {/* Eye-catching Feature Highlights Cards with Colorful Icons */}
          <div className="hero-features-list">
            <div className="feature-pill-card">
              <div className="feature-icon-circle blue">
                <QrCode size={22} />
              </div>
              <div className="feature-text">
                <h4>Trazabilidad QR In-Situ</h4>
                <p>Acceso instantáneo a fichas técnicas y procedimientos desde cualquier dispositivo móvil.</p>
              </div>
            </div>

            <div className="feature-pill-card">
              <div className="feature-icon-circle amber">
                <Activity size={22} />
              </div>
              <div className="feature-text">
                <h4>Semáforo Inteligente & KPIs</h4>
                <p>Monitoreo preventivo continuo de vencimientos y alertas de calibración en tiempo real.</p>
              </div>
            </div>

            <div className="feature-pill-card">
              <div className="feature-icon-circle green">
                <ShieldCheck size={22} />
              </div>
              <div className="feature-text">
                <h4>Confirmación Metrológica Segura</h4>
                <p>Registro autenticado con firma digital y contraste de patrones de alta exactitud.</p>
              </div>
            </div>
          </div>

          <div className="hero-footer-meta">
            <span>POLIFUSIÓN S.A. • Gestión de Calidad</span>
            <span className="version-pill">v1.0.0</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Modern Glassmorphic Login Card */}
        <div className="form-column">
          <div className="auth-card">
            {/* Mobile Header (Shown on mobile screens) */}
            <div className="mobile-header">
              <div className="mobile-logo-box">
                <img src="/logo.png" alt="Polifusion" className="mobile-logo" />
              </div>
              <h2 className="mobile-title">Control Metrológico</h2>
              <p className="mobile-sub">Aseguramiento y Trazabilidad Digital</p>
            </div>

            <div className="card-header-desktop">
              <div className="card-badge">
                <ShieldCheck size={15} />
                <span>Acceso Restringido</span>
              </div>
              <h2 className="card-title">Iniciar Sesión</h2>
              <p className="card-subtitle">Ingrese sus credenciales de usuario para ingresar al sistema</p>
            </div>

            {error && (
              <div className="error-alert">
                <AlertCircle size={18} className="error-icon" />
                <div className="error-content">
                  <strong>Error de autenticación</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="username">Usuario o Correo Institucional</label>
                <div className="input-field-wrapper">
                  <User size={18} className="field-icon" />
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

              <div className="input-group">
                <div className="label-row">
                  <label htmlFor="password">Contraseña</label>
                </div>
                <div className="input-field-wrapper">
                  <Lock size={18} className="field-icon" />
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
                    className="toggle-pass-btn"
                    tabIndex={-1}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="submit-btn"
              >
                {loading ? (
                  <div className="btn-loading">
                    <span className="spinner" />
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  <div className="btn-label">
                    <span>Ingresar al Sistema</span>
                    <LogIn size={18} />
                  </div>
                )}
              </button>
            </form>

            <div className="card-footer-info">
              <div className="security-notice">
                <ShieldCheck size={14} color="#0284c7" />
                <span>Sesión cifrada con control de acceso institucional</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--page-bg, #090e1c);
          position: relative;
          overflow-x: hidden;
          padding: 16px 24px 32px;
          box-sizing: border-box;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* Ambient glowing orbs */
        .bg-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(110px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.45;
        }

        .bg-glow-1 {
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.28) 0%, rgba(37, 99, 235, 0.08) 70%);
          top: -220px;
          left: -120px;
        }

        .bg-glow-2 {
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(14, 165, 233, 0.05) 70%);
          bottom: -180px;
          right: -120px;
        }

        .bg-glow-3 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
          top: 35%;
          left: 40%;
        }

        /* Top Nav Bar */
        .login-top-nav {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1140px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0 20px;
        }

        .status-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.28);
          color: #10b981;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulseDot 2s infinite;
        }

        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
        }

        .theme-switch-btn {
          background: var(--card-bg, rgba(255, 255, 255, 0.8));
          border: 1.5px solid var(--glass-border, rgba(255, 255, 255, 0.15));
          color: var(--text-main, #0f172a);
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(16px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .theme-switch-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        /* Container Layout */
        .login-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1140px;
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          gap: 48px;
          align-items: center;
          margin: auto 0;
        }

        /* HERO COLUMN (LEFT) */
        .hero-column {
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding-right: 16px;
        }

        .hero-brand-header {
          display: flex;
          align-items: center;
        }

        /* Transparent Clean Logo Wrapper */
        .hero-logo-box {
          display: inline-block;
          background: transparent;
        }

        .hero-logo {
          height: 46px;
          width: auto;
          display: block;
          object-fit: contain;
          background: transparent;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.06));
        }

        [data-theme="dark"] .hero-logo {
          filter: drop-shadow(0 0 16px rgba(14, 165, 233, 0.35)) brightness(1.1);
        }

        .hero-text-block {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hero-headline {
          font-size: clamp(34px, 4.2vw, 48px);
          font-weight: 900;
          color: var(--text-main, #ffffff);
          line-height: 1.08;
          letter-spacing: -0.035em;
          margin: 0;
        }

        .gradient-text {
          background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-description {
          font-size: 15px;
          color: var(--text-dim, #94a3b8);
          line-height: 1.55;
          margin: 0;
          max-width: 520px;
          font-weight: 500;
        }

        /* Colorful Feature Cards */
        .hero-features-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .feature-pill-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 20px;
          background: var(--card-bg, rgba(255, 255, 255, 0.05));
          border: 1.5px solid var(--glass-border, rgba(255, 255, 255, 0.1));
          backdrop-filter: blur(14px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .feature-pill-card:hover {
          transform: translateX(6px);
          border-color: rgba(14, 165, 233, 0.4);
          background: var(--card-bg, rgba(255, 255, 255, 0.09));
          box-shadow: 0 8px 24px rgba(14, 165, 233, 0.12);
        }

        .feature-icon-circle {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-icon-circle.blue {
          background: rgba(14, 165, 233, 0.15);
          color: #0ea5e9;
          box-shadow: 0 0 14px rgba(14, 165, 233, 0.2);
        }

        .feature-icon-circle.amber {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.2);
        }

        .feature-icon-circle.green {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.2);
        }

        .feature-text h4 {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--text-main, #ffffff);
          margin: 0 0 2px;
        }

        .feature-text p {
          font-size: 12.5px;
          color: var(--text-dim, #94a3b8);
          margin: 0;
          line-height: 1.4;
          font-weight: 500;
        }

        .hero-footer-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-soft, #64748b);
          border-top: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
          padding-top: 18px;
        }

        .version-pill {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          background: var(--page-bg-soft, rgba(255, 255, 255, 0.08));
          padding: 2px 8px;
          border-radius: 6px;
        }

        /* FORM COLUMN (RIGHT) */
        .form-column {
          display: flex;
          justify-content: center;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: var(--card-bg, #ffffff);
          border: 1.5px solid var(--glass-border, rgba(255, 255, 255, 0.15));
          border-radius: 32px;
          padding: 40px 36px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(14, 165, 233, 0.08);
          backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-sizing: border-box;
          animation: scaleIn 0.35s ease-out;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .mobile-header {
          display: none;
          text-align: center;
          margin-bottom: 8px;
        }

        .card-header-desktop {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .card-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #0284c7;
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.2);
          padding: 4px 10px;
          border-radius: 8px;
          width: fit-content;
        }

        .card-title {
          font-size: 24px;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          letter-spacing: -0.025em;
          margin: 0;
        }

        .card-subtitle {
          font-size: 13px;
          color: var(--text-dim, #64748b);
          margin: 0;
          line-height: 1.4;
          font-weight: 500;
        }

        /* Error Alert */
        .error-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          animation: shake 0.3s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .error-icon {
          flex-shrink: 0;
          margin-top: 2px;
          color: #dc2626;
        }

        .error-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
        }

        .error-content strong {
          font-size: 13px;
          font-weight: 700;
        }

        /* Form */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main, #1e293b);
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 16px;
          color: var(--text-dim, #94a3b8);
          pointer-events: none;
          transition: color 0.2s;
        }

        .input-field-wrapper input {
          width: 100%;
          height: 48px;
          padding: 0 46px 0 46px;
          border-radius: 16px;
          border: 1.5px solid var(--glass-border, #e2e8f0);
          background: var(--page-bg-soft, #f8fafc);
          color: var(--text-main, #0f172a);
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .input-field-wrapper input:focus {
          border-color: #0ea5e9;
          background: var(--card-bg, #ffffff);
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.15);
        }

        .input-field-wrapper:focus-within .field-icon {
          color: #0ea5e9;
        }

        .toggle-pass-btn {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          color: var(--text-dim, #94a3b8);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .toggle-pass-btn:hover {
          color: var(--text-main, #0f172a);
        }

        /* Submit Button */
        .submit-btn {
          height: 52px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 28px -6px rgba(14, 165, 233, 0.45);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px -6px rgba(14, 165, 233, 0.6);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-label {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .card-footer-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .security-notice {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-dim, #64748b);
          text-align: center;
        }

        /* RESPONSIVE MOBILE OVERRIDES */
        @media (max-width: 960px) {
          .login-wrapper {
            grid-template-columns: 1fr;
            max-width: 460px;
            gap: 20px;
          }

          .hero-column {
            display: none;
          }

          .mobile-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
          }

          .mobile-logo-box {
            background: transparent;
            margin-bottom: 6px;
          }

          .mobile-logo {
            height: 36px;
            width: auto;
            object-fit: contain;
            background: transparent;
          }

          .mobile-title {
            font-size: 22px;
            font-weight: 900;
            color: var(--text-main, #0f172a);
            margin: 0;
          }

          .mobile-sub {
            font-size: 12px;
            color: var(--text-dim, #64748b);
            margin: 0;
            font-weight: 600;
          }

          .card-header-desktop {
            display: none;
          }

          .auth-card {
            padding: 28px 24px;
            border-radius: 26px;
          }
        }
      `}</style>
    </div>
  )
}
