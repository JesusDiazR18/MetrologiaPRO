'use client'
import { useEffect, useState } from 'react'
import { QrCode, Printer, Search, CheckCircle2, Settings2, Trash2, X, Scaling, Grid3X3, Layers } from 'lucide-react'
import { calcularSemaforo, semaforoHex, getScanUrl } from '@/lib/metrologia'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  
  // Opciones de Impresión
  const [printSize, setPrintSize] = useState<'STANDARD' | 'MINI'>('STANDARD')
  const [printCols, setPrintCols] = useState(3)
  const [printGaps, setPrintGaps] = useState(10) // mm

  useEffect(() => {
    let active = true
    fetch('/api/equipos')
      .then(r => r.json())
      .then(data => {
        if (active) {
          if (Array.isArray(data)) {
            setEquipos(data)
          } else {
            console.error("QR Codes API returned non-array:", data)
            setEquipos([])
          }
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

  const allActive = equipos // Permitir imprimir todos, el filtro ya se encarga de buscar
  
  const filtered = allActive.filter(e => {
    const matchSearch = !search || 
      e.Codigo_Interno.toLowerCase().includes(search.toLowerCase()) ||
      e.Nombre_Equipo.toLowerCase().includes(search.toLowerCase()) ||
      (e.Area_Asignada ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || e.Tipo === filter
    return matchSearch && matchFilter
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectAllFiltered = () => {
    const next = new Set(selectedIds)
    filtered.forEach(e => next.add(e.ID_Equipo))
    setSelectedIds(next)
  }

  const clearSelection = () => setSelectedIds(new Set())

  function generatePrintHTML(targetEquipos: Equipo[]) {
    const sizeMap = {
      STANDARD: { w: 60, h: 40, qr: 100, fontCode: 14, fontName: 8 },
      MINI: { w: 30, h: 18, qr: 50, fontCode: 9, fontName: 6 }
    }[printSize]

    let labelsHTML = ''
    targetEquipos.forEach(e => {
      const qrUrl = getScanUrl(e.Codigo_Interno)
      const qrData = encodeURIComponent(qrUrl)
      
      labelsHTML += `
        <div class="label">
          <div class="qr-wrap">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}" style="width: ${sizeMap.qr}px; height: ${sizeMap.qr}px;" />
          </div>
          <div class="info">
            <div class="info-code" style="font-size: ${sizeMap.fontCode}pt">${e.Codigo_Interno}</div>
            <div class="info-name" style="font-size: ${sizeMap.fontName}pt">${e.Nombre_Equipo}</div>
          </div>
        </div>
      `
    })

    return `<!DOCTYPE html><html><head>
      <title>QMS - Impresión de Etiquetas</title>
      <style>
        @page { margin: 0; size: auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #fff; padding: 15mm; }
        .grid { 
          display: grid; 
          grid-template-columns: repeat(${printCols}, 1fr); 
          gap: ${printGaps}mm; 
          justify-items: center;
        }
        .label { 
          width: ${sizeMap.w}mm; 
          height: ${sizeMap.h}mm; 
          border: 1px solid #eee; 
          padding: 3mm; 
          display: flex; 
          flex-direction: ${printSize === 'MINI' ? 'row' : 'column'}; 
          align-items: center; 
          justify-content: center; 
          gap: 3mm; 
          page-break-inside: avoid;
          background: #fff;
          border-radius: 2mm;
        }
        .qr-wrap { display: flex; align-items: center; justify-content: center; }
        .info { text-align: ${printSize === 'MINI' ? 'left' : 'center'}; flex: 1; }
        .info-code { font-weight: 900; color: #000; letter-spacing: -0.02em; text-align: center; margin-bottom: 2px; }
        .info-name { font-weight: 700; color: #444; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: center; }
        @media print {
          body { padding: 10mm; }
          .label { border: 1px solid #eee; }
        }
      </style>
    </head><body><div class="grid">${labelsHTML}</div></body></html>`
  }

  const handlePrintSelected = () => {
    const targetEquipos = allActive.filter(e => selectedIds.has(e.ID_Equipo))
    if (targetEquipos.length === 0) return alert('Selecciona al menos un equipo')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(generatePrintHTML(targetEquipos))
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 1000)
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', position: 'relative' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' }}>
          <QrCode size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em' }}>Galería de Etiquetas QR</h1>
          <p style={{ color: '#64748b', fontWeight: 500 }}>Impresión masiva y gestión de activos para auditoría</p>
        </div>

        <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <div className="selection-badge" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{selectedIds.size} seleccionados</span>
              <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer' }}><X size={14} /></button>
            </div>
          )}
          
          <div className="filter-group-premium" style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 14 }}>
            {(['ALL', 'EQUIPO', 'INSTRUMENTO'] as const).map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
                style={{
                  border: 'none', background: filter === f ? '#fff' : 'transparent',
                  padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  color: filter === f ? '#0f172a' : '#64748b', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: filter === f ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {f === 'ALL' ? 'Todos' : f === 'EQUIPO' ? 'Equipos' : 'Instr.'}
              </button>
            ))}
          </div>

          <button 
            className="btn-print-master" 
            onClick={() => setShowPrintOptions(!showPrintOptions)}
            style={{ 
              background: '#0f172a', color: '#fff', border: 'none', padding: '12px 20px', 
              borderRadius: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)', cursor: 'pointer'
            }}
          >
            <Printer size={18} color="var(--accent)" />
            {selectedIds.size > 0 ? 'Configurar Impresión' : 'Imprimir Etiquetas'}
          </button>
        </div>
      </div>

      {showPrintOptions && (
        <div className="print-config-panel" style={{ 
          background: '#fff', borderRadius: 20, padding: 24, marginBottom: 32,
          border: '2px solid #f1f5f9', boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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
            <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Grid3X3 size={14} /> Columnas por Hoja
            </label>
            <input 
              type="range" min="1" max="5" value={printCols} 
              onChange={e => setPrintCols(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{printCols} Columnas</div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Layers size={14} /> Espaciado (mm)
            </label>
            <input 
              type="number" value={printGaps} 
              onChange={e => setPrintGaps(parseInt(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={handlePrintSelected}
              style={{ width: '100%', background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: '#fff', border: 'none', padding: '14px', borderRadius: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              🚀 Iniciar Impresión de {selectedIds.size || filtered.length} etiquetas
            </button>
          </div>
        </div>
      )}

      {/* Global Selection Info */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <button className="btn-secondary-light" onClick={selectAllFiltered}>
            Seleccionar todos los filtrados ({filtered.length})
          </button>
      </div>

      <div className="topbar-search-modern" style={{ position: 'relative', marginBottom: 32 }}>
        <Search style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
        <input
          placeholder="Filtrar por código, nombre, área o responsable..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '18px 24px 18px 56px', borderRadius: 20, border: '2px solid #f1f5f9',
            fontSize: 16, fontWeight: 500, outline: 'none', transition: 'all 0.2s', background: '#fff'
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <div className="spinner" />
          <p style={{ marginTop: 20, fontWeight: 600, color: '#64748b' }}>Cargando activos...</p>
        </div>
      ) : (
        <div className="qr-grid-premium">
          {filtered.map(e => {
            const semaforo = calcularSemaforo(e.Fecha_Proximo_Control, e.Estado)
            const statusColor = semaforoHex(semaforo)
            const isSelected = selectedIds.has(e.ID_Equipo)
            const scanUrl = getScanUrl(e.Codigo_Interno)

            return (
              <div 
                key={e.ID_Equipo} 
                className={`qr-premium-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelect(e.ID_Equipo)}
              >
                <div className="card-selector">
                  {isSelected ? <CheckCircle2 size={24} color="#0ea5e9" strokeWidth={3} /> : <div className="selector-circle" />}
                </div>

                <div className="qr-img-box">
                  <QRCodeSVG value={scanUrl} size={150} level="H" />
                </div>

                <div className="card-footer">
                  <div className="footer-code">{e.Codigo_Interno}</div>
                  <div className="footer-name">{e.Nombre_Equipo}</div>
                  <div className="footer-meta">
                     <span className="status-dot" style={{ background: statusColor }} />
                     {e.Area_Asignada || 'General'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .config-btn {
          flex: 1; border: 2px solid #f1f5f9; background: #fff; padding: 10px; border-radius: 12px;
          font-size: 11px; font-weight: 800; color: #64748b; cursor: pointer; transition: all 0.2s;
        }
        .config-btn.active { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
        
        .qr-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 24px;
        }
        .qr-premium-card {
          background: #fff; border-radius: 24px; border: 2px solid #f1f5f9; padding: 24px;
          display: flex; flex-direction: column; align-items: center; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer; position: relative;
        }
        .qr-premium-card.selected { border-color: #0ea5e9; background: #f0f9ff; transform: scale(1.02); }
        .qr-premium-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.06); }
        
        .card-selector { position: absolute; top: 16px; right: 16px; }
        .selector-circle { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #e2e8f0; background: #fff; }
        
        .qr-img-box { background: #fff; padding: 12px; border-radius: 16px; border: 1px solid #f1f5f9; margin-bottom: 20px; }
        
        .card-footer { text-align: center; width: 100%; }
        .footer-code { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
        .footer-name { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 12px; line-height: 1.2; height: 28px; overflow: hidden; }
        .footer-meta { display: flex; alignItems: center; justifyContent: center; gap: 8px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }

        .btn-secondary-light { background: #f1f5f9; border: none; padding: 10px 18px; borderRadius: 12px; fontSize: 12px; fontWeight: 700; color: #475569; cursor: pointer; }
        
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        @media (max-width: 768px) {
          .header-actions { flex-direction: column; align-items: stretch !important; width: 100%; }
          .qr-grid-premium { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
          .qr-premium-card { padding: 16px; }
          .footer-code { font-size: 15px; }
          .qr-img-box { margin-bottom: 12px; }
          .qr-img-box :global(svg) { width: 100px !important; height: 100px !important; }
        }
      `}</style>
    </div>
  )
}
