'use client'
import { useEffect, useState, useMemo } from 'react'
import { QrCode, Printer, Search, CheckCircle2, X, Scaling, Grid3X3, Layers, Filter } from 'lucide-react'
import { calcularSemaforo, semaforoHex, getScanUrl } from '@/lib/metrologia'
import { QRCodeSVG } from 'qrcode.react'

interface QrItem {
  id: string
  codigo: string
  nombre: string
  tipo: 'EQUIPO' | 'PATRON'
  area: string
  estado: string
  fechaProximoControl: string | null
}

export default function QRCodesPage() {
  const [items, setItems] = useState<QrItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'ALL' | 'EQUIPO' | 'PATRON'>('ALL')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  
  // Opciones de Impresión
  const [printSize, setPrintSize] = useState<'STANDARD' | 'MINI'>('STANDARD')
  const [printCols, setPrintCols] = useState(3)
  const [printGaps, setPrintGaps] = useState(10) // mm

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/equipos').then(r => r.json()),
      fetch('/api/patrones').then(r => r.json())
    ])
      .then(([equiposData, patronesData]) => {
        if (!active) return
        
        const qrList: QrItem[] = []

        // 1. Equipos (SOLO Tipo === 'EQUIPO', se excluyen instrumentos)
        if (Array.isArray(equiposData)) {
          equiposData
            .filter((e: any) => e.Tipo === 'EQUIPO')
            .forEach((e: any) => {
              qrList.push({
                id: e.ID_Equipo,
                codigo: e.Codigo_Interno,
                nombre: e.Nombre_Equipo,
                tipo: 'EQUIPO',
                area: e.Area_Asignada || 'Planta',
                estado: e.Estado,
                fechaProximoControl: e.Fecha_Proximo_Control
              })
            })
        }

        // 2. Patrones de Referencia
        if (Array.isArray(patronesData)) {
          patronesData.forEach((p: any) => {
            qrList.push({
              id: p.ID_Patron,
              codigo: p.Codigo,
              nombre: p.Nombre_Patron,
              tipo: 'PATRON',
              area: p.Proveedor_Laboratorio || 'Laboratorio',
              estado: p.Estado_Vigencia === 'VIGENTE' ? 'OPERATIVO' : 'VENCIDO',
              fechaProximoControl: p.Fecha_Vencimiento_Certificado
            })
          })
        }

        setItems(qrList)
        setLoading(false)
      })
      .catch(err => {
        if (active) {
          console.error("Error loading QR codes", err)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [])

  const countEquipos = useMemo(() => items.filter(i => i.tipo === 'EQUIPO').length, [items])
  const countPatrones = useMemo(() => items.filter(i => i.tipo === 'PATRON').length, [items])

  const filtered = useMemo(() => {
    return items.filter(e => {
      const matchTipo = tipoFilter === 'ALL' || e.tipo === tipoFilter
      const matchSearch = !search || 
        e.codigo.toLowerCase().includes(search.toLowerCase()) ||
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        e.area.toLowerCase().includes(search.toLowerCase())
      return matchTipo && matchSearch
    })
  }, [items, tipoFilter, search])

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectAllFiltered = () => {
    const next = new Set(selectedIds)
    filtered.forEach(e => next.add(e.id))
    setSelectedIds(next)
  }

  const clearSelection = () => setSelectedIds(new Set())

  function generatePrintHTML(targetItems: QrItem[]) {
    const sizeMap = {
      STANDARD: { w: 60, h: 40, qr: 100, fontCode: 14, fontName: 8 },
      MINI: { w: 30, h: 18, qr: 50, fontCode: 9, fontName: 6 }
    }[printSize]

    let labelsHTML = ''
    targetItems.forEach(e => {
      const qrUrl = getScanUrl(e.codigo)
      const qrData = encodeURIComponent(qrUrl)
      
      labelsHTML += `
        <div class="label">
          <div class="qr-wrap">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}" style="width: ${sizeMap.qr}px; height: ${sizeMap.qr}px;" />
          </div>
          <div class="info">
            <div class="info-type" style="font-size: ${sizeMap.fontName - 1}pt; color: #0284c7; font-weight: bold; text-transform: uppercase;">${e.tipo}</div>
            <div class="info-code" style="font-size: ${sizeMap.fontCode}pt">${e.codigo}</div>
            <div class="info-name" style="font-size: ${sizeMap.fontName}pt">${e.nombre}</div>
          </div>
        </div>
      `
    })

    return `<!DOCTYPE html><html><head>
      <title>QMS - Impresión de Etiquetas QR</title>
      <style>
        @page { margin: 12mm 10mm; size: auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #fff; padding: 0; }
        .grid { 
          display: grid; 
          grid-template-columns: repeat(${printCols}, 1fr); 
          gap: ${printGaps}mm; 
          justify-items: center;
          padding: 4mm;
        }
        .label { 
          width: ${sizeMap.w}mm; 
          height: ${sizeMap.h}mm; 
          border: 1px solid #ddd; 
          padding: 3mm; 
          display: flex; 
          flex-direction: ${printSize === 'MINI' ? 'row' : 'column'}; 
          align-items: center; 
          justify-content: center; 
          gap: 2.5mm; 
          break-inside: avoid;
          page-break-inside: avoid;
          background: #fff;
          border-radius: 2mm;
        }
        .qr-wrap { display: flex; align-items: center; justify-content: center; }
        .info { text-align: ${printSize === 'MINI' ? 'left' : 'center'}; flex: 1; }
        .info-type { margin-bottom: 1px; }
        .info-code { font-weight: 900; color: #000; letter-spacing: -0.02em; text-align: center; margin-bottom: 2px; }
        .info-name { font-weight: 700; color: #444; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: center; }
      </style>
    </head><body><div class="grid">${labelsHTML}</div></body></html>`
  }

  const handlePrintSelected = () => {
    const targetItems = items.filter(e => selectedIds.has(e.id))
    const listToPrint = targetItems.length > 0 ? targetItems : filtered
    if (listToPrint.length === 0) return alert('No hay elementos para imprimir')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(generatePrintHTML(listToPrint))
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 1000)
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', position: 'relative' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' }}>
          <QrCode size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>Galería de Etiquetas QR</h1>
          <p style={{ color: 'var(--text-soft)', fontWeight: 500 }}>Gestión e impresión de códigos QR oficiales para Equipos y Patrones</p>
        </div>

        <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedIds.size > 0 && (
            <div className="selection-badge" style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '6px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{selectedIds.size} seleccionados</span>
              <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}><X size={13} /></button>
            </div>
          )}
          <button 
            className="btn-print-master" 
            onClick={() => setShowPrintOptions(!showPrintOptions)}
            style={{ 
              background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 18px', 
              borderRadius: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: 13
            }}
          >
            <Printer size={16} color="var(--accent)" />
            {selectedIds.size > 0 ? `Imprimir (${selectedIds.size})` : 'Imprimir Etiquetas'}
          </button>
        </div>
      </div>

      {showPrintOptions && (
        <div className="print-config-panel" style={{ 
          background: 'var(--card-bg)', borderRadius: 16, padding: 20, marginBottom: 24,
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Scaling size={14} /> Tamaño de Etiqueta
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => setPrintSize('STANDARD')}
                className={`config-btn ${printSize === 'STANDARD' ? 'active' : ''}`}
              >Estándar (60x40)</button>
              <button 
                onClick={() => setPrintSize('MINI')}
                className={`config-btn ${printSize === 'MINI' ? 'active' : ''}`}
              >Mini (30x18)</button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Grid3X3 size={14} /> Columnas por Hoja
            </label>
            <input 
              type="range" min="1" max="5" value={printCols} 
              onChange={e => setPrintCols(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>{printCols} Columnas</div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Layers size={14} /> Espaciado (mm)
            </label>
            <input 
              type="number" value={printGaps} 
              onChange={e => setPrintGaps(parseInt(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--page-bg-soft)', color: 'var(--text-main)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={handlePrintSelected}
              style={{ width: '100%', background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}
            >
              🚀 Iniciar Impresión ({selectedIds.size || filtered.length})
            </button>
          </div>
        </div>
      )}

      {/* Tabs & Search Filter Bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--page-bg-soft)', padding: 4, borderRadius: 10, border: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => setTipoFilter('ALL')}
            className={`tab-btn ${tipoFilter === 'ALL' ? 'active' : ''}`}
          >
            Todos ({items.length})
          </button>
          <button 
            onClick={() => setTipoFilter('EQUIPO')}
            className={`tab-btn ${tipoFilter === 'EQUIPO' ? 'active' : ''}`}
          >
            Equipos ({countEquipos})
          </button>
          <button 
            onClick={() => setTipoFilter('PATRON')}
            className={`tab-btn ${tipoFilter === 'PATRON' ? 'active' : ''}`}
          >
            Patrones ({countPatrones})
          </button>
        </div>

        <button className="btn-secondary-light" onClick={selectAllFiltered}>
          Seleccionar filtrados ({filtered.length})
        </button>
      </div>

      <div className="search-box" style={{ marginBottom: 16 }}>
        <Search size={16} color="var(--text-soft)" />
        <input
          placeholder="Buscar por código, nombre o ubicación..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" />
          <p style={{ marginTop: 16, fontWeight: 600, color: 'var(--text-soft)' }}>Cargando catálogo QR...</p>
        </div>
      ) : (
        <div className="qr-grid-premium">
          {filtered.map(e => {
            const semaforo = calcularSemaforo(e.fechaProximoControl, e.estado)
            const statusColor = semaforoHex(semaforo)
            const isSelected = selectedIds.has(e.id)
            const scanUrl = getScanUrl(e.codigo)

            return (
              <div 
                key={e.id} 
                className={`qr-premium-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelect(e.id)}
              >
                <div className="card-selector">
                  {isSelected ? <CheckCircle2 size={18} color="var(--accent)" strokeWidth={3} /> : <div className="selector-circle" />}
                </div>

                <div className="qr-img-box">
                  <QRCodeSVG value={scanUrl} size={110} level="H" />
                </div>

                <div className="card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
                    <span className="type-badge-micro">{e.tipo}</span>
                    <span className="footer-code">{e.codigo}</span>
                  </div>
                  <div className="footer-name">{e.nombre}</div>
                  <div className="footer-meta">
                     <span className="status-dot" style={{ background: statusColor }} />
                     {e.area}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .tab-btn {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 750;
          color: var(--text-soft);
          cursor: pointer;
          transition: all 0.15s;
        }
        .tab-btn.active {
          background: var(--card-bg);
          color: var(--accent);
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .config-btn {
          flex: 1; border: 1.5px solid var(--glass-border); background: var(--page-bg-soft); padding: 8px; border-radius: var(--radius-md);
          font-size: 11px; font-weight: 850; color: var(--text-dim); cursor: pointer; transition: all 0.2s;
        }
        .config-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
        
        .type-badge-micro {
          font-size: 9px;
          font-weight: 800;
          background: rgba(14, 165, 233, 0.12);
          color: var(--accent);
          padding: 1px 6px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }

        .qr-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .qr-premium-card {
          background: var(--card-bg); border-radius: var(--radius-lg); border: 1px solid var(--glass-border); padding: 16px;
          display: flex; flex-direction: column; align-items: center; transition: var(--transition-smooth);
          cursor: pointer; position: relative;
        }
        .qr-premium-card.selected { border-color: var(--accent); background: var(--accent-glow); transform: scale(1.01); }
        .qr-premium-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
        
        .card-selector { position: absolute; top: 10px; right: 10px; }
        .selector-circle { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--glass-border); background: var(--page-bg-soft); }
        
        .qr-img-box { background: #fff; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--glass-border); margin-bottom: 10px; }
        
        .card-footer { text-align: center; width: 100%; }
        .footer-code { font-size: 13.5px; font-weight: 900; color: var(--text-main); }
        .footer-name { font-size: 11px; font-weight: 700; color: var(--text-soft); margin-bottom: 6px; line-height: 1.2; height: 26px; overflow: hidden; }
        .footer-meta { display: flex; alignItems: center; justifyContent: center; gap: 6px; font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }

        .btn-secondary-light { background: var(--page-bg-soft); border: 1px solid var(--glass-border); padding: 6px 12px; border-radius: var(--radius-md); font-size: 11px; font-weight: 700; color: var(--text-dim); cursor: pointer; transition: var(--transition-smooth); }
        .btn-secondary-light:hover { background: var(--alpha-08); color: var(--text-main); }
        
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        @media (max-width: 768px) {
          .header-actions { flex-direction: column; align-items: stretch !important; width: 100%; }
          .qr-grid-premium { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
          .qr-premium-card { padding: 12px; }
          .footer-code { font-size: 12.5px; }
          .qr-img-box { margin-bottom: 8px; }
          .qr-img-box :global(svg) { width: 85px !important; height: 85px !important; }
        }
      `}</style>
    </div>
  )
}
