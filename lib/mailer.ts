import nodemailer from 'nodemailer'
import { TIPOS_LABEL } from './scraper'

type Alerta = {
  id: string
  sociedad_id: string
  sociedad_nombre: string
  tipo: string
  fecha_publicacion: string
  numero_boletin: string
  seccion: string
  resumen: string
  url: string
  leida: boolean
  created_at: string
}

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
  const sociedad_blocks = Object.entries(resumenPorSociedad).map(([nombre, items]) => `
    <div style="margin-bottom:24px;">
      <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">${nombre}</h3>
      ${items.map(a => `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:10px;">
          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">📅 ${a.fecha_publicacion} · Boletín N° ${a.numero_boletin}</p>
          <p style="margin:0 0 10px;font-size:13px;color:#374151;">${a.resumen}</p>
          <a href="${a.url}" style="font-size:12px;color:#2563eb;">Ver en Boletín Oficial →</a>
        </div>
      `).join('')}
    </div>
  `).join('')
  await transporter.sendMail({
    from: `"Monitor BO" <${process.env.GMAIL_USER}>`,
    to: process.env.ALERT_EMAIL_TO,
    subject: `🔔 Boletín Oficial: ${alertas.length} novedad${alertas.length > 1 ? 'es' : ''} (${new Date().toLocaleDateString('es-AR')})`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">${sociedad_blocks}</div>`,
  })
}
