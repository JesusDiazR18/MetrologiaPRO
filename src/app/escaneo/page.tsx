'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, XCircle, Search, ShieldCheck, FileDigit, Activity, RefreshCw, Camera, AlertCircle, Settings, ChevronRight } from 'lucide-react'
import { calcularSemaforo, semaforoHex, semaforoLabel, formatFecha, diasRestantes } from '@/lib/metrologia'
import VerificationModal from '@/components/VerificationModal'
import PublicVisor from '@/components/PublicVisor'

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

function EscaneoContent() {
  const searchParams = useSearchParams()
  const queryCode = searchParams.get('id') || searchParams.get('q')
  const isExternal = !!searchParams.get('ext')

  const [equipos, setEquipos] = useState<PrintableAsset[]>([])
  const [codigoIngresado, setCodigoIngresado] = useState('')
  const [encontrado, setEncontrado] = useState<PrintableAsset | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
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
            codigo: e.ID_Equipo,
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

        setEquipos(normalized)
        assetsRef.current = normalized
        setIsLoading(false)

        const codeParam = searchParams.get('id') || searchParams.get('q')
        if (codeParam) {
          const found = normalized.find(e => 
            e.codigo.toUpperCase() === codeParam.toUpperCase() || 
            e.id.toUpperCase() === codeParam.toUpperCase()
          )
          if (found) {
            setEncontrado(found)
            setCodigoIngresado(codeParam)
          }
        }
      } catch (err) {
        console.error("Error loading data", err)
      }
    }

    loadData()
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          setAvailableCameras(videoDevices)
        })
        .catch(console.error)
    }

    return () => { forceStopHardware() }
  }, [searchParams])

  const forceStopHardware = async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try { await scannerRef.current.stop() } catch (err) {}
      }
    }
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
      if (!document.getElementById("reader")) {
        isInitializing.current = false; return
      }
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader")
      }
      const config = { fps: 15, qrbox: { width: 250, height: 250 } }
      if (selectedCameraId) {
        await scannerRef.current.start(selectedCameraId, config, (txt) => handleOnScanSuccess(txt), () => {})
      } else {
        await scannerRef.current.start({ facingMode: "environment" }, config, (txt) => handleOnScanSuccess(txt), () => {})
      }
      setCameraActive(true)
      setShowTroubleshooter(false)
    } catch (err: any) {
      setCameraError(err.message || err.toString())
      setCameraActive(false)
    } finally {
      isInitializing.current = false
    }
  }

  const handleOnScanSuccess = async (decodedText: string) => {
    let searchCode = decodedText
    try {
      if (decodedText.includes('?id=')) {
        const urlParams = new URLSearchParams(decodedText.split('?')[1])
        const id = urlParams.get('id')
        if (id) searchCode = id
      } else if (decodedText.includes('?q=')) {
        const urlParams = new URLSearchParams(decodedText.split('?')[1])
        const q = urlParams.get('q')
        if (q) searchCode = q
      }
    } catch (e) {}

    const found = assetsRef.current.find(e => 
      e.codigo.toUpperCase() === searchCode.toUpperCase() || 
      e.id.toUpperCase() === searchCode.toUpperCase()
    )
    if (found) { 
      setCodigoIngresado(searchCode)
      setEncontrado(found)
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
      setEncontrado(found)
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
  }

  const assetFound = encontrado
  let sLabel = ''
  let sColor = ''
  if (assetFound) {
    const sm = calcularSemaforo(assetFound.fechaProxima, assetFound.estado)
    sLabel = semaforoLabel(sm, assetFound.estado)
    sColor = semaforoHex(sm)
  }

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
                  <div className="btn-activate-pulse"><Camera size={48} /></div>
                  <p className="placeholder-title">Activar Escáner</p>
                </div>
              )}
              {cameraError && (
                <div className="camera-error-view">
                   <AlertCircle size={40} color="#ef4444" />
                   <h3>Error de Cámara</h3>
                   <button onClick={startScanner} className="btn-retry">Reintentar</button>
                </div>
              )}
              {cameraActive && <div className="scanner-overlay shadow-pulse"><div className="scanner-line" /></div>}
            </div>
            <div className="scanner-controls">
              <div className="search-box-premium">
                <Search size={22} className="search-icon" />
                <input placeholder="Escribe ID o Código..." value={codigoIngresado} onChange={e => setCodigoIngresado(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                <button onClick={handleSearch} className="btn-search-trigger">Consultar</button>
              </div>
              {notFound && <div className="not-found-alert">No existe el código "{codigoIngresado}"</div>}
            </div>
          </div>
        </div>
      ) : (
        (isExternal && assetFound) ? (
          <PublicVisor equipo={assetFound.original} />
        ) : assetFound ? (
          <div className="ficha-tecnica-focus">
            <div className="ficha-card">
              <div className="ficha-header" style={{ borderLeft: `8px solid ${sColor}`, padding: '24px 20px' }}>
                <div>
                  <span className="code-badge">{assetFound.codigo}</span>
                  <h2>{assetFound.nombre}</h2>
                  <div className="area-tag">{assetFound.ubicacion || 'Ubicación General'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: sColor, fontSize: 10, fontWeight: 800 }}>{sLabel}</div>
                  <div style={{ background: sColor, width: 16, height: 16, borderRadius: '50%', marginLeft: 'auto', marginTop: 4 }} />
                </div>
              </div>

              <div className="ficha-grid" style={{ padding: '0 20px 20px' }}>
                 <div className="ficha-spec-card">
                    <div className="spec-item-compact"><label>Estado</label><span>{assetFound.estado}</span></div>
                    <div className="spec-item-compact"><label>Próximo Control</label><span style={{ color: sColor }}>{formatFecha(assetFound.fechaProxima)}</span></div>
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
        ) : null
      )}

      {showModal && assetFound && assetFound.original && (
        <VerificationModal
          equipo={assetFound.original}
          equipos={assetsRef.current.map(a => a.original).filter(Boolean)}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); handleReset(); }}
        />
      )}

      <style jsx>{`
        .escaneo-container { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
        .scanner-main-card { background: #fff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid #f1f5f9; }
        .scanner-visual { background: #000; min-height: 400px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .camera-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: #fff; cursor: pointer; }
        .btn-activate-pulse { width: 80px; height: 80px; background: var(--accent); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(0, 229, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0); } }
        .scanner-overlay { position: absolute; width: 250px; height: 250px; border: 3px solid var(--accent); border-radius: 20px; pointer-events: none; }
        .scanner-line { width: 90%; height: 2px; background: var(--accent); position: absolute; left: 5%; animation: scan 2s infinite ease-in-out; }
        @keyframes scan { 0%, 100% { transform: translateY(20px); } 50% { transform: translateY(230px); } }
        .scanner-controls { padding: 30px; background: #fff; }
        .search-box-premium { display: flex; gap: 12px; background: #f1f5f9; padding: 6px 6px 6px 20px; border-radius: 16px; }
        .search-box-premium input { flex: 1; border: none; background: transparent; padding: 10px 0; font-size: 15px; outline: none; font-weight: 600; }
        .btn-search-trigger { background: var(--accent); border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .not-found-alert { background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 12px; margin-top: 16px; text-align: center; font-size: 13px; font-weight: 700; }
        .ficha-card { background: #fff; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #f1f5f9; }
        .code-badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12px; display: inline-block; margin-bottom: 8px; }
        .ficha-actions { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .btn-xl { padding: 16px; background: var(--accent); border: none; border-radius: 12px; font-weight: 800; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .btn-ghost { background: #f1f5f9; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .spec-item-compact { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .spec-item-compact label { font-size: 12px; color: #64748b; font-weight: 600; }
        .spec-item-compact span { font-size: 14px; font-weight: 700; color: #1e293b; }
      `}</style>
    </div>
  )
}

export default function EscaneoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Iniciando escáner...</div>}>
      <EscaneoContent />
    </Suspense>
  )
}
