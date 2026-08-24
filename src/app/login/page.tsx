'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Lock, User, Eye, EyeOff, LogIn, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'

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

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectUrl)
    }
  }, [authLoading, isAuthenticated, redirectUrl, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Por favor complete todos los campos')
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
    <div className="login-container">
      <div className="login-card">
        {/* Logo and Header */}
        <div className="login-header">
          <div className="login-logo-badge">
            <img src="/logo.png" alt="Polifusion Logo" className="login-logo-img" />
          </div>
          <h1 className="login-title">Control Metrológico</h1>
          <p className="login-subtitle">Sistema de Gestión de Calidad & Trazabilidad ISO 9001:2015</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error-box">
              <AlertCircle size={18} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Usuario o Correo Electrónico
            </label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
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
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <div className="password-label-wrapper">
              <label className="form-label" htmlFor="password">
                Contraseña
              </label>
            </div>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
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
            className="login-submit-btn"
          >
            {loading ? (
              <span className="btn-spinner-content">
                <span className="btn-spinner"></span>
                Iniciando sesión...
              </span>
            ) : (
              <span className="btn-content">
                <LogIn size={18} />
                Ingresar al Sistema
              </span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="login-footer">
          <div className="security-badge">
            <ShieldCheck size={16} color="#0284c7" />
            <span>Acceso Seguro Restringido & Autenticado</span>
          </div>
          <div className="copyright-text">
            POLIFUSIÓN S.A. &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: radial-gradient(circle at 50% 10%, var(--page-bg-soft) 0%, var(--page-bg) 100%);
          position: relative;
          overflow: hidden;
        }

        .login-container::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0) 70%);
          top: -150px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--glass-border, rgba(226, 232, 240, 0.8));
          border-radius: 28px;
          padding: 40px 32px;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02);
          position: relative;
          z-index: 1;
          backdrop-filter: blur(16px);
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .login-logo-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 24px;
          background: var(--page-bg-soft, #f8fafc);
          border: 1px solid var(--glass-border, #e2e8f0);
          border-radius: 20px;
          margin-bottom: 18px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }

        .login-logo-img {
          height: 38px;
          width: auto;
          object-fit: contain;
        }

        .login-title {
          font-size: 24px;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          letter-spacing: -0.03em;
          margin: 0 0 6px;
        }

        .login-subtitle {
          font-size: 13px;
          color: var(--text-dim, #64748b);
          font-weight: 500;
          line-height: 1.4;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-error-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 600;
          animation: shake 0.3s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main, #1e293b);
        }

        .password-label-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-dim, #94a3b8);
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          padding: 13px 14px 13px 44px;
          border-radius: 14px;
          border: 1.5px solid var(--glass-border, #e2e8f0);
          background: var(--page-bg-soft, #f8fafc);
          color: var(--text-main, #0f172a);
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          border-color: #0ea5e9;
          background: var(--card-bg, #ffffff);
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12);
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
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

        .password-toggle-btn:hover {
          color: var(--text-main, #0f172a);
        }

        .login-submit-btn {
          margin-top: 6px;
          padding: 14px 20px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.4);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(14, 165, 233, 0.5);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-spinner-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-spinner {
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

        .login-footer {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #0284c7;
          background: rgba(14, 165, 233, 0.08);
          padding: 6px 14px;
          border-radius: 20px;
        }

        .copyright-text {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-dim, #94a3b8);
        }
      `}</style>
    </div>
  )
}
