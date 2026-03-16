'use client'
import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, XCircle, Search, ShieldCheck, FileDigit, Activity, RefreshCw, Camera, AlertCircle, Settings, ChevronRight } from 'lucide-react'
import { calcularSemaforo, semaforoHex, semaforoLabel, formatFecha, diasRestantes } from '@/lib/metrologia'
import VerificationModal from '@/components/VerificationModal'

interface PrintableAsset {
  id: string
  codigo: string
  nombre: string
  tipo: string
  subtipo?: string
  estado: string
  ubicacion?: string
  responsable?: string
  fechaUltima: string | null
  fechaProxima: string | null
  periodicidad?: number
  tolerancia?: string
  isPatron: boolean
  original?: any
}

export default function EscaneoPage() {
  const [equipos, setEquipos] = useState<PrintableAsset[]>([])
  const [codigoIngresado, setCodigoIngresado] = useState('')
  const [encontrado, setEncontrado] = useState<PrintableAsset | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  // Resiliencia avanzada
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [showTroubleshooter, setShowTroubleshooter] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const assetsRef = useRef<PrintableAsset[]>([])
  const isInitializing = useRef(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resEquipos, resPatrones] = await Promise.all([
          fetch('/api/equipos').then(r => r.json()),
          fetch('/api/patrones').then(r => r.json())
        ])

        const normalized: PrintableAsset[] = [
          ...resEquipos.map((e: any) => ({
            id: e.ID_Equipo,
            codigo: e.Codigo_Interno,
            nombre: e.Nombre_Equipo,
            tipo: 'EQUIPO/INSTRUMENTO',
            subtipo: e.Tipo,
            estado: e.Estado,
            ubicacion: e.Area_Asignada,
            responsable: e.Responsable,
            fechaUltima: e.Fecha_Ultima_Verificacion,
            fechaProxima: e.Fecha_Proximo_Control,
            periodicidad: e.Periodicidad_Meses,
            tolerancia: `±${e.Tolerancia_Aceptable} ${e.Unidad_Tolerancia || ''}`,
            isPatron: false,
            original: e
          })),
          ...resPatrones.map((p: any) => ({
            id: p.ID_Patron,
            codigo: p.Codigo,
            nombre: p.Nombre_Patron,
            tipo: 'PATRÓN DE REFERENCIA',
            estado: p.Estado_Vigencia === 'VIGENTE' ? 'OPERATIVO' : 'FUERA_SERVICIO',
            fechaUltima: p.Fecha_Calibracion_Externa,
            fechaProxima: p.Fecha_Vencimiento_Certificado,
            isPatron: true,
            original: p
          }))
        ]

        setEquipos(normalized as any)
        assetsRef.current = normalized
        setIsLoading(false)
      } catch (err) {
        console.error("Error loading data", err)
      }
    }

    loadData()
    // ... rest
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          setAvailableCameras(videoDevices)
        })
        .catch(console.error)
    }

    return () => {
      forceStopHardware()
    }
  }, [])

  const forceStopHardware = async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try { await scannerRef.current.stop() } catch (err) {}
      }
    }
    // Parada a bajo nivel
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
       try {
         const streams = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null)
         if (streams) {
           streams.getTracks().forEach(track => track.stop())
         }
       } catch(e) {}
    }
    setCameraActive(false)
  }

  const startScanner = async () => {
    if (isInitializing.current || cameraActive) return

    isInitializing.current = true
    setCameraError(null)

    try {
      const readerElement = document.getElementById("reader")
      if (!readerElement) {
        isInitializing.current = false
        return
      }

      // Limpieza profunda
      if (scannerRef.current) {
        try { if (scannerRef.current.isScanning) await scannerRef.current.stop() } catch(e) {}
      } else {
        scannerRef.current = new Html5Qrcode("reader")
      }

      const config = { fps: 15, qrbox: { width: 250, height: 250 } }
      
      // Prioridad: Cámara seleccionada -> FacingMode
      if (selectedCameraId) {
        await scannerRef.current.start(
            selectedCameraId,
            config,
            (decodedText) => handleOnScanSuccess(decodedText),
            () => {}
          )
      } else {
        await scannerRef.current.start(
            { facingMode: "environment" },
            config,
            (decodedText) => handleOnScanSuccess(decodedText),
            () => {}
          )
      }
      
      setCameraActive(true)
      setShowTroubleshooter(false)
    } catch (err: any) {
      console.error("Scanner startup error:", err)
      const msg = err.message || err.toString()
      
      if (msg.includes('NotReadableError')) {
        setCameraError("Cámara bloqueada por el sistema. Puede que otra pestaña o aplicación la esté usando.")
        setShowTroubleshooter(true)
      } else if (msg.includes('NotAllowedError')) {
        setCameraError("Permiso denegado. Por favor, habilita la cámara en los ajustes del navegador.")
      } else {
        setCameraError("Error de inicialización: " + msg)
      }
      setCameraActive(false)
      
      // Re-intentar una vez con un delay
      if (msg.includes('NotReadableError') && !selectedCameraId) {
          console.warn("Retrying in 2s...")
      }
    } finally {
      isInitializing.current = false
    }
  }



  const handleOnScanSuccess = async (decodedText: string) => {
    const found = assetsRef.current.find(e => 
      e.codigo.toUpperCase() === decodedText.toUpperCase() || 
      e.id.toUpperCase() === decodedText.toUpperCase()
    )
    
    if (found) { 
      setCodigoIngresado(decodedText)
      setEncontrado(found as any)
      setNotFound(false)
      await forceStopHardware()
    } else {
      setNotFound(true)
    }
  }

  function handleSearch() {
    const q = codigoIngresado.trim().toUpperCase()
    if (!q) return
    const found = assetsRef.current.find(e => e.codigo.toUpperCase() === q || e.id.toUpperCase() === q)
    if (found) { 
      setEncontrado(found as any)
      setNotFound(false)
      forceStopHardware()
    } else { 
      setEncontrado(null)
      setNotFound(true) 
    }
  }

  const handleReset = () => {
    forceStopHardware()
    setEncontrado(null)
    setCodigoIngresado('')
    setNotFound(false)
    setCameraError(null)
    setShowTroubleshooter(false)
  }

  const sLabel = encontrado ? semaforoLabel(calcularSemaforo((encontrado as unknown as PrintableAsset).fechaProxima)) : ''
  const sColor = encontrado ? semaforoHex(calcularSemaforo((encontrado as unknown as PrintableAsset).fechaProxima)) : ''
  const assetFound = encontrado as unknown as PrintableAsset

  return (
    <div className="escaneo-container">
      <div className="page-header">
        <div className="page-header-icon"><ScanLine size={22} /></div>
        <div>
          <h1>Consulta de Activos v13</h1>
          <p>Potenciado con Resiliencia de Hardware</p>
        </div>
      </div>

      {!encontrado ? (
        <div className="scanner-section">
          <div className="scanner-main-card">
            <div className="scanner-visual">
              <div id="reader" style={{ width: '100%', minHeight: '400px', background: '#000' }}></div>
              
              {!cameraActive && !cameraError && (
                <div className="camera-placeholder" onClick={startScanner}>
                  <div className="btn-activate-pulse">
                    <Camera size={48} />
                  </div>
                  <p className="placeholder-title">Activar Escáner</p>
                  <p className="placeholder-hint">Haz clic para vincular hardware</p>
                </div>
              )}

              {cameraError && (
                <div className="camera-error-view">
                  <div className="error-icon-box">
                    <AlertCircle size={48} />
                  </div>
                  <h3>Conflicto de Hardware</h3>
                  <p className="error-msg">{cameraError}</p>
                  
                  <div className="error-actions">
                    <button onClick={startScanner} className="btn-retry">
                      <RefreshCw size={18} /> Reintentar Vinculación
                    </button>
                    <button onClick={() => setShowTroubleshooter(!showTroubleshooter)} className="btn-troubleshoot">
                      {showTroubleshooter ? 'Ocultar Ayuda' : 'Solucionar Problema'}
                    </button>
                  </div>

                  {showTroubleshooter && (
                    <div className="troubleshooter-panel">
                        <div className="t-item">
                            <ChevronRight size={14} />
                            <span>Cierra pestañas de Meet, Zoom o Teams.</span>
                        </div>
                        <div className="t-item">
                            <ChevronRight size={14} />
                            <span>Verifica que otra página de Metrología no esté abierta.</span>
                        </div>
                        {availableCameras.length > 1 && (
                            <div className="camera-selector">
                                <label>Cambiar Cámara:</label>
                                <select 
                                    value={selectedCameraId || ''} 
                                    onChange={(e) => { setSelectedCameraId(e.target.value); startScanner(); }}
                                >
                                    <option value="">Selección Automática</option>
                                    {availableCameras.map(c => (
                                        <option key={c.deviceId} value={c.deviceId}>{c.label || `Cámara ${c.deviceId.slice(0,5)}`}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {cameraActive && (
                <div className="scanner-overlay shadow-pulse">
                   <div className="scanner-line" />
                   <button className="btn-settings-overlay" onClick={() => setShowTroubleshooter(!showTroubleshooter)}>
                      <Settings size={20} />
                   </button>
                </div>
              )}
            </div>
            
            <div className="scanner-controls">
              <div className="search-box-premium">
                <Search size={22} className="search-icon" />
                <input
                  placeholder="Escribe ID o Código Interno..."
                  value={codigoIngresado}
                  onChange={e => { setCodigoIngresado(e.target.value); setNotFound(false) }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="btn-search-trigger">Consultar</button>
              </div>

              {notFound && (
                <div className="not-found-alert">
                  <XCircle size={18} /> No existe el código "{codigoIngresado}"
                </div>
              )}

              <p className="scanner-hint">La búsqueda manual siempre está disponible como respaldo</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="ficha-tecnica-focus">
          <div className="ficha-card">
            <div className="ficha-header" style={{ borderLeft: `8px solid ${sColor}`, padding: '24px 20px' }}>
              <div className="ficha-header-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="code-badge" style={{ marginBottom: 0 }}>{assetFound.codigo}</span>
                  <span className="type-tag" style={{ background: 'var(--snow-2)', color: 'var(--text-soft)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>{assetFound.subtipo || assetFound.tipo}</span>
                </div>
                <h2 style={{ fontSize: 24, margin: '0 0 4px 0' }}>{assetFound.nombre}</h2>
                <div className="area-tag" style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600 }}>{assetFound.ubicacion || 'Ubicación General'}</div>
              </div>
              <div className="status-indicator-compact" style={{ textAlign: 'right' }}>
                <div className="status-text" style={{ color: sColor, fontSize: 10, marginBottom: 4 }}>{sLabel}</div>
                <div className="status-dot-large" style={{ background: sColor, boxShadow: `0 0 20px ${sColor}66`, width: 16, height: 16, marginLeft: 'auto' }} />
              </div>
            </div>

            <div className="next-verification-hero" style={{ 
              background: `${sColor}11`, 
              margin: '0 20px 10px', 
              padding: '20px', 
              borderRadius: 20, 
              border: `1px dashed ${sColor}44`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próxima Verificación</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{formatFecha(assetFound.fechaProxima)}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: sColor }}>{diasRestantes(assetFound.fechaProxima)}</div>
            </div>

            <div className="last-verification-strip" style={{ 
              background: '#f8fafc',
              margin: '0 20px 20px',
              padding: '12px 20px',
              borderRadius: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {assetFound.isPatron ? 'Última Calibración' : 'Última Verificación'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                {formatFecha(assetFound.fechaUltima) || 'No registrada'}
              </span>
            </div>

            <div className="ficha-grid">
              {!assetFound.isPatron && (
                <div className="ficha-spec-card" style={{ padding: '16px' }}>
                  <div className="spec-title" style={{ fontSize: 11, marginBottom: 12 }}><FileDigit size={14} /> Datos del Equipo</div>
                  <div className="spec-item-compact"><label>Responsable</label><span>{assetFound.responsable || 'No asignado'}</span></div>
                  <div className="spec-item-compact"><label>Tolerancia</label><span>{assetFound.tolerancia}</span></div>
                  <div className="spec-item-compact"><label>ID Sistema</label><span style={{ fontSize: 12, opacity: 0.6 }}>{assetFound.id}</span></div>
                </div>
              )}

              <div className="ficha-spec-card" style={{ padding: '16px' }}>
                <div className="spec-title" style={{ fontSize: 11, marginBottom: 12 }}><Activity size={14} /> Control y Estatus</div>
                <div className="spec-item-compact"><label>Periodicidad</label><span>{assetFound.periodicidad ? `Cada ${assetFound.periodicidad} meses` : 'N/A'}</span></div>
                <div className="spec-item-compact"><label>Estado Actual</label><span style={{ color: sColor }}>{assetFound.estado}</span></div>
              </div>
            </div>

            <div className="ficha-actions">
              {!assetFound.isPatron && (
                <button className="btn btn-cyan btn-xl" onClick={() => setShowModal(true)}>
                  <ShieldCheck size={20} /> Registrar Verificación
                </button>
              )}
              <button className="btn btn-ghost" onClick={handleReset}>
                <RefreshCw size={18} /> Escanear otro QR
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && assetFound.original && (
        <VerificationModal
          equipo={assetFound.original}
          equipos={assetsRef.current.map(a => a.original).filter(Boolean)}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); handleReset(); }}
        />
      )}

      <style jsx>{`
        .escaneo-container { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
        .scanner-main-card { background: #fff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid var(--snow-3); }
        .scanner-visual { background: #000; min-height: 440px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        
        .camera-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: #fff; cursor: pointer; z-index: 20; transition: 0.3s; }
        .camera-placeholder:hover { background: #1e293b; }
        .placeholder-title { font-size: 20px; font-weight: 800; margin-top: 20px; }
        .placeholder-hint { font-size: 13px; opacity: 0.6; margin-top: 4px; }
        
        .btn-activate-pulse { width: 90px; height: 90px; background: var(--accent); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: btnPulse 2s infinite; }
        @keyframes btnPulse { 0% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.4); } 70% { box-shadow: 0 0 0 25px rgba(0, 229, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0); } }

        .camera-error-view { position: absolute; inset: 0; background: rgba(15,23,42,0.98); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 30px; z-index: 50; }
        .error-icon-box { color: #ef4444; margin-bottom: 20px; }
        .error-msg { color: #94a3b8; margin: 8px 0 24px; max-width: 340px; text-align: center; font-size: 14px; }
        
        .error-actions { display: flex; gap: 12px; margin-bottom: 24px; }
        .btn-retry { background: var(--accent); color: #000; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 800; display: flex; gap: 8px; align-items: center; cursor: pointer; }
        .btn-troubleshoot { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; }

        .troubleshooter-panel { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); width: 100%; max-width: 360px; text-align: left; }
        .t-item { display: flex; gap: 8px; font-size: 12px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.4; }
        .camera-selector { margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
        .camera-selector label { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
        .camera-selector select { width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 10px; border-radius: 10px; outline: none; }

        .scanner-overlay { position: absolute; width: 260px; height: 260px; border: 3px solid var(--accent); border-radius: 24px; pointer-events: none; z-index: 10; }
        .scanner-line { width: 90%; height: 2px; background: linear-gradient(to right, transparent, var(--accent), transparent); box-shadow: 0 0 15px var(--accent); position: absolute; left: 5%; animation: scan 2s infinite ease-in-out; }
        @keyframes scan { 0%, 100% { transform: translateY(20px); opacity: 0; } 50% { transform: translateY(240px); opacity: 1; } }
        .shadow-pulse { box-shadow: 0 0 60px rgba(0,229,255,0.2); animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 40px rgba(0,229,255,0.2); } 50% { box-shadow: 0 0 80px rgba(0,229,255,0.4); } }
        
        .btn-settings-overlay { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.5); color: #fff; border: none; padding: 10px; border-radius: 12px; cursor: pointer; pointer-events: auto; }

        .scanner-controls { padding: 40px; background: #fff; }
        .search-box-premium { display: flex; gap: 12px; background: #f1f5f9; padding: 8px 12px 8px 24px; border-radius: 20px; margin-bottom: 24px; }
        .search-box-premium input { flex: 1; border: none; background: transparent; padding: 12px 0; font-size: 16px; font-weight: 600; outline: none; }
        .btn-search-trigger { background: var(--accent); color: #000; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 800; cursor: pointer; }
        .not-found-alert { background: #fff1f2; color: #e11d48; padding: 14px; border-radius: 14px; margin-bottom: 24px; display: flex; gap: 10px; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
        .scanner-hint { color: #64748b; font-size: 13px; font-weight: 500; text-align: center; }

        .ficha-card { background: #fff; border-radius: 32px; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid var(--snow-3); animation: slideUp 0.4s ease-out; }
        .ficha-header { padding: 40px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .code-badge { background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 14px; margin-bottom: 12px; display: inline-block; }
        .ficha-header h2 { font-size: 32px; font-weight: 900; margin: 0 0 12px; letter-spacing: -0.02em; }
        .meta-info { display: flex; gap: 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .status-dot-large { width: 24px; height: 24px; border-radius: 50%; margin: 0 auto 8px; }
        .status-text { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
        
        .ficha-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 40px; }
        .ficha-spec-card { background: #f8fafc; border-radius: 20px; padding: 24px; border: 1px solid #f1f5f9; }
        .spec-title { font-size: 13px; font-weight: 800; color: #475569; display: flex; gap: 8px; margin-bottom: 20px; text-transform: uppercase; }
        .spec-item { margin-bottom: 16px; }
        .spec-item label { display: block; font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
        .spec-item span { font-size: 16px; font-weight: 700; color: #1e293b; }
        
        .ficha-actions { padding: 0 20px 30px; display: flex; flex-direction: column; gap: 12px; }
        .btn-xl { padding: 20px !important; font-size: 16px !important; font-weight: 900 !important; border-radius: 16px !important; background: var(--accent) !important; color: #000 !important; box-shadow: 0 15px 30px -10px rgba(0,229,255,0.4) !important; border:none !important; cursor: pointer; }
        
        .spec-item-compact { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--snow-2); }
        .spec-item-compact:last-child { border-bottom: none; }
        .spec-item-compact label { font-size: 11px; color: var(--text-soft); font-weight: 700; }
        .spec-item-compact span { font-size: 13px; font-weight: 700; color: var(--text-main); }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 640px) {
          .ficha-grid { grid-template-columns: 1fr; }
          .ficha-header { flex-direction: column; align-items: flex-start; gap: 20px; }
        }
      `}</style>
    </div>
  )
}
