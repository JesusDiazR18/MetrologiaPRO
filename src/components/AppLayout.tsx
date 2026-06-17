'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  LayoutDashboard, ClipboardList, CalendarDays,
  FlaskConical, ScanLine, Settings, ChevronRight,
  Microscope, X, Menu, QrCode, Search, Sun, Moon
} from 'lucide-react'


const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/equipos', label: 'Fichas Técnicas', icon: ClipboardList },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/patrones', label: 'Patrones', icon: FlaskConical },
  { href: '/escaneo', label: 'Escaneo QR', icon: ScanLine },
  { href: '/qrcodes', label: 'Galería QR', icon: QrCode },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
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
    // Sincronizar con la URL instantáneamente
    const params = new URLSearchParams()
    if (text.trim()) {
      params.set('q', text.trim())
      router.replace(`/equipos?${params.toString()}`)
    } else if (pathname === '/equipos') {
      router.replace('/equipos')
    }
  }

  // Sincronizar el input con la URL si cambia externamente (ej: navegando)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q)
    }
  }, [pathname])

  const currentPage = navItems.find(n => n.href === pathname)?.label ?? 'Panel'

  // Si estamos en la vista pública "visor", ocultamos toda la estructura de la app
  if (pathname.startsWith('/visor')) {
    return (
      <div className="app-layout">
        <main className="page" style={{ width: '100%', maxWidth: '100%', padding: 0 }}>
          {children}
        </main>
      </div>
    )
  }

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

          {/* 
          <div className="nav-group-label" style={{ marginTop: 16 }}>Sistema</div>
          <Link 
            href="/configuracion" 
            className={`nav-item ${pathname === '/configuracion' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings size={18} />
            <span>Configuración</span>
          </Link>
          */}
        </nav>

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
            <div style={{ width: 1, height: 32, background: 'var(--glass-border)' }} />
            <Link href="/escaneo" className="btn-scan" style={{
              background: 'linear-gradient(135deg, var(--oxford-blue-dark) 0%, var(--oxford-blue-light) 100%)',
              color: '#fff',
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.2)',
              textDecoration: 'none',
              fontSize: 14,
              transition: 'all 0.3s'
            }}>
              <ScanLine size={18} color="var(--accent)" />
              <span>Smart Scan</span>
            </Link>
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
            padding-bottom: 70px !important; /* Más espacio para el bottom nav y evitar solapamiento */
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
