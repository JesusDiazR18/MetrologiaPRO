'use client'
import { Microscope, Activity, ShieldCheck, MapPin, User, Calendar, AlertCircle } from 'lucide-react'
import { formatFecha, diasRestantes, calcularSemaforo, semaforoHex, semaforoLabel } from '@/lib/metrologia'

interface Props {
  equipo: any
}

export default function PublicVisor({ equipo }: Props) {
  const semaforo = calcularSemaforo(equipo.Fecha_Proximo_Control)
  const isFuera = equipo.Estado === 'FUERA_DE_SERVICIO' || equipo.Estado === 'OBSOLETO' || equipo.Estado === 'NO_APTO'
  const sColor = isFuera ? '#ef4444' : semaforoHex(semaforo)
  const sLabel = isFuera ? equipo.Estado.replace(/_/g, ' ') : semaforoLabel(semaforo)

  return (
    <div className="public-visor">
      <div className="visor-header" style={{ background: `linear-gradient(135deg, ${sColor} 0%, #0f172a 100%)` }}>
        <div className="brand-badge">QMS PUBLIC VISOR</div>
        <div className="header-content">
          <div className="id-badge">{equipo.Codigo_Interno}</div>
          <h1>{equipo.Nombre_Equipo}</h1>
          <p className="area-info"><MapPin size={14} /> {equipo.Area_Asignada || 'Ubicación no especificada'}</p>
        </div>
      </div>

      <div className="visor-body">
        <div className="status-hero" style={{ borderColor: sColor }}>
           <div className="status-indicator">
              <span className="dot" style={{ background: sColor, boxShadow: `0 0 15px ${sColor}` }} />
              <span className="label" style={{ color: sColor }}>{sLabel}</span>
           </div>
           <div className="countdown">
              <Calendar size={18} />
              <span>Próximo Control: <b>{formatFecha(equipo.Fecha_Proximo_Control)}</b></span>
              <small>({diasRestantes(equipo.Fecha_Proximo_Control)})</small>
           </div>
        </div>

        <div className="info-grid">
           <div className="info-card">
              <div className="card-title"><Microscope size={16} /> Especificaciones</div>
              <div className="info-row"><label>Tipo</label><span>{equipo.Tipo}</span></div>
              <div className="info-row"><label>Responsable</label><span>{equipo.Responsable || 'N/A'}</span></div>
              <div className="info-row"><label>Tolerancia</label><span>±{equipo.Tolerancia_Aceptable} {equipo.Unidad_Tolerancia}</span></div>
           </div>

           <div className="info-card">
              <div className="card-title"><Activity size={16} /> Estado Metrológico</div>
              <div className="info-row"><label>Última Verificación</label><span>{formatFecha(equipo.Fecha_Ultima_Verificacion) || 'Pendiente'}</span></div>
              <div className="info-row"><label>Periodicidad</label><span>Cada {equipo.Periodicidad_Meses} meses</span></div>
              <div className="info-row"><label>Estado</label><span style={{ color: sColor, fontWeight: 800 }}>{equipo.Estado}</span></div>
           </div>
        </div>

        <div className="footer-notice">
           <ShieldCheck size={16} />
           <p>Este es un registro oficial del Sistema de Gestión de Calidad (QMS). Para modificaciones contacte al administrador.</p>
        </div>
      </div>

      <style jsx>{`
        .public-visor {
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: 40px;
        }
        .visor-header {
          padding: 60px 24px 80px;
          color: #fff;
          text-align: center;
          position: relative;
        }
        .brand-badge {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          background: rgba(255,255,255,0.1);
          padding: 4px 12px;
          border-radius: 20px;
          backdrop-filter: blur(5px);
        }
        .id-badge {
          background: var(--accent);
          color: #000;
          display: inline-block;
          padding: 6px 16px;
          border-radius: 10px;
          font-weight: 900;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .visor-header h1 {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
        }
        .area-info {
          font-size: 14px;
          opacity: 0.8;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .visor-body {
          max-width: 600px;
          margin: -40px auto 0;
          padding: 0 20px;
        }
        .status-hero {
          background: #fff;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border-top: 4px solid;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .status-indicator .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .status-indicator .label {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .countdown {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 14px;
        }
        .countdown b { color: #0f172a; }
        .info-grid {
          display: grid;
          gap: 20px;
        }
        .info-card {
          background: #fff;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }
        .card-title {
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .info-row:last-child { border-bottom: none; }
        .info-row label { font-size: 12px; color: #64748b; font-weight: 600; }
        .info-row span { font-size: 14px; font-weight: 700; color: #1e293b; }
        .footer-notice {
          margin-top: 40px;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          line-height: 1.6;
        }
        @media (max-width: 480px) {
          .visor-header h1 { font-size: 26px; }
        }
      `}</style>
    </div>
  )
}
