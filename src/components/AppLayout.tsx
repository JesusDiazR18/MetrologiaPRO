'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  LayoutDashboard, ClipboardList, CalendarDays,
  FlaskConical, Settings, ChevronRight,
  Microscope, X, Menu, QrCode, Search, Sun, Moon,
  LogOut, User as UserIcon, Shield, Users, Sparkles,
  Camera, CheckCircle2, ShieldCheck, ArrowUpRight
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

const baseNavItems = [
  { href: '/', label: 'Dashboard', shortLabel: 'Inicio', icon: LayoutDashboard },
  { href: '/equipos', label: 'Fichas Técnicas', shortLabel: 'Fichas', icon: ClipboardList },
  { href: '/calendario', label: 'Calendario', shortLabel: 'Agenda', icon: CalendarDays },
  { href: '/patrones', label: 'Patrones', shortLabel: 'Patrones', icon: FlaskConical },
  { href: '/qrcodes', label: 'Galería QR', shortLabel: 'QR Codes', icon: QrCode },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, isAuthenticated, logout } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
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
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearchChange = (text: string) => {
    setSearchQuery(text)
    const params = new URLSearchParams()
    if (text.trim()) {
      params.set('q', text.trim())
      router.replace(`/equipos?${params.toString()}`)
    } else if (pathname === '/equipos') {
      router.replace('/equipos')
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q)
    }
  }, [pathname])

  // 1. PUBLIC ACCESS FOR QR SCANS (/visor/*)
  if (pathname.startsWith('/visor')) {
    return (
      <div className="app-layout">
        <main className="page" style={{ width: '100%', maxWidth: '100%', padding: 0 }}>
          {children}
        </main>
      </div>
    )
  }

  // 2. LOGIN PAGE VIEW
  if (pathname === '/login') {
    return <>{children}</>
  }

  // 3. AUTHENTICATION LOADING SCREEN
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--page-bg, #f8fafc)',
        gap: 16
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid rgba(14, 165, 233, 0.2)',
          borderTopColor: '#0ea5e9',
          animation: 'spin 0.7s linear infinite'
        }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim, #64748b)', letterSpacing: '0.05em' }}>
          VERIFICANDO ACCESO...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // 4. UNAUTHENTICATED REDIRECT
  if (!isAuthenticated || !user) {
    if (typeof window !== 'undefined') {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
    return null
  }

  const navItems = user?.rol === 'Admin'
    ? [...baseNavItems, { href: '/usuarios', label: 'Gestión Usuarios', shortLabel: 'Usuarios', icon: Users }]
    : baseNavItems

  const currentPage = navItems.find(n => n.href === pathname)?.label ?? (pathname === '/usuarios' ? 'Gestión de Usuarios' : 'Panel')
  const userInitials = user.nombre ? user.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : (user.username?.slice(0, 2).toUpperCase() || 'U')

  return (
    <div className="app-layout">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Permanent / Mobile Slide Drawer) */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="brand" style={{ padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="brand-logo-container">
              <img src="/logo.png" alt="Polifusion Logo" className="brand-logo-img" />
            </div>
            {/* Mobile close button inside drawer */}
            <button 
              className="drawer-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Módulos de Control</div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{label}</span>
                {active && <ChevronRight size={14} className="nav-chevron" />}
              </Link>
            )
          })}
        </nav>

        {/* User Card in Sidebar */}
        <div className="sidebar-user-card">
          <div className="user-profile-row">
            <div className="user-avatar-pill">
              {userInitials}
            </div>
            <div className="user-profile-info">
              <div className="user-name-title">
                {user.nombre || user.username}
              </div>
              <div className="user-role-badge">
                <Shield size={11} />
                <span>{user.rol || 'Administrador'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="sidebar-logout-btn"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="footer-version">v1.0.0</div>
          <div className="footer-title">CONTROL METROLÓGICO PRO</div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="main-content">
        {/* Topbar Ultra-Premium */}
        <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
          {/* Mobile Drawer Trigger */}
          <button
            className="mobile-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú de navegación"
          >
            <Menu size={20} />
          </button>

          {/* Screen Title */}
          <div className="topbar-title-block">
            <div className="topbar-title">{currentPage}</div>
            <div className="topbar-sub-brand">POLIFUSIÓN • SGC</div>
          </div>

          {/* Desktop Global Search Bar */}
          <div className="topbar-search-container">
            <div className="search-input-box">
              <Search size={18} className="search-input-icon" />
              <input 
                placeholder="Buscar equipo, código interno o responsable..." 
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearchChange('')}
                  className="search-clear-btn"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Topbar Action Controls */}
          <div className="topbar-actions">
            {/* Quick QR Gallery Trigger */}
            <Link 
              href="/qrcodes" 
              className="topbar-icon-btn qr-quick-btn"
              title="Ver Galería de Códigos QR"
            >
              <QrCode size={18} />
              <span className="desktop-only qr-quick-label">QR Galería</span>
            </Link>

            {/* User Pill (Desktop) */}
            <div className="desktop-only topbar-user-pill">
              <div className="user-mini-avatar">
                {userInitials}
              </div>
              <span className="user-mini-name">
                {user.nombre?.split(' ')[0] || user.username}
              </span>
              <span className="user-mini-role">
                {user.rol || 'Admin'}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="topbar-icon-btn theme-btn"
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Logout button (Desktop) */}
            <button
              onClick={() => logout()}
              className="desktop-only topbar-icon-btn logout-btn"
              title="Cerrar sesión de usuario"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="page">
          {children}
        </main>
      </div>

      {/* 📱 NATIVE MOBILE BOTTOM TAB BAR (iOS / Android Native Feel) */}
      <nav className="bottom-nav">
        {navItems.slice(0, 5).map(({ href, shortLabel, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link 
              key={href} 
              href={href} 
              className={`bottom-nav-item ${active ? 'active' : ''}`}
            >
              <div className="bottom-nav-icon-box">
                <Icon size={20} />
                {active && <span className="active-glow-pill" />}
              </div>
              <span className="bottom-nav-label">{shortLabel}</span>
            </Link>
          )
        })}
      </nav>

      <style jsx global>{`
        /* Global Navigation Enhancements */
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 105;
          animation: fadeIn 0.2s ease-out;
        }

        .drawer-close-btn {
          display: none;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #ffffff;
          padding: 6px;
          border-radius: 10px;
          cursor: pointer;
        }

        .sidebar-user-card {
          margin: 12px 14px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 12px;
          backdrop-filter: blur(12px);
        }

        .user-profile-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar-pill {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
          flex-shrink: 0;
        }

        .user-profile-info {
          flex: 1;
          min-width: 0;
        }

        .user-name-title {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role-badge {
          font-size: 11px;
          font-weight: 600;
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 1px;
        }

        .sidebar-logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.12);
          color: #fca5a5;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sidebar-logout-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #ffffff;
          border-color: rgba(239, 68, 68, 0.4);
        }

        .sidebar-footer {
          padding: 14px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-version {
          font-weight: 700;
          font-family: var(--font-mono, monospace);
          color: #38bdf8;
        }

        .footer-title {
          font-size: 10px;
          letter-spacing: 0.05em;
        }

        /* Topbar Styles */
        .topbar-title-block {
          display: flex;
          flex-direction: column;
        }

        .topbar-sub-brand {
          font-size: 9px;
          font-weight: 800;
          color: var(--text-dim, #64748b);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .topbar-search-container {
          flex: 1;
          max-width: 520px;
          position: relative;
          margin-left: auto;
        }

        .search-input-box {
          background: var(--card-bg, #ffffff);
          border: 1.5px solid var(--glass-border, #e2e8f0);
          border-radius: 14px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
        }

        .search-input-box:focus-within {
          border-color: var(--accent, #0284c7);
          box-shadow: 0 0 0 3px var(--accent-glow, rgba(2, 132, 199, 0.15));
        }

        .search-input-icon {
          color: var(--text-soft, #94a3b8);
          flex-shrink: 0;
        }

        .search-input-box input {
          width: 100%;
          height: 40px;
          border: none;
          background: transparent;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-main, #0f172a);
          outline: none;
        }

        .search-clear-btn {
          background: var(--page-bg-soft, #f1f5f9);
          border: none;
          border-radius: 50%;
          padding: 3px;
          cursor: pointer;
          color: var(--text-dim, #64748b);
          display: flex;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .topbar-icon-btn {
          background: var(--card-bg, #ffffff);
          border: 1.5px solid var(--glass-border, #e2e8f0);
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-main, #0f172a);
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .topbar-icon-btn:hover {
          transform: translateY(-1px);
          border-color: var(--accent, #0284c7);
          color: var(--accent, #0284c7);
        }

        .qr-quick-btn {
          width: auto;
          padding: 0 14px;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #0284c7;
        }

        .logout-btn {
          color: #ef4444;
        }

        .logout-btn:hover {
          color: #ffffff;
          background: #ef4444;
          border-color: #ef4444;
        }

        .topbar-user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 14px;
          background: var(--card-bg, #ffffff);
          border: 1.5px solid var(--glass-border, #e2e8f0);
          box-shadow: var(--shadow-sm);
        }

        .user-mini-avatar {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 11px;
        }

        .user-mini-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main, #0f172a);
        }

        .user-mini-role {
          font-size: 10px;
          font-weight: 800;
          color: #0284c7;
          background: rgba(14, 165, 233, 0.1);
          padding: 2px 6px;
          border-radius: 6px;
        }

        /* 📱 BOTTOM TAB BAR STYLES */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(64px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          display: flex;
          align-items: center;
          border-top: 1px solid var(--glass-border, rgba(15, 23, 42, 0.08));
          z-index: 1000;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08);
        }

        [data-theme="dark"] .bottom-nav {
          background: rgba(14, 20, 36, 0.96);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.5);
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          color: var(--text-soft, #94a3b8);
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          flex: 1;
          height: 100%;
          position: relative;
        }

        .bottom-nav-icon-box {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 24px;
        }

        .bottom-nav-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
          transition: color 0.2s;
        }

        .bottom-nav-item.active {
          color: var(--accent, #0284c7);
        }

        .active-glow-pill {
          position: absolute;
          top: -4px;
          width: 20px;
          height: 3px;
          background: var(--accent, #0284c7);
          border-radius: 4px;
          box-shadow: 0 0 10px var(--accent, #0284c7);
          animation: popGlow 0.25s ease-out;
        }

        @keyframes popGlow {
          from { transform: scaleX(0); opacity: 0; }
          to { transform: scaleX(1); opacity: 1; }
        }

        .bottom-nav-item.active .bottom-nav-icon-box svg {
          transform: translateY(-1px);
        }

        /* MOBILE MEDIA OVERRIDES */
        @media (max-width: 768px) {
          .mobile-toggle {
            display: flex !important;
            background: var(--card-bg, #ffffff);
            border: 1.5px solid var(--glass-border, #e2e8f0);
            cursor: pointer;
            padding: 8px;
            border-radius: 12px;
            align-items: center;
            justify-content: center;
            color: var(--text-main, #0f172a);
          }

          .drawer-close-btn {
            display: flex;
          }

          .topbar {
            height: 56px !important;
            padding: 0 14px !important;
            gap: 12px !important;
          }

          .topbar-title {
            font-size: 16px !important;
            font-weight: 800 !important;
          }

          .topbar-search-container {
            display: none !important;
          }

          .qr-quick-btn {
            padding: 8px !important;
            border-radius: 12px !important;
          }

          .qr-quick-label {
            display: none !important;
          }

          .main-content {
            padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;
          }

          .page {
            padding: 14px 12px calc(24px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-toggle {
            display: none !important;
          }

          .bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
