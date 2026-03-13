'use client'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer } from 'lucide-react'
import { semaforoHex, calcularSemaforo } from '@/lib/metrologia'

interface Equipo {
  ID_Equipo: string
  Codigo_Interno: string
  Nombre_Equipo: string
  Tipo: string
  Estado: string
  Responsable?: string | null
  Area_Asignada?: string | null
  Periodicidad_Meses?: number
  Fecha_Proximo_Control?: string | null
  historiales?: { Fecha_Ejecucion: string; Resultado_Status: string; Tecnico_Ejecutor: string }[]
}

interface Props {
  equipo: Equipo
  onClose: () => void
}

export default function QRLabelModal({ equipo: e, onClose }: Props) {
  const semaforo = calcularSemaforo(e.Fecha_Proximo_Control ?? null)
  const statusColor = semaforoHex(semaforo)
  const statusLabel = semaforo === 'VERDE' ? 'AL DÍA' : semaforo === 'AMARILLO' ? 'PRÓXIMO VENCIM.' : 'VENCIDO'

  function handlePrint() {
    const w = window.open('', '_blank', 'width=400,height=500')
    if (!w) return
    const svgEl = document.getElementById('qr-label-svg')
    const svgHtml = svgEl ? svgEl.outerHTML : ''

    w.document.write(`<!DOCTYPE html><html><head>
      <title>Etiqueta ${e.Codigo_Interno}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .label { width: 300px; padding: 20px; border: 2px solid ${statusColor}; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .qr-wrap { background: #fff; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info { text-align: center; width: 100%; }
        .header-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 4px; }
        .info-code { font-size: 28px; font-weight: 900; color: #0f172a; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; color: #fff; background: ${statusColor}; white-space: nowrap; }
        .info-name { font-size: 14px; font-weight: 700; color: #64748b; line-height: 1.2; }
        .footer { margin-top: 8px; font-size: 9px; color: #94a3b8; }
      </style>
    </head><body>
      <div class="label">
        <div class="qr-wrap">${svgHtml}</div>
        <div class="info">
          <div class="header-row">
            <span class="info-code">${e.Codigo_Interno}</span>
            <span class="status-badge">${statusLabel}</span>
          </div>
          <div class="info-name">${e.Nombre_Equipo}</div>
          <div class="footer">Polifusion Metrology Control PRO</div>
        </div>
      </div>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 800)
  }

  const scanUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/escaneo?id=${e.Codigo_Interno}` : e.Codigo_Interno

  return (
    <div 
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', width: 440, maxWidth: '95vw', maxHeight: '90vh', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease-out', display: 'flex', flexDirection: 'column' }}
        onClick={ev => ev.stopPropagation()}
      >
        {/* Header - Compacto */}
        <div style={{ background: '#0f172a', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>Etiqueta de Activo</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', padding: 6, borderRadius: 8 }}>
            <X size={18} />
          </button>
        </div>

        {/* Preview Area - Compacta */}
        <div style={{ padding: '24px', background: '#f1f5f9', display: 'flex', flexDirecton: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ 
            background: '#fff', borderRadius: 20, border: `3px solid ${statusColor}`, 
            padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%'
          }}>
            {/* QR - Más Grande */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
              <QRCodeSVG
                id="qr-label-svg"
                value={scanUrl}
                size={220}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                style={{ display: 'block' }}
              />
            </div>

            {/* Simple Info - Estado al lado del código */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{e.Codigo_Interno}</span>
                <span style={{ 
                  display: 'inline-block', padding: '6px 14px', borderRadius: '30px', 
                  color: '#fff', background: statusColor, fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em',
                  boxShadow: `0 4px 10px ${statusColor}44`
                }}>{statusLabel}</span>
              </div>
              <div style={{ fontSize: '16px', color: '#64748b', fontWeight: 700, lineHeight: 1.3, maxWidth: '300px', margin: '0 auto' }}>{e.Nombre_Equipo}</div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Siempre Visibles */}
        <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
          <button 
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#64748b', fontSize: 13 }}
          >
            Cerrar
          </button>
          <button 
            onClick={handlePrint}
            style={{ flex: 1.5, padding: '12px', borderRadius: 12, border: 'none', background: '#0ea5e9', cursor: 'pointer', fontWeight: 800, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)' }}
          >
            <Printer size={18} />
            Imprimir Etiqueta
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  )
}
