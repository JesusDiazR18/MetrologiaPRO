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
 * Obtiene la configuración de transporte SMTP
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
 * Envía un correo vía SMTP
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
 * Plantilla Base de Correo 100% Compatible con Outlook / Webmail / Móvil
 */
function wrapInEmailTemplate(title: string, subtitle: string, contentHtml: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://metrologia-plf.vercel.app'

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.4;">
  <table width="100%" bgcolor="#f1f5f9" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
          
          <!-- Header Banner (Dark Navy with Cyan Accent) -->
          <tr>
            <td bgcolor="#0f172a" align="center" style="background-color: #0f172a; padding: 28px 20px; border-bottom: 4px solid #00e5ff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                    <span style="color: #ffffff;">POLI</span><span style="color: #00e5ff;">FUSIÓN</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Arial, sans-serif; font-size: 17px; font-weight: 800; color: #ffffff; padding-top: 10px; padding-bottom: 4px;">
                    ${title}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Arial, sans-serif; font-size: 12px; color: #94a3b8;">
                    ${subtitle}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 24px 22px; background-color: #ffffff;" bgcolor="#ffffff">
              ${contentHtml}

              <!-- Call to action button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0ea5e9" style="background-color: #0ea5e9; border-radius: 25px;">
                          <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 25px;">
                            Acceder al Sistema Metrológico →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td bgcolor="#f8fafc" align="center" style="background-color: #f8fafc; padding: 18px 20px; border-top: 1px solid #e2e8f0; font-family: Arial, sans-serif; font-size: 11px; color: #64748b; line-height: 1.5;">
              <strong style="color: #334155;">Sistema de Control Metrológico · POLIFUSIÓN S.A.</strong><br />
              Este es un mensaje generado automáticamente por el Sistema de Gestión de Calidad (SGC).
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Genera el HTML para el correo de alertas periódicas (Semanal / Diario)
 */
export function generateWeeklyAlertsHtml(data: WeeklyAlertsData): string {
  let content = `
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #334155; margin: 0 0 14px 0; line-height: 1.5;">
      Estimado <strong>Departamento de Calidad</strong>,
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #475569; margin: 0 0 18px 0; line-height: 1.5;">
      A continuación se presenta el reporte de activos que <strong>requieren atención prioritaria</strong> debido a vencimientos o controles próximos según el cronograma metrológico vigente al <strong>${formatFecha(data.fechaGeneracion)}</strong>.
    </p>
  `

  // KPI Table (3 Columns)
  content += `
    <table width="100%" cellpadding="0" cellspacing="6" border="0" style="margin-bottom: 20px;">
      <tr>
        <td width="33%" align="center" bgcolor="#fef2f2" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 6px;">
          <div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; color: #dc2626; line-height: 1;">${data.equiposVencidos.length}</div>
          <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #991b1b; text-transform: uppercase; margin-top: 4px;">Vencidos</div>
        </td>
        <td width="33%" align="center" bgcolor="#fffbeb" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 6px;">
          <div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; color: #d97706; line-height: 1;">${data.equiposProximos.length}</div>
          <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #92400e; text-transform: uppercase; margin-top: 4px;">Próximos (≤ 30d)</div>
        </td>
        <td width="33%" align="center" bgcolor="#faf5ff" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px 6px;">
          <div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; color: #7c3aed; line-height: 1;">${data.patronesProximos.length}</div>
          <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #6b21a8; text-transform: uppercase; margin-top: 4px;">Patrones Alerta</div>
        </td>
      </tr>
    </table>
  `

  // 1. Patrones de referencia por calibrar
  if (data.patronesProximos.length > 0) {
    content += `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf5ff" style="background-color: #faf5ff; border: 1px solid #d8b4fe; border-left: 5px solid #9333ea; border-radius: 6px; margin-bottom: 18px;">
        <tr>
          <td style="padding: 14px 14px 8px 14px;">
            <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #6b21a8;">
              🧪 PATRONES DE REFERENCIA - CALIBRACIÓN EXTERNA (${data.patronesProximos.length})
            </div>
            <div style="font-family: Arial, sans-serif; font-size: 11.5px; color: #7e22ce; margin-top: 3px; margin-bottom: 10px;">
              Estándares de referencia con fecha límite para envío a laboratorio acreditado:
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 12px 10px;">
            <table width="100%" cellpadding="6" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #e9d5ff; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11.5px;">
              <tr bgcolor="#f3e8ff">
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">CÓDIGO</th>
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">PATRÓN</th>
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">LABORATORIO</th>
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">VENCIMIENTO</th>
              </tr>
              ${data.patronesProximos.map((p, idx) => `
                <tr bgcolor="${idx % 2 === 0 ? '#ffffff' : '#faf5ff'}">
                  <td style="border-bottom: 1px solid #f3e8ff; font-weight: bold; color: #7e22ce;">${p.codigo}</td>
                  <td style="border-bottom: 1px solid #f3e8ff; color: #1e293b;"><strong>${p.nombre}</strong></td>
                  <td style="border-bottom: 1px solid #f3e8ff; color: #475569;">${p.laboratorio || '—'}</td>
                  <td style="border-bottom: 1px solid #f3e8ff; color: ${p.diasRestantes < 0 ? '#dc2626' : '#7e22ce'}; font-weight: bold;">
                    ${formatFecha(p.fechaVencimiento)} (${p.diasRestantes < 0 ? 'Expirado' : `en ${p.diasRestantes}d`})
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
    `
  }

  // 2. Equipos Vencidos
  if (data.equiposVencidos.length > 0) {
    content += `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fef2f2" style="background-color: #fef2f2; border: 1px solid #fca5a5; border-left: 5px solid #ef4444; border-radius: 6px; margin-bottom: 18px;">
        <tr>
          <td style="padding: 14px 14px 8px 14px;">
            <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #991b1b;">
              🔴 EQUIPOS E INSTRUMENTOS CON CONTROL VENCIDO (${data.equiposVencidos.length})
            </div>
            <div style="font-family: Arial, sans-serif; font-size: 11.5px; color: #b91c1c; margin-top: 3px; margin-bottom: 10px;">
              Requieren verificación o calibración inmediata:
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 12px 10px;">
            <table width="100%" cellpadding="6" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #fecaca; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11.5px;">
              <tr bgcolor="#fee2e2">
                <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">CÓDIGO</th>
                <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">ACTIVO</th>
                <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">ÁREA / RESPONSABLE</th>
                <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">VENCIMIENTO</th>
              </tr>
              ${data.equiposVencidos.map((e, idx) => `
                <tr bgcolor="${idx % 2 === 0 ? '#ffffff' : '#fef2f2'}">
                  <td style="border-bottom: 1px solid #fee2e2; font-weight: bold; color: #0284c7;">${e.codigo}</td>
                  <td style="border-bottom: 1px solid #fee2e2; color: #1e293b;"><strong>${e.nombre}</strong></td>
                  <td style="border-bottom: 1px solid #fee2e2; color: #475569;">${e.area || '—'} · ${e.responsable || 'Sin asignar'}</td>
                  <td style="border-bottom: 1px solid #fee2e2; color: #dc2626; font-weight: bold;">
                    ${formatFecha(e.fechaProximoControl)} (hace ${Math.abs(e.diasRestantes)}d)
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
    `
  }

  // 3. Equipos Próximos a Vencer (<= 30 días)
  if (data.equiposProximos.length > 0) {
    content += `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffbeb" style="background-color: #fffbeb; border: 1px solid #fcd34d; border-left: 5px solid #f59e0b; border-radius: 6px; margin-bottom: 18px;">
        <tr>
          <td style="padding: 14px 14px 8px 14px;">
            <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #92400e;">
              🟡 PRÓXIMOS CONTROLES PROGRAMADOS (Próximos 30 días) (${data.equiposProximos.length})
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 12px 10px;">
            <table width="100%" cellpadding="6" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #fde68a; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11.5px;">
              <tr bgcolor="#fef3c7">
                <th align="left" style="color: #92400e; font-size: 10.5px; border-bottom: 1px solid #fcd34d;">CÓDIGO</th>
                <th align="left" style="color: #92400e; font-size: 10.5px; border-bottom: 1px solid #fcd34d;">ACTIVO</th>
                <th align="left" style="color: #92400e; font-size: 10.5px; border-bottom: 1px solid #fcd34d;">RESPONSABLE</th>
                <th align="left" style="color: #92400e; font-size: 10.5px; border-bottom: 1px solid #fcd34d;">FECHA LÍMITE</th>
              </tr>
              ${data.equiposProximos.map((e, idx) => `
                <tr bgcolor="${idx % 2 === 0 ? '#ffffff' : '#fffbeb'}">
                  <td style="border-bottom: 1px solid #fef3c7; font-weight: bold; color: #0284c7;">${e.codigo}</td>
                  <td style="border-bottom: 1px solid #fef3c7; color: #1e293b;"><strong>${e.nombre}</strong></td>
                  <td style="border-bottom: 1px solid #fef3c7; color: #475569;">${e.responsable || 'Sin asignar'}</td>
                  <td style="border-bottom: 1px solid #fef3c7; color: #d97706; font-weight: bold;">
                    ${formatFecha(e.fechaProximoControl)} (en ${e.diasRestantes}d)
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
    `
  }

  // 4. Equipos con Seguimiento Activo
  if (data.equiposSeguimiento.length > 0) {
    content += `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0fdf4" style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 5px solid #10b981; border-radius: 6px; margin-bottom: 18px;">
        <tr>
          <td style="padding: 14px 14px 8px 14px;">
            <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #166534;">
              🔄 ACTIVOS CON PROTOCOLO DE SEGUIMIENTO ACTIVO (${data.equiposSeguimiento.length})
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 12px 10px;">
            <table width="100%" cellpadding="6" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11.5px;">
              <tr bgcolor="#dcfce7">
                <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">CÓDIGO</th>
                <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">ACTIVO</th>
                <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">RESPONSABLE</th>
                <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">FRECUENCIA</th>
              </tr>
              ${data.equiposSeguimiento.map((e, idx) => `
                <tr bgcolor="${idx % 2 === 0 ? '#ffffff' : '#f0fdf4'}">
                  <td style="border-bottom: 1px solid #dcfce7; font-weight: bold; color: #0284c7;">${e.codigo}</td>
                  <td style="border-bottom: 1px solid #dcfce7; color: #1e293b;"><strong>${e.nombre}</strong></td>
                  <td style="border-bottom: 1px solid #dcfce7; color: #475569;">${e.responsable || 'Sin asignar'}</td>
                  <td style="border-bottom: 1px solid #dcfce7; color: #15803d; font-weight: bold;">
                    Cada ${e.periodicidadSeguimiento || '—'} días
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
    `
  }

  return wrapInEmailTemplate(
    'Alertas de Control Metrológico',
    `Reporte de Vencimientos y Planificación · Departamento de Calidad`,
    content
  )
}

/**
 * Genera el HTML para el correo del DÍA 1 DE CADA MES (Balance del mes anterior + Plan del mes en curso)
 */
export function generateMonthlyReportHtml(data: MonthlyReportData): string {
  let content = `
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #334155; margin: 0 0 12px 0; line-height: 1.5;">
      Estimado <strong>Departamento de Calidad</strong>,
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #475569; margin: 0 0 18px 0; line-height: 1.5;">
      Se ha generado el <strong>Balance Mensual Metrológico</strong> correspondiente al inicio del periodo de <strong>${data.mesNombre.toUpperCase()} ${data.anio}</strong>.
      A continuación se detallan los compromisos pendientes del mes anterior y la programación de controles metrológicos planificados para este mes.
    </p>
  `

  // KPI Grid (3 Columns)
  content += `
    <table width="100%" cellpadding="0" cellspacing="6" border="0" style="margin-bottom: 20px;">
      <tr>
        <td width="33%" align="center" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 6px;">
          <div style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; color: #0284c7; line-height: 1;">${data.kpis.complianceGlobal}%</div>
          <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase; margin-top: 5px;">Vigencia Global</div>
        </td>
        <td width="33%" align="center" bgcolor="#fef2f2" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 6px;">
          <div style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; color: #dc2626; line-height: 1;">${data.kpis.pendientesMesAnterior}</div>
          <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #991b1b; text-transform: uppercase; margin-top: 5px;">Pendientes Anterior</div>
        </td>
        <td width="33%" align="center" bgcolor="#f0fdf4" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 6px;">
          <div style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; color: #16a34a; line-height: 1;">${data.kpis.programadosMesActual}</div>
          <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #166534; text-transform: uppercase; margin-top: 5px;">A Calibrar este Mes</div>
        </td>
      </tr>
    </table>
  `

  // SECCIÓN 1: PENDIENTES DEL MES ANTERIOR
  content += `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fef2f2" style="background-color: #fef2f2; border: 1px solid #fca5a5; border-left: 5px solid #ef4444; border-radius: 6px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 14px 14px 8px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 900; color: #991b1b;">
                📌 1. COMPROMISOS PENDIENTES DEL MES ANTERIOR
              </td>
              <td align="right">
                <span style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; background-color: #dc2626; color: #ffffff; padding: 3px 8px; border-radius: 10px;">
                  ${data.pendientesMesAnterior.length} Activos
                </span>
              </td>
            </tr>
          </table>
          <div style="font-family: Arial, sans-serif; font-size: 11.5px; color: #7f1d1d; margin-top: 4px; margin-bottom: 8px;">
            Activos cuya verificación correspondía al mes anterior o periodos previos y continúan vencidos o con acciones pendientes:
          </div>
        </td>
      </tr>
  `

  if (data.pendientesMesAnterior.length === 0) {
    content += `
      <tr>
        <td style="padding: 0 14px 14px 14px;">
          <div style="background-color: #ffffff; border: 1px solid #86efac; padding: 12px; border-radius: 6px; text-align: center; color: #15803d; font-family: Arial, sans-serif; font-weight: bold; font-size: 12px;">
            ✅ ¡Excelente! No existen verificaciones pendientes arrastradas del mes anterior.
          </div>
        </td>
      </tr>
    `
  } else {
    content += `
      <tr>
        <td style="padding: 0 10px 12px 10px;">
          <table width="100%" cellpadding="6" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #fecaca; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11.5px;">
            <tr bgcolor="#fee2e2">
              <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">CÓDIGO</th>
              <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">ACTIVO</th>
              <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">ÁREA / RESPONSABLE</th>
              <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">VENCIMIENTO</th>
              <th align="left" style="color: #991b1b; font-size: 10.5px; border-bottom: 1px solid #fca5a5;">ESTADO</th>
            </tr>
            ${data.pendientesMesAnterior.map((e, idx) => `
              <tr bgcolor="${idx % 2 === 0 ? '#ffffff' : '#fef2f2'}">
                <td style="border-bottom: 1px solid #fee2e2; font-weight: bold; color: #0284c7;">${e.codigo}</td>
                <td style="border-bottom: 1px solid #fee2e2; color: #1e293b;">
                  <strong>${e.nombre}</strong> <span style="font-size: 10px; color: #64748b;">(${e.tipo})</span>
                </td>
                <td style="border-bottom: 1px solid #fee2e2; color: #475569;">${e.area || '—'} · ${e.responsable || 'Sin asignar'}</td>
                <td style="border-bottom: 1px solid #fee2e2; color: #334155;">${formatFecha(e.fechaProximoControl)}</td>
                <td style="border-bottom: 1px solid #fee2e2; color: #dc2626; font-weight: bold;">
                  Pendiente (${Math.abs(e.diasRestantes)}d)
                </td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    `
  }
  content += `</table>`

  // SECCIÓN 2: PROGRAMACIÓN DEL MES ACTUAL
  content += `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0fdf4" style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 5px solid #10b981; border-radius: 6px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 14px 14px 8px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 900; color: #166534;">
                🎯 2. PLAN DE VERIFICACIONES - ${data.mesNombre.toUpperCase()} ${data.anio}
              </td>
              <td align="right">
                <span style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; background-color: #16a34a; color: #ffffff; padding: 3px 8px; border-radius: 10px;">
                  ${data.programadosMesActual.length} Activos
                </span>
              </td>
            </tr>
          </table>
          <div style="font-family: Arial, sans-serif; font-size: 11.5px; color: #15803d; margin-top: 4px; margin-bottom: 8px;">
            Equipos e instrumentos programados para control metrológico regular durante este mes:
          </div>
        </td>
      </tr>
  `

  if (data.programadosMesActual.length === 0) {
    content += `
      <tr>
        <td style="padding: 0 14px 14px 14px;">
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; text-align: center; color: #64748b; font-family: Arial, sans-serif; font-size: 12px;">
            No hay equipos programados para vencer durante este mes calendario.
          </div>
        </td>
      </tr>
    `
  } else {
    content += `
      <tr>
        <td style="padding: 0 10px 12px 10px;">
          <table width="100%" cellpadding="6" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11.5px;">
            <tr bgcolor="#dcfce7">
              <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">CÓDIGO</th>
              <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">ACTIVO</th>
              <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">RESPONSABLE</th>
              <th align="left" style="color: #166534; font-size: 10.5px; border-bottom: 1px solid #86efac;">FECHA PREVISTA</th>
            </tr>
            ${data.programadosMesActual.map((e, idx) => `
              <tr bgcolor="${idx % 2 === 0 ? '#ffffff' : '#f0fdf4'}">
                <td style="border-bottom: 1px solid #dcfce7; font-weight: bold; color: #0284c7;">${e.codigo}</td>
                <td style="border-bottom: 1px solid #dcfce7; color: #1e293b;"><strong>${e.nombre}</strong></td>
                <td style="border-bottom: 1px solid #dcfce7; color: #475569;">${e.responsable || 'Sin asignar'}</td>
                <td style="border-bottom: 1px solid #dcfce7; color: #16a34a; font-weight: bold;">
                  ${formatFecha(e.fechaProximoControl)}
                </td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    `
  }
  content += `</table>`

  // SECCIÓN 3: PATRONES DE REFERENCIA
  if (data.patronesMes.length > 0) {
    content += `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf5ff" style="background-color: #faf5ff; border: 1px solid #d8b4fe; border-left: 5px solid #9333ea; border-radius: 6px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 14px 14px 8px 14px;">
            <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 900; color: #6b21a8;">
              🧪 3. PATRONES DE REFERENCIA - CALIBRACIÓN EXTERNA
            </div>
            <div style="font-family: Arial, sans-serif; font-size: 11.5px; color: #7e22ce; margin-top: 4px; margin-bottom: 8px;">
              Patrones con certificados que vencen en este mes o que se encuentran expirados:
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 10px 12px 10px;">
            <table width="100%" cellpadding="6" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #e9d5ff; border-radius: 6px; font-family: Arial, sans-serif; font-size: 11.5px;">
              <tr bgcolor="#f3e8ff">
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">CÓDIGO</th>
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">PATRÓN</th>
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">LABORATORIO</th>
                <th align="left" style="color: #581c87; font-size: 10.5px; border-bottom: 1px solid #d8b4fe;">VENCIMIENTO</th>
              </tr>
              ${data.patronesMes.map((p, idx) => `
                <tr bgcolor="${idx % 2 === 0 ? '#ffffff' : '#faf5ff'}">
                  <td style="border-bottom: 1px solid #f3e8ff; font-weight: bold; color: #7e22ce;">${p.codigo}</td>
                  <td style="border-bottom: 1px solid #f3e8ff; color: #1e293b;"><strong>${p.nombre}</strong></td>
                  <td style="border-bottom: 1px solid #f3e8ff; color: #475569;">${p.laboratorio || '—'}</td>
                  <td style="border-bottom: 1px solid #f3e8ff; color: ${p.diasRestantes < 0 ? '#dc2626' : '#7e22ce'}; font-weight: bold;">
                    ${formatFecha(p.fechaVencimiento)} (${p.diasRestantes < 0 ? 'Expirado' : 'Por Vencer'})
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
    `
  }

  return wrapInEmailTemplate(
    `Balance Mensual Metrológico - ${data.mesNombre.toUpperCase()} ${data.anio}`,
    `Planificación Mensual y Cierre de Pendientes · Departamento de Calidad`,
    content
  )
}
