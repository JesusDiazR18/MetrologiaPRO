'use client'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer } from 'lucide-react'
import { semaforoHex, calcularSemaforo } from '@/lib/metrologia'

interface PrintableAsset {
  id: string
  code: string
  name: string
  status: string
  statusLabel: string
  statusColor: string
  nextDate?: string | null
}

interface Props {
  asset: PrintableAsset
  onClose: () => void
}

export default function QRLabelModal({ asset: a, onClose }: Props) {
  const statusColor = a.statusColor
  const statusLabel = a.statusLabel

  function handlePrint() {
    const w = window.open('', '_blank', 'width=400,height=500')
    if (!w) return
    const svgEl = document.getElementById('qr-label-svg')
    const svgHtml = svgEl ? svgEl.outerHTML : ''

    w.document.write(`<!DOCTYPE html><html><head>
      <title>Etiqueta ${a.code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .label { width: 300px; padding: 24px; border: 3px solid ${statusColor}; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; }
        .qr-wrap { background: #fff; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .info-code { font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1; }
        .status-badge { padding: 6px 14px; border-radius: 30px; font-size: 11px; font-weight: 800; color: #fff; background: ${statusColor}; text-transform: uppercase; }
        .info-name { font-size: 16px; font-weight: 700; color: #475569; line-height: 1.2; margin-top: 4px; }
        .footer { margin-top: 12px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
      </style>
    </head><body>
      <div class="label">
        <div class="qr-wrap">${svgHtml}</div>
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
          <span class="info-code">${a.code}</span>
          <span class="status-badge">${statusLabel}</span>
        </div>
        <div class="info-name">${a.name}</div>
        <div class="footer">Polifusion Metrology PRO</div>
      </div>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 800)
  }

  const scanUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/escaneo?id=${a.code}` : a.code

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
        <div style={{ padding: '24px', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
                <span style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{a.code}</span>
                <span style={{ 
                  display: 'inline-block', padding: '6px 14px', borderRadius: '30px', 
                  color: '#fff', background: statusColor, fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em',
                  boxShadow: `0 4px 10px ${statusColor}44`,
                  textTransform: 'uppercase'
                }}>{statusLabel}</span>
              </div>
              <div style={{ fontSize: '16px', color: '#64748b', fontWeight: 700, lineHeight: 1.3, maxWidth: '300px', margin: '0 auto' }}>{a.name}</div>
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
