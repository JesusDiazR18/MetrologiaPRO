'use client'
import { useEffect, useState } from 'react'
import { QrCode, Printer, Search } from 'lucide-react'
import { calcularSemaforo, semaforoHex } from '@/lib/metrologia'
import { QRCodeSVG } from 'qrcode.react'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tipo: string
  Area_Asignada: string | null
  Estado: string
  Fecha_Proximo_Control: string | null
}

export default function QRCodesPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'EQUIPO' | 'INSTRUMENTO'>('ALL')

  useEffect(() => {
    let active = true
    fetch('/api/equipos')
      .then(r => r.json())
      .then(data => {
        if (active) {
          setEquipos(data)
          setLoading(false)
        }
      })
      .catch(err => {
        if (active) {
          console.error("Error loading QR codes", err)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [])


  const allActive = equipos.filter(e => e.Estado !== 'OBSOLETO' && e.Estado !== 'FUERA_DE_SERVICIO')
  
  const filtered = allActive.filter(e => {
    const matchSearch = !search || 
      e.Codigo_Interno.toLowerCase().includes(search.toLowerCase()) ||
      e.Nombre_Equipo.toLowerCase().includes(search.toLowerCase()) ||
      (e.Area_Asignada ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || e.Tipo === filter
    return matchSearch && matchFilter
  })

  const equiposCount = filtered.filter(e => e.Tipo === 'EQUIPO').length
  const instCount = filtered.filter(e => e.Tipo === 'INSTRUMENTO').length

  function handlePrintBatch(targetEquipos: Equipo[]) {
    if (targetEquipos.length === 0) return
    const w = window.open('', '_blank')
    if (!w) return

    const scanUrlBase = `${window.location.protocol}//${window.location.host}/escaneo?id=`

    w.document.write(`<!DOCTYPE html><html><head>
      <title>Impresión de Etiquetas por Lotes</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; padding: 10mm; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10mm; }
        .label { 
          width: 60mm; height: 40mm; outline: 1px dashed #ccc; padding: 3mm; 
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; 
          page-break-inside: avoid;
        }
        .qr-wrap { background: #fff; padding: 1mm; border: 1px solid #eee; }
        .info { text-align: center; width: 100%; }
        .header-row { display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 2px; }
        .info-code { font-size: 14pt; font-weight: 900; color: #000; }
        .status-badge { font-size: 7pt; font-weight: 800; border: 1px solid #000; padding: 1px 4px; border-radius: 10px; }
        .info-name { font-size: 8pt; font-weight: 700; color: #333; line-height: 1.1; max-width: 50mm; overflow: hidden; }
        @media print {
          .label { outline: none; border: 1px solid #eee; }
        }
      </style>
    </head><body><div class="grid">`)

    targetEquipos.forEach(e => {
      const semaforo = calcularSemaforo(e.Fecha_Proximo_Control)
      const statusLabel = semaforo === 'VERDE' ? 'AL DÍA' : semaforo === 'AMARILLO' ? 'PRÓX. VENC.' : 'VENCIDO'
      const statusColor = semaforoHex(semaforo)
      
      // We need a way to get the SVG HTML. In a real app we'd use a server-side generator or a library that returns string.
      // For this hacky client-side print, we will use a hidden Canvas or just another QRCodeSVG in the parent and grab it.
      // Alternatively, we can just write the logic to generate them in the new window if we include the library there, 
      // but simpler is to use a data URL if possible.
      
      w.document.write(`
        <div class="label">
          <div class="qr-wrap">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(scanUrlBase + e.Codigo_Interno)}" width="100" height="100" />
          </div>
          <div class="info">
            <div class="header-row">
              <span class="info-code">${e.Codigo_Interno}</span>
              <span class="status-badge" style="border-color: ${statusColor}; color: ${statusColor}">${statusLabel}</span>
            </div>
            <div class="info-name">${e.Nombre_Equipo}</div>
          </div>
        </div>
      `)
    })

    w.document.write(`</div></body></html>`)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 1000)
  }

  function handlePrintRange() {
    const from = prompt('Desde el código (ej: E-01):')
    const to = prompt('Hasta el código (ej: E-10):')
    if (!from || !to) return
    
    const range = allActive.filter(e => {
      const code = e.Codigo_Interno
      return code >= from && code <= to
    }).sort((a,b) => a.Codigo_Interno.localeCompare(b.Codigo_Interno))

    if (range.length === 0) {
      alert('No se encontraron activos en ese rango.')
      return
    }
    handlePrintBatch(range)
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="page-header">
        <div className="page-header-icon"><QrCode size={22} /></div>
        <div>
          <h1>Galería de Etiquetas QR</h1>
          <p>Gestión masiva e impresión de etiquetas para auditoría</p>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <div className="filter-pills">
            {(['ALL', 'EQUIPO', 'INSTRUMENTO'] as const).map(f => (
              <button
                key={f}
                className={`pill ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'ALL' 
                  ? `Todos (${allActive.length})` 
                  : f === 'EQUIPO' 
                    ? `Equipos (${allActive.filter(e => e.Tipo === 'EQUIPO').length})`
                    : `Instrumentos (${allActive.filter(e => e.Tipo === 'INSTRUMENTO').length})`
                }
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => handlePrintBatch(filtered)}>
              <Printer size={16} />
              Imprimir Filtrados
            </button>
            <button className="btn btn-ghost" style={{ background: 'var(--snow-2)' }} onClick={handlePrintRange}>
              <Printer size={16} />
              Por Rango
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="topbar-search" style={{ marginBottom: 24 }}>
        <Search size={18} />
        <input
          placeholder="Buscar por código, nombre o área..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-soft)' }}>
          Cargando activos...
        </div>
      ) : (
        <div className="qr-grid">
          {filtered.map(e => {
            const semaforo = calcularSemaforo(e.Fecha_Proximo_Control)
            const statusColor = semaforoHex(semaforo)
            const isEquipo = e.Tipo === 'EQUIPO'
            const statusLabel = semaforo === 'VERDE' ? 'AL DÍA' : semaforo === 'AMARILLO' ? 'PRÓX. VENC.' : 'VENCIDO'
            const scanUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/escaneo?id=${e.Codigo_Interno}`

            return (
              <div key={e.ID_Equipo} className="qr-card">
                <div className="qr-status-bar" style={{ background: statusColor }} />
                
                <div style={{ padding: '12px 14px 0', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="qr-type-badge" style={{ padding: 0 }}>
                    {isEquipo ? '⚙️' : '🔬'} {e.Tipo}
                  </div>
                  <button 
                    className="btn-print-mini"
                    onClick={() => handlePrintBatch([e])}
                    title="Imprimir etiqueta individual"
                  >
                    <Printer size={12} />
                  </button>
                </div>

                <div className="qr-image-wrap" style={{ padding: '8px 14px 12px' }}>
                  <QRCodeSVG
                    value={scanUrl}
                    size={140}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="H"
                    style={{ display: 'block', borderRadius: 6, border: '1px solid #eee' }}
                  />
                </div>

                <div className="qr-info">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
                    <div className="qr-code">{e.Codigo_Interno}</div>
                    <div style={{ 
                      fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 10, 
                      color: '#fff', background: statusColor, textTransform: 'uppercase'
                    }}>{statusLabel}</div>
                  </div>
                  <div className="qr-name" title={e.Nombre_Equipo}>{e.Nombre_Equipo}</div>
                  <div className="qr-area">{e.Area_Asignada ?? 'Sin área'}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .btn-print-mini {
          background: var(--snow-2);
          border: none;
          color: var(--text-soft);
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-print-mini:hover {
          background: var(--accent);
          color: #fff;
        }
        .filter-pills {
          display: flex;
          background: var(--snow-2);
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }
        .pill {
          border: none;
          background: none;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-soft);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .pill.active {
          background: #fff;
          color: var(--accent);
          box-shadow: var(--shadow-sm);
        }
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 16px;
        }
        .qr-card {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.25s ease;
          border: 1px solid var(--snow-3);
          position: relative;
        }
        .qr-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-premium);
        }
        .qr-status-bar {
          width: 100%;
          height: 4px;
          flex-shrink: 0;
        }
        .qr-type-badge {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-soft);
          padding: 8px 12px 0;
          align-self: flex-start;
        }
        .qr-image-wrap {
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-info {
          padding: 0 14px 8px;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        }
        .qr-code {
          font-size: 15px;
          font-weight: 800;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .qr-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .qr-area {
          font-size: 10px;
          color: var(--text-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .qr-footer {
          padding: 8px 14px;
          border-top: 1px solid var(--snow-2);
          width: 100%;
          display: flex;
          align-items: center;
          gap: 6px;
          box-sizing: border-box;
        }
        .qr-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        @media print {
          .page-header, .topbar-search { display: none !important; }
          .card { display: none !important; }
          .qr-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
          }
          .qr-card {
            break-inside: avoid;
            box-shadow: none;
            border: 1px solid #ddd;
          }
          .qr-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
