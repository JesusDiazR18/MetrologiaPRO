'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  LayoutDashboard, ClipboardList, CalendarDays,
  FlaskConical, ScanLine, Settings, ChevronRight,
  Microscope, X, Menu, QrCode, Search
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

          <div className="nav-group-label" style={{ marginTop: 16 }}>Sistema</div>
          <Link 
            href="/configuracion" 
            className={`nav-item ${pathname === '/configuracion' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings size={18} />
            <span>Configuración</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>v1.0.0</div>
          <div>Sistema Metrológico PRO</div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Topbar Ultra-Premium */}
        <header className={`topbar ${scrolled ? 'scrolled' : ''}`} style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          background: 'rgba(255, 255, 255, 0.7)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
          padding: scrolled ? '10px 32px' : '16px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: scrolled ? '0 10px 30px -10px rgba(0,0,0,0.08)' : 'none'
        }}>
          <button
            style={{ 
              display: 'flex', 
              background: '#f1f5f9', 
              border: 'none', 
              cursor: 'pointer', 
              padding: 10, 
              borderRadius: 12, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
            className="mobile-toggle"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} color="#1e293b" />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="topbar-title" style={{ 
              fontSize: scrolled ? 15 : 17, 
              fontWeight: 900, 
              color: '#0f172a', 
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              transition: 'all 0.3s'
            }}>{currentPage}</div>
            <div className="mobile-hide" style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metrología Inteligente</div>
          </div>

          <div className="topbar-search-container" style={{ 
            flex: 1, 
            maxWidth: 600,
            position: 'relative',
            marginLeft: 'auto'
          }}>
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              padding: '2px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              border: searchQuery ? '2px solid var(--accent)' : '2px solid #f1f5f9',
              boxShadow: searchQuery ? '0 8px 20px rgba(0, 229, 255, 0.15)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.3s ease',
              transform: searchQuery ? 'translateY(-1px)' : 'none'
            }}>
              <Search size={20} color={searchQuery ? 'var(--accent)' : '#94a3b8'} style={{ transition: 'all 0.3s' }} />
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
                  color: '#1e293b'
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearchChange('')}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer', display: 'flex' }}
                >
                  <X size={12} color="#64748b" />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />
            <Link href="/escaneo" className="btn-scan" style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              color: '#fff',
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)',
              textDecoration: 'none',
              fontSize: 14,
              transition: 'all 0.3s'
            }}>
              <ScanLine size={18} color="var(--accent)" />
              <span>Smart Scan</span>
            </Link>
          </div>
        </header>



        <main className="page" style={{ width: '100%', maxWidth: '100%' }}>
          {children}
        </main>
      </div>

      {/* Mobile sidebar toggle CSS override */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle { display: flex !important; margin-right: -10px; }
          .topbar { height: 60px !important; padding: 0 16px !important; gap: 12px !important; }
          .btn-scan span { display: none; }
          .btn-scan { padding: 10px !important; border-radius: 12px !important; }
          .mobile-hide { display: none !important; }
          .topbar-search-container { display: none !important; }
          .bottom-nav { display: none !important; }
          .main-content { padding-bottom: 0 !important; }
          .page { padding: 12px !important; }
        }
      `}</style>
    </div>
  )
}
