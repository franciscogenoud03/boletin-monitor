import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'
import { buscarEnBoletin } from '../../lib/scraper'
import { enviarAlertaMail } from '../../lib/mailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Seguridad: solo llamadas con el secret correcto
  const authHeader = req.headers.authorization ?? ''
  const secret = process.env.CRON_SECRET
  if (authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Obtener todas las sociedades activas
    const { data: sociedades, error: socError } = await supabaseAdmin
      .from('sociedades')
      .select('*')
      .eq('activa', true)

    if (socError) throw socError
    if (!sociedades?.length) {
      await logScan('Escaneo completado', 'Sin sociedades activas', 0)
      return res.json({ ok: true, mensaje: 'Sin sociedades activas' })
    }

    const nuevasAlertas: any[] = []

    // 2. Para cada sociedad, buscar en el Boletín Oficial
    for (const soc of sociedades) {
      const resultados = await buscarEnBoletin(soc.nombre, soc.tipos)

      for (const r of resultados) {
        // Verificar que no exista ya esta alerta (dedup por sociedad+boletin+tipo)
        const { data: existente } = await supabaseAdmin
          .from('alertas')
          .select('id')
          .eq('sociedad_id', soc.id)
          .eq('numero_boletin', r.numeroBoletin)
          .eq('tipo', r.tipo)
          .maybeSingle()

        if (existente) continue

        const { data: nueva, error: insErr } = await supabaseAdmin
          .from('alertas')
          .insert({
            sociedad_id: soc.id,
            sociedad_nombre: soc.nombre,
            tipo: r.tipo,
            fecha_publicacion: r.fecha,
            numero_boletin: r.numeroBoletin,
            seccion: r.seccion,
            resumen: r.resumen,
            url: r.url,
            leida: false,
          })
          .select()
          .single()

        if (!insErr && nueva) nuevasAlertas.push(nueva)
      }
    }

    // 3. Enviar mail si hay novedades
    if (nuevasAlertas.length > 0) {
      await enviarAlertaMail(nuevasAlertas)
    }

    // 4. Loguear
    const sociedadesConNovedad = [...new Set(nuevasAlertas.map((a) => a.sociedad_nombre))]
    const detalle = nuevasAlertas.length
      ? `${nuevasAlertas.length} novedad(es) encontradas: ${sociedadesConNovedad.join(', ')}`
      : 'Sin novedades'

    await logScan('Escaneo completado', detalle, nuevasAlertas.length)

    return res.json({
      ok: true,
      alertasGeneradas: nuevasAlertas.length,
      sociedadesEscaneadas: sociedades.length,
    })
  } catch (err: any) {
    console.error('Error en cron:', err)
    await logScan('Error en escaneo', err.message ?? 'Error desconocido', 0)
    return res.status(500).json({ error: err.message })
  }
}

async function logScan(mensaje: string, detalle: string, alertasGeneradas: number) {
  await supabaseAdmin.from('scan_log').insert({ mensaje, detalle, alertas_generadas: alertasGeneradas })
}
