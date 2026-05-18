import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // En Vercel, deberíamos validar un CRON_SECRET en el header de autorización para seguridad.
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const today = new Date();
    
    // 1. Obtener equipos y patrones activos
    const equipos = await prisma.instrumentoEquipo.findMany({
      where: { 
        Estado: { notIn: ['FUERA_DE_SERVICIO', 'OBSOLETO', 'DE_BAJA_OBSOLETO', 'BAJA'] } 
      }
    });

    const patrones = await prisma.patronReferencia.findMany({
      where: {
        Estado_Vigencia: 'VIGENTE'
      }
    });

    // 2. Filtrar próximos a vencer (30 días o menos) o vencidos
    const equiposProximos = equipos.filter((e: any) => {
      const remaining = differenceInDays(new Date(e.Fecha_Proximo_Control), today);
      return remaining <= 30;
    });

    const patronesProximos = patrones.filter((p: any) => {
      const remaining = differenceInDays(new Date(p.Fecha_Vencimiento_Certificado), today);
      return remaining <= 45; // Los patrones suelen requerir más margen (45 días)
    });

    if (equiposProximos.length === 0 && patronesProximos.length === 0) {
      return NextResponse.json({ message: 'No hay elementos próximos a vencer. No se envió correo.' });
    }

    // 3. Generar HTML del correo
    let emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #00e5ff; padding-bottom: 10px;">
          Resumen Semanal de Metrología
        </h2>
        <p style="color: #475569;">Hola,</p>
        <p style="color: #475569;">Este es el resumen automatizado de los instrumentos, equipos y patrones que requieren atención pronto.</p>
    `;

    if (patronesProximos.length > 0) {
      emailHtml += `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #b91c1c; margin-top: 0;">⚠️ MUY IMPORTANTE: Patrones Próximos a Calibrar</h3>
          <ul style="color: #7f1d1d; padding-left: 20px;">
            ${patronesProximos.map((p: any) => {
               const dias = differenceInDays(new Date(p.Fecha_Vencimiento_Certificado), today);
               const alertaStr = dias < 0 ? '¡VENCIDO!' : `Vence en ${dias} días`;
               return `<li><strong>${p.Nombre_Patron} (${p.Codigo})</strong> - ${alertaStr}</li>`;
            }).join('')}
          </ul>
        </div>
      `;
    }

    if (equiposProximos.length > 0) {
      emailHtml += `
        <h3 style="color: #334155; margin-top: 30px;">Equipos e Instrumentos Próximos a Verificación</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f8fafc; text-align: left;">
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; color: #475569;">Código</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; color: #475569;">Equipo</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; color: #475569;">Días Restantes</th>
            </tr>
          </thead>
          <tbody>
            ${equiposProximos.map((e: any) => {
              const dias = differenceInDays(new Date(e.Fecha_Proximo_Control), today);
              const color = dias < 0 ? '#ef4444' : (dias <= 15 ? '#f59e0b' : '#334155');
              const text = dias < 0 ? 'Vencido' : `${dias} días`;
              return `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">${e.Codigo_Interno}</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">${e.Nombre_Equipo}</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: ${color}; font-weight: bold;">${text}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    emailHtml += `
        <p style="color: #64748b; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          Este es un correo automático generado por el Sistema de Control Metrológico Pro.<br>
          Por favor no responda directamente a este correo.
        </p>
      </div>
    `;

    // 4. Configurar Nodemailer y Enviar
    // Requiere configurar SMTP_HOST, SMTP_USER y SMTP_PASS en Vercel para el emisario.
    const smtpHost = process.env.SMTP_HOST || '';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';

    // Destinatarios solicitados por Polifusion
    const targetEmails = 'cmunizaga@polifusion.cl, vlutz@polifusion.cl';
    const ccEmails = 'jdiaz@polifusion.cl';

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("Faltan credenciales SMTP. Simulación de envío completada.");
      return NextResponse.json({ 
        message: 'Credenciales SMTP no configuradas. Email generado en simulación.', 
        destinatarios: targetEmails,
        cc: ccEmails,
        simulatedHtml: emailHtml 
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true para puerto 465, false para otros (587)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Sistema Metrología" <${smtpUser}>`,
      to: targetEmails,
      cc: ccEmails,
      subject: `🛑 Alertas Semanales de Metrología: ${patronesProximos.length + equiposProximos.length} elementos requieren atención`,
      html: emailHtml,
    });

    return NextResponse.json({ message: 'Correos enviados exitosamente', messageId: info.messageId });

  } catch (error) {
    console.error("Error ejecutando cron:", error);
    return NextResponse.json({ error: 'Fallo al ejecutar la rutina programada' }, { status: 500 });
  }
}
