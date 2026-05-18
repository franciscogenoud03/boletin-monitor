import nodemailer from 'nodemailer'
import { Alerta, TIPOS_LABEL } from './scraper'
import { TIPOS_LABEL as TL } from './scraper'

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function enviarAlertaMail(alertas: Alerta[]) {
  if (!alertas.length) return

  const transporter = createTransport()

  const hoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const resumenPorSociedad: Record<string, Alerta[]> = {}
  for (const a of alertas) {
    if (!resumenPorSociedad[a.sociedad_nombre]) resumenPorSociedad[a.sociedad_nombre] = []
    resumenPorSociedad[a.sociedad_nombre].push(a)
  }

  const badgeColors: Record<string, string> = {
    asamblea:   '#b45309',
    disolucion: '#dc2626',
    directorio: '#1d4ed8',
    capital:    '#0369a1',
    estatuto:   '#15803d',
    otro:       '#6b7280',
  }
  const badgeBg: Record<string, string> = {
    asamblea:   '#fef3c7',
    disolucion: '#fee2e2',
    directorio: '#dbeafe',
    capital:    '#e0f2fe',
    estatuto:   '#dcfce7',
    otro:       '#f3f4f6',
  }

  const sociedad_blocks = Object.entries(resumenPorSociedad).map(([nombre, items]) => `
    <div style="margin-bottom:24px;">
      <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
        ${nombre}
      </h3>
      ${items.map(a => `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span style="background:${badgeBg[a.tipo]??'#f3f4f6'};color:${badgeColors[a.tipo]??'#374151'};font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;">
              ${TL[a.tipo] ?? a.tipo}
            </span>
            <span style="font-size:12px;color:#6b7280;">
              📅 ${a.fecha_publicacion} &nbsp;|&nbsp; Boletín N° ${a.numero_boletin} &nbsp;|&nbsp; ${a.seccion}
            </span>
          </div>
          <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.6;">${a.resumen}</p>
          <a href="${a.url}" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:500;">
            Ver publicación en Boletín Oficial →
          </a>
        </div>
      `).join('')}
    </div>
  `).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:#111827;padding:24px 32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;color:#9ca3af;text-transform:uppercase;">Monitor</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Boletín Oficial</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">${hoy}</p>
    </div>

    <!-- Summary banner -->
    <div style="background:#fef9c3;border-bottom:1px solid #fde68a;padding:12px 32px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:20px;">🔔</span>
      <span style="font-size:14px;color:#92400e;font-weight:500;">
        Se encontraron <strong>${alertas.length} novedad${alertas.length > 1 ? 'es' : ''}</strong> en ${Object.keys(resumenPorSociedad).length} sociedad${Object.keys(resumenPorSociedad).length > 1 ? 'es' : ''}
      </span>
    </div>

    <!-- Content -->
    <div style="padding:24px 32px;">
      ${sociedad_blocks}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Monitor Boletín Oficial · Escaneo automático diario<br>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? '#'}" style="color:#6b7280;">Ir al panel →</a>
      </p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: `"Monitor BO" <${process.env.GMAIL_USER}>`,
    to: process.env.ALERT_EMAIL_TO,
    subject: `🔔 Boletín Oficial: ${alertas.length} novedad${alertas.length > 1 ? 'es' : ''} (${new Date().toLocaleDateString('es-AR')})`,
    html,
  })
}
