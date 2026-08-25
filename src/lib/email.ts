import nodemailer from 'nodemailer'
import { formatFecha } from './metrologia'

export interface AssetAlertItem {
  id: string
  codigo: string
  nombre: string
  tipo: string
  area?: string | null
  responsable?: string | null
  fechaProximoControl: string | Date | null
  diasRestantes: number
  estado: string
  requiereSeguimiento?: boolean | null
  periodicidadSeguimiento?: number | null
}

export interface PatronAlertItem {
  id: string
  codigo: string
  nombre: string
  laboratorio?: string | null
  nCertificado?: string | null
  fechaVencimiento: string | Date | null
  diasRestantes: number
  estadoVigencia: string
}

export interface MonthlyReportData {
  mesNombre: string
  anio: number
  fechaGeneracion: string
  kpis: {
    totalActivos: number
    alDia: number
    pendientesMesAnterior: number
    programadosMesActual: number
    patronesPorVencer: number
    complianceGlobal: number
  }
  pendientesMesAnterior: AssetAlertItem[]
  programadosMesActual: AssetAlertItem[]
  patronesMes: PatronAlertItem[]
  activosSeguimiento: AssetAlertItem[]
}

export interface WeeklyAlertsData {
  fechaGeneracion: string
  equiposVencidos: AssetAlertItem[]
  equiposProximos: AssetAlertItem[]
  patronesProximos: PatronAlertItem[]
  equiposSeguimiento: AssetAlertItem[]
}

/**
 * Obtiene la configuración de transporte SMTP o null si faltan credenciales
 */
export function getSmtpConfig() {
  const host = process.env.SMTP_HOST || ''
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465
  const user = process.env.SMTP_USER || ''
  let pass = process.env.SMTP_PASS || ''
  if (pass.startsWith('"') && pass.endsWith('"')) {
    pass = pass.slice(1, -1)
  }
  const from = process.env.SMTP_FROM || `"Sistema de Control Metrológico · Polifusión" <${user || 'sgcpolifusion@polifusion.cl'}>`
  const targetEmails = process.env.NOTIFICATION_EMAILS || 'cmunizaga@polifusion.cl, vlutz@polifusion.cl'
  const ccEmails = process.env.NOTIFICATION_CC_EMAILS || 'jdiaz@polifusion.cl'

  const isConfigured = Boolean(host && user && pass)

  return {
    host,
    port,
    user,
    pass,
    from,
    targetEmails,
    ccEmails,
    isConfigured
  }
}

/**
 * Envía un correo vía SMTP o devuelve la simulación si no hay credenciales configuradas
 */
export async function sendQmsEmail({
  to,
  cc,
  subject,
  html
}: {
  to?: string
  cc?: string
  subject: string
  html: string
}) {
  const config = getSmtpConfig()
  const recipientTo = to || config.targetEmails
  const recipientCc = cc !== undefined ? cc : config.ccEmails

  if (!config.isConfigured) {
    return {
      success: true,
      simulated: true,
      message: 'Credenciales SMTP no configuradas. Correo simulado exitosamente.',
      to: recipientTo,
      cc: recipientCc,
      subject,
      htmlPreview: html
    }
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  const info = await transporter.sendMail({
    from: config.from,
    to: recipientTo,
    cc: recipientCc || undefined,
    subject,
    html
  })

  return {
    success: true,
    simulated: false,
    messageId: info.messageId,
    to: recipientTo,
    cc: recipientCc,
    subject
  }
}

/**
 * Plantilla Base de Correo Corporativo Polifusión
 */
function wrapInEmailTemplate(title: string, subtitle: string, contentHtml: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://metrologia-plf.vercel.app'

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; }
    .container { max-width: 640px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: center; border-bottom: 4px solid #00e5ff; }
    .header-logo { font-size: 22px; font-weight: 900; letter-spacing: 0.08em; color: #ffffff; text-transform: uppercase; margin-bottom: 6px; }
    .header-logo span { color: #00e5ff; }
    .header-title { font-size: 19px; font-weight: 800; color: #ffffff; margin: 8px 0 4px; }
    .header-subtitle { font-size: 13px; color: #94a3b8; margin: 0; }
    .body { padding: 28px 24px; }
    .kpi-grid { display: table; width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 8px 0; }
    .kpi-cell { display: table-cell; width: 33.33%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 10px; text-align: center; vertical-align: middle; }
    .kpi-num { font-size: 24px; font-weight: 900; line-height: 1; margin-bottom: 4px; }
    .kpi-lbl { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 10px; display: flex; align-items: center; gap: 8px; }
    .card-alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 18px; }
    .card-warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 18px; }
    .card-info { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 18px; }
    .table-custom { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .table-custom th { background: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; }
    .table-custom td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    .table-custom tr:last-child td { border-bottom: none; }
    .badge-code { background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 11px; }
    .badge-status-red { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; display: inline-block; }
    .badge-status-yellow { background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; display: inline-block; }
    .badge-status-green { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; display: inline-block; }
    .badge-status-purple { background: #f3e8ff; color: #7e22ce; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; display: inline-block; }
    .btn-cta { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 50px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4); text-align: center; margin: 20px auto 0; }
    .btn-container { text-align: center; margin-top: 24px; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">POLI<span>FUSIÓN</span></div>
      <div class="header-title">${title}</div>
      <div class="header-subtitle">${subtitle}</div>
    </div>

    <div class="body">
      ${contentHtml}

      <div class="btn-container">
        <a href="${appUrl}" target="_blank" class="btn-cta">
          Acceder al Sistema Metrológico →
        </a>
      </div>
    </div>

    <div class="footer">
      <strong>Sistema de Control Metrológico y Calidad · POLIFUSIÓN S.A.</strong><br>
      Este es un mensaje generado automáticamente. Para gestionar fichas y verificaciones, ingrese con sus credenciales al sistema.
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Genera el HTML para el correo semanal / periódico de alertas de vencimiento
 */
export function generateWeeklyAlertsHtml(data: WeeklyAlertsData): string {
  let content = `
    <p style="font-size: 14px; color: #475569; margin-top: 0;">
      Estimado equipo de Calidad y Metrología,
    </p>
    <p style="font-size: 13.5px; color: #475569;">
      A continuación se presenta el reporte de activos que <strong>requieren atención prioritaria</strong> debido a vencimientos o controles próximos según el cronograma metrológico vigente al <strong>${formatFecha(data.fechaGeneracion)}</strong>.
    </p>
  `

  // KPI Bar
  content += `
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-num" style="color: #dc2626;">${data.equiposVencidos.length}</div>
        <div class="kpi-lbl">Vencidos</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-num" style="color: #f59e0b;">${data.equiposProximos.length}</div>
        <div class="kpi-lbl">Próximos (≤ 30d)</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-num" style="color: #7c3aed;">${data.patronesProximos.length}</div>
        <div class="kpi-lbl">Patrones Alerta</div>
      </div>
    </div>
  `

  // 1. Patrones de referencia por calibrar
  if (data.patronesProximos.length > 0) {
    content += `
      <div class="card-alert" style="background-color: #faf5ff; border-left-color: #9333ea;">
        <div style="font-size: 13.5px; font-weight: 800; color: #6b21a8; margin-bottom: 8px;">
          🧪 PATRONES DE REFERENCIA PRÓXIMOS A CALIBRACIÓN EXTERNA (${data.patronesProximos.length})
        </div>
        <p style="font-size: 12px; color: #7e22ce; margin: 0 0 10px;">
          Los siguientes estándares de referencia requieren gestión de calibración con laboratorios externos acreditados para mantener la trazabilidad del laboratorio:
        </p>
        <table class="table-custom" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr>
              <th>Código</th>
              <th>Patrón</th>
              <th>Laboratorio</th>
              <th>Vencimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.patronesProximos.map(p => `
              <tr>
                <td><span class="badge-code" style="background: #f3e8ff; color: #7e22ce;">${p.codigo}</span></td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.laboratorio || 'No declarado'}</td>
                <td>${formatFecha(p.fechaVencimiento)}</td>
                <td>
                  <span class="${p.diasRestantes < 0 ? 'badge-status-red' : 'badge-status-purple'}">
                    ${p.diasRestantes < 0 ? `Vencido hace ${Math.abs(p.diasRestantes)}d` : `En ${p.diasRestantes} días`}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // 2. Equipos Vencidos / Críticos
  if (data.equiposVencidos.length > 0) {
    content += `
      <div class="card-alert">
        <div style="font-size: 13.5px; font-weight: 800; color: #991b1b; margin-bottom: 8px;">
          🔴 EQUIPOS E INSTRUMENTOS CON CONTROL METROLÓGICO VENCIDO (${data.equiposVencidos.length})
        </div>
        <table class="table-custom" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr>
              <th>Código</th>
              <th>Activo</th>
              <th>Área / Responsable</th>
              <th>Vencimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.equiposVencidos.map(e => `
              <tr>
                <td><span class="badge-code">${e.codigo}</span></td>
                <td><strong>${e.nombre}</strong> <span style="font-size: 10px; color: #64748b;">(${e.tipo})</span></td>
                <td>${e.area || '—'} · ${e.responsable || 'Sin asignar'}</td>
                <td>${formatFecha(e.fechaProximoControl)}</td>
                <td>
                  <span class="badge-status-red">
                    Vencido hace ${Math.abs(e.diasRestantes)}d
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // 3. Equipos Próximos a Vencer (<= 30 días)
  if (data.equiposProximos.length > 0) {
    content += `
      <div class="card-warning">
        <div style="font-size: 13.5px; font-weight: 800; color: #92400e; margin-bottom: 8px;">
          🟡 PRÓXIMOS CONTROLES PROGRAMADOS (Próximos 30 días) (${data.equiposProximos.length})
        </div>
        <table class="table-custom" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr>
              <th>Código</th>
              <th>Activo</th>
              <th>Responsable</th>
              <th>Fecha Programada</th>
              <th>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            ${data.equiposProximos.map(e => `
              <tr>
                <td><span class="badge-code">${e.codigo}</span></td>
                <td><strong>${e.nombre}</strong></td>
                <td>${e.responsable || 'Sin asignar'}</td>
                <td>${formatFecha(e.fechaProximoControl)}</td>
                <td>
                  <span class="badge-status-yellow">
                    En ${e.diasRestantes} días
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // 4. Equipos con Seguimiento Activo
  if (data.equiposSeguimiento.length > 0) {
    content += `
      <div class="card-info" style="background-color: #f0f9ff; border-left-color: #0284c7;">
        <div style="font-size: 13.5px; font-weight: 800; color: #075985; margin-bottom: 8px;">
          🔄 ACTIVOS CON PROTOCOLO DE SEGUIMIENTO ACTIVO (${data.equiposSeguimiento.length})
        </div>
        <table class="table-custom" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr>
              <th>Código</th>
              <th>Activo</th>
              <th>Responsable</th>
              <th>Frecuencia Seguimiento</th>
            </tr>
          </thead>
          <tbody>
            ${data.equiposSeguimiento.map(e => {
              const p = e.periodicidadSeguimiento
              const label = !p ? 'Periódico' : p === 1 ? 'Diario' : p === 7 ? 'Semanal' : p === 15 ? 'Quincenal' : p === 30 ? 'Mensual' : `Cada ${p} días`
              return `
                <tr>
                  <td><span class="badge-code">${e.codigo}</span></td>
                  <td><strong>${e.nombre}</strong></td>
                  <td>${e.responsable || 'Sin asignar'}</td>
                  <td><span class="badge-status-green" style="background: #e0f2fe; color: #0369a1;">${label}</span></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  return wrapInEmailTemplate(
    'Alertas de Control Metrológico',
    `Reporte de Vencimientos y Planificación · ${formatFecha(data.fechaGeneracion)}`,
    content
  )
}

/**
 * Genera el HTML para el correo del DÍA 1 DE CADA MES (Balance del mes anterior + Plan del mes en curso)
 */
export function generateMonthlyReportHtml(data: MonthlyReportData): string {
  let content = `
    <p style="font-size: 14px; color: #475569; margin-top: 0;">
      Estimados miembros del Departamento de Calidad y Operaciones,
    </p>
    <p style="font-size: 13.5px; color: #475569;">
      Se ha generado el <strong>Balance Mensual Metrológico</strong> correspondiente al inicio del periodo de <strong>${data.mesNombre.toUpperCase()} ${data.anio}</strong>.
      Este reporte consolida las actividades pendientes del mes anterior y la programación de verificaciones y calibraciones comprometidas para este mes.
    </p>
  `

  // KPI Grid
  content += `
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-num" style="color: #0284c7;">${data.kpis.complianceGlobal}%</div>
        <div class="kpi-lbl">Vigencia Global</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-num" style="color: #dc2626;">${data.kpis.pendientesMesAnterior}</div>
        <div class="kpi-lbl">Pendientes Mes Anterior</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-num" style="color: #10b981;">${data.kpis.programadosMesActual}</div>
        <div class="kpi-lbl">A Calibrar este Mes</div>
      </div>
    </div>
  `

  // SECCIÓN 1: PENDIENTES DEL MES ANTERIOR
  content += `
    <div class="card-alert" style="margin-top: 20px;">
      <div style="font-size: 14px; font-weight: 900; color: #991b1b; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
        <span>📌 1. COMPROMISOS PENDIENTES DEL MES ANTERIOR</span>
        <span style="font-size: 12px; background: #dc2626; color: #ffffff; padding: 2px 8px; border-radius: 10px;">${data.pendientesMesAnterior.length} Activos</span>
      </div>
      <p style="font-size: 12px; color: #7f1d1d; margin: 0 0 10px;">
        Activos cuya verificación correspondía al mes anterior o periodos previos y que se encuentran vencidos, fuera de servicio o con acciones correctivas pendientes de cierre:
      </p>
  `

  if (data.pendientesMesAnterior.length === 0) {
    content += `
      <div style="background: #ffffff; padding: 12px; border-radius: 8px; text-align: center; color: #15803d; font-weight: 700; font-size: 12.5px;">
        ✅ ¡Excelente! No existen verificaciones pendientes arrastradas del mes anterior.
      </div>
    `
  } else {
    content += `
      <table class="table-custom" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr>
            <th>Código</th>
            <th>Activo</th>
            <th>Ubicación / Responsable</th>
            <th>Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${data.pendientesMesAnterior.map(e => `
            <tr>
              <td><span class="badge-code">${e.codigo}</span></td>
              <td><strong>${e.nombre}</strong> <span style="font-size: 10px; color: #64748b;">(${e.tipo})</span></td>
              <td>${e.area || '—'} · ${e.responsable || 'Sin asignar'}</td>
              <td>${formatFecha(e.fechaProximoControl)}</td>
              <td><span class="badge-status-red">Pendiente (${Math.abs(e.diasRestantes)}d)</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }
  content += `</div>`

  // SECCIÓN 2: PROGRAMACIÓN DEL MES ACTUAL
  content += `
    <div class="card-warning" style="background-color: #f0fdf4; border-left-color: #10b981; margin-top: 20px;">
      <div style="font-size: 14px; font-weight: 900; color: #166534; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
        <span>🎯 2. PLAN DE VERIFICACIONES Y CALIBRACIONES - ${data.mesNombre.toUpperCase()} ${data.anio}</span>
        <span style="font-size: 12px; background: #16a34a; color: #ffffff; padding: 2px 8px; border-radius: 10px;">${data.programadosMesActual.length} Activos</span>
      </div>
      <p style="font-size: 12px; color: #15803d; margin: 0 0 10px;">
        Equipos e instrumentos programados para control metrológico regular durante las semanas de este mes:
      </p>
  `

  if (data.programadosMesActual.length === 0) {
    content += `
      <div style="background: #ffffff; padding: 12px; border-radius: 8px; text-align: center; color: #64748b; font-size: 12.5px;">
        No hay equipos programados para vencer durante este mes calendario.
      </div>
    `
  } else {
    content += `
      <table class="table-custom" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr>
            <th>Código</th>
            <th>Activo</th>
            <th>Responsable</th>
            <th>Fecha Prevista</th>
            <th>Prioridad</th>
          </tr>
        </thead>
        <tbody>
          ${data.programadosMesActual.map(e => `
            <tr>
              <td><span class="badge-code">${e.codigo}</span></td>
              <td><strong>${e.nombre}</strong></td>
              <td>${e.responsable || 'Sin asignar'}</td>
              <td><strong>${formatFecha(e.fechaProximoControl)}</strong></td>
              <td><span class="badge-status-green">Programado</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }
  content += `</div>`

  // SECCIÓN 3: PATRONES DE REFERENCIA
  if (data.patronesMes.length > 0) {
    content += `
      <div class="card-alert" style="background-color: #faf5ff; border-left-color: #9333ea; margin-top: 20px;">
        <div style="font-size: 14px; font-weight: 900; color: #6b21a8; margin-bottom: 6px;">
          🧪 3. PATRONES DE REFERENCIA - CALIBRACIÓN EXTERNA
        </div>
        <p style="font-size: 12px; color: #7e22ce; margin: 0 0 10px;">
          Patrones estándar con certificados que vencen en este mes o que se encuentran expirados:
        </p>
        <table class="table-custom" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr>
              <th>Código</th>
              <th>Patrón</th>
              <th>Laboratorio</th>
              <th>Vencimiento Cert.</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.patronesMes.map(p => `
              <tr>
                <td><span class="badge-code" style="background: #f3e8ff; color: #7e22ce;">${p.codigo}</span></td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.laboratorio || '—'}</td>
                <td>${formatFecha(p.fechaVencimiento)}</td>
                <td>
                  <span class="${p.diasRestantes < 0 ? 'badge-status-red' : 'badge-status-purple'}">
                    ${p.diasRestantes < 0 ? 'Expirado' : 'Por Vencer'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  return wrapInEmailTemplate(
    `Balance Mensual Metrológico - ${data.mesNombre.toUpperCase()} ${data.anio}`,
    `Planificación Mensual y Cierre de Pendientes · Polifusión SGC`,
    content
  )
}
