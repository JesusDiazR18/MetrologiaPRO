'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  LayoutDashboard, ClipboardList, CalendarDays,
  FlaskConical, Settings, ChevronRight,
  Microscope, X, Menu, QrCode, Search, Sun, Moon, BookOpen,
  LogOut, User as UserIcon, Shield
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/equipos', label: 'Fichas Técnicas', icon: ClipboardList },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/patrones', label: 'Patrones', icon: FlaskConical },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/qrcodes', label: 'Galería QR', icon: QrCode },
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
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
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
  // El visor de QR es 100% público, no requiere login
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
    return <div className="app-layout">{children}</div>
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

  const currentPage = navItems.find(n => n.href === pathname)?.label ?? 'Panel'
  const userInitials = user.nombre ? user.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : (user.username?.slice(0, 2).toUpperCase() || 'U')

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="brand" style={{ padding: '4px 0' }}>
            <div className="brand-logo-container">
              <img src="/logo.png" alt="Polifusion Logo" className="brand-logo-img" />
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Principal</div>
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
                {active && <ChevronRight size={14} />}
              </Link>
            )
          })}
        </nav>

        {/* User Card in Sidebar */}
        <div className="sidebar-user-card" style={{
          margin: '12px 14px',
          padding: '12px 14px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: '0 4px 10px rgba(14, 165, 233, 0.3)'
            }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.nombre || user.username}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Shield size={11} />
                {user.rol || 'Administrador'}
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
              e.currentTarget.style.color = '#fca5a5'
            }}
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>v1.0.0</div>
          <div>CONTROL METROLÓGICO PRO</div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Topbar Ultra-Premium */}
        <header className={`topbar ${scrolled ? 'scrolled' : ''} ${pathname === '/' ? 'hide-on-dashboard' : ''}`}>
          <button
            style={{ 
              display: 'flex', 
              background: 'var(--page-bg-soft)', 
              border: '1.5px solid var(--glass-border)', 
              cursor: 'pointer', 
              padding: 10, 
              borderRadius: 12, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
            className="mobile-toggle"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} color="var(--text-main)" />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="topbar-title" style={{ 
              fontSize: scrolled ? 15 : 17, 
              fontWeight: 900, 
              color: 'var(--text-main)', 
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              transition: 'all 0.3s'
            }}>{currentPage}</div>
            <div className="desktop-only" style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONTROL METROLÓGICO PRO</div>
          </div>

          <div className="topbar-search-container" style={{ 
            flex: 1, 
            maxWidth: 600,
            position: 'relative',
            marginLeft: 'auto'
          }}>
            <div style={{ 
              background: 'var(--card-bg)', 
              borderRadius: 16, 
              padding: '2px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              border: searchQuery ? '2px solid var(--accent)' : '2px solid var(--glass-border)',
              boxShadow: searchQuery ? '0 8px 20px var(--accent-glow)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.3s ease',
              transform: searchQuery ? 'translateY(-1px)' : 'none'
            }}>
              <Search size={20} color={searchQuery ? 'var(--accent)' : 'var(--text-soft)'} style={{ transition: 'all 0.3s' }} />
              <input 
                placeholder="Buscar activo, código o responsable..." 
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 500,
                  width: '100%',
                  outline: 'none',
                  color: 'var(--text-main)'
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearchChange('')}
                  style={{ background: 'var(--page-bg-soft)', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer', display: 'flex' }}
                >
                  <X size={12} color="var(--text-dim)" />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* User pill topbar */}
            <div className="desktop-only" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 14,
              background: 'var(--page-bg-soft)',
              border: '1.5px solid var(--glass-border)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 11
              }}>
                {userInitials}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                {user.nombre?.split(' ')[0] || user.username}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#0284c7',
                background: 'rgba(14, 165, 233, 0.1)',
                padding: '2px 6px',
                borderRadius: 6
              }}>
                {user.rol || 'Admin'}
              </span>
            </div>

            {/* Logout button in topbar */}
            <button
              onClick={() => logout()}
              style={{
                background: 'var(--page-bg-soft)',
                border: '1.5px solid var(--glass-border)',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--danger, #ef4444)',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--page-bg-soft)',
                border: '1.5px solid var(--glass-border)',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              title={theme === 'light' ? 'Cambiar a Tema Oscuro Stitch 2.0' : 'Cambiar a Tema Claro Original'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        <main className={`page ${pathname === '/' ? 'dashboard-page-view' : ''}`} style={{ 
          width: '100%', 
          maxWidth: '100%',
          minHeight: 'calc(100vh - 60px)',
          display: 'block',
          position: 'relative'
        }}>
          {children}
        </main>
      </div>

      {/* Bottom Navigation para Móviles - Estilo iOS/Android Nativo */}
      <nav className="bottom-nav">
        {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile sidebar toggle CSS override */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle { display: flex !important; }
          .topbar { 
            height: 56px !important; 
            padding: 0 14px !important; 
            gap: 10px !important;
            background: var(--glass-bg) !important;
            border-bottom: 1px solid var(--glass-border) !important;
          }
          .topbar-search-container { display: none !important; }
          .btn-scan { 
            padding: 8px 12px !important; 
            border-radius: var(--radius-md) !important; 
            background: var(--page-bg-soft) !important;
            box-shadow: none !important;
            color: var(--text-main) !important;
            border: 1px solid var(--glass-border) !important;
          }
          .btn-scan span { display: none; }
          .btn-scan svg { color: var(--accent) !important; }
          
          .main-content { 
            padding-bottom: 70px !important;
            overflow-y: visible !important;
            height: auto !important;
          }
          .page { 
            padding: 10px 8px !important; 
            overflow-x: hidden !important; 
            overflow-y: visible !important;
            display: block !important;
          }

          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            display: flex;
            justify-content: space-around;
            align-items: center;
            border-top: 1px solid var(--glass-border);
            padding-bottom: env(safe-area-inset-bottom);
            z-index: 1000;
          }
          .bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            text-decoration: none;
            color: var(--text-soft);
            transition: all 0.2s;
            flex: 1;
          }
          .bottom-nav-item span {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .bottom-nav-item.active {
            color: var(--accent);
          }
          .bottom-nav-item.active svg {
            transform: translateY(-1px);
            filter: drop-shadow(0 2px 6px var(--accent-glow));
          }
        }
        @media (min-width: 769px) {
          .bottom-nav { display: none; }
          .topbar.hide-on-dashboard {
            display: none !important;
          }
          .dashboard-page-view {
            padding: 16px var(--page-px) !important;
            min-height: 100vh !important;
          }
        }
      `}</style>
    </div>
  )
}
