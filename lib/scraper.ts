// @ts-nocheck
import axios from 'axios'

export const TIPOS_LABEL = {
  asamblea:   'Convocatoria a asamblea',
  disolucion: 'Disolucion / liquidacion',
  directorio: 'Cambio de directorio',
  capital:    'Modificacion de capital',
  estatuto:   'Reforma de estatuto',
  otro:       'Otro edicto',
}

const RUBRO_A_TIPO = {
  2100: 'asamblea',
  1110: 'estatuto', 1120: 'estatuto', 1130: 'estatuto',
  1210: 'estatuto', 1220: 'estatuto',
  3200: 'disolucion', 2250: 'disolucion',
  2300: 'directorio',
}

const BASE = 'https://timeline.boletinoficial.gob.ar'

async function buscarIndice(nombre) {
  try {
    const res = await axios.post(BASE + '/', 
      'searchtext_type=society&searchtext_society=' + encodeURIComponent(nombre),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE + '/' }, timeout: 15000 }
    )
    const match = res.data.match(/indice['":\s]+([A-Z0-9]+)/)
    return match ? match[1] : null
  } catch(e) {
    console.error('Error buscando indice:', e.message)
    return null
  }
}

async function obtenerAvisos(indice) {
  try {
    const res = await axios.post(BASE + '/obtener_sociedades_por_id',
      'id=' + indice,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE + '/' }, timeout: 15000 }
    )
    return res.data
  } catch(e) {
    console.error('Error obteniendo avisos:', e.message)
    return null
  }
}

export async function buscarEnBoletin(nombreSociedad, tipos) {
  const resultados = []
  try {
    const indice = await buscarIndice(nombreSociedad)
    if (!indice) return resultados

    const data = await obtenerAvisos(indice)
    if (!data || !data.items) return resultados

    const haceDosDias = new Date()
    haceDosDias.setDate(haceDosDias.getDate() - 2)

    for (const item of data.items) {
      const partes = item.fecha_desde.split('-')
      const fecha = new Date(partes[2] + '-' + partes[1] + '-' + partes[0])
      if (fecha < haceDosDias) continue

      for (const aviso of item.avisos) {
        let tipo = RUBRO_A_TIPO[aviso.id_rubro] || 'otro'
        if (!tipos.includes(tipo) && !tipos.includes('otro')) continue

        const fechaStr = partes[2] + '-' + partes[1] + '-' + partes[0]
        const fechaLink = partes[0] + partes[1] + partes[2]

        resultados.push({
          tipo,
          fecha: fechaStr,
          numeroBoletin: String(aviso.id_aviso || '—'),
          seccion: '2da seccion',
          resumen: aviso.rubro + (aviso.asuntos && aviso.asuntos.length ? ' — ' + aviso.asuntos.join(', ') : ''),
          url: 'https://www.boletinoficial.gob.ar/detalleAviso/segunda/' + aviso.id_aviso + '/' + fechaLink,
        })
      }
    }
  } catch(e) {
    console.error('Error scraper:', e.message)
  }
  return resultados
}
