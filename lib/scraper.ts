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

const KEYWORDS = {
  asamblea:   ['asamblea', 'convocatoria', 'accionistas'],
  disolucion: ['disolucion', 'liquidacion'],
  directorio: ['directorio', 'designacion', 'autoridades'],
  capital:    ['capital social', 'aumento de capital'],
  estatuto:   ['estatuto', 'reforma estatutaria'],
  otro:       [],
}

function extraerTextoXML(xml, tag) {
  const match = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>'))
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : ''
}

function parsearItems(xml) {
  const items = []
  const regex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    const item = match[1]
    items.push({
      titulo: extraerTextoXML(item, 'title'),
      descripcion: extraerTextoXML(item, 'description'),
      fecha: extraerTextoXML(item, 'pubDate'),
      link: extraerTextoXML(item, 'link'),
    })
  }
  return items
}

export async function buscarEnBoletin(nombreSociedad, tipos) {
  const resultados = []
  try {
    const res = await axios.get(
      'https://www.boletinoficial.gob.ar/busquedaAvanzada/rss',
      {
        params: { seccion: '2', denominacion: nombreSociedad },
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, application/xml, text/xml' },
        timeout: 15000,
      }
    )

    const items = parsearItems(res.data)
    const nombreLower = nombreSociedad.toLowerCase()

    for (const item of items) {
      const texto = (item.titulo + ' ' + item.descripcion).toLowerCase()
      if (!texto.includes(nombreLower) && !item.titulo.toLowerCase().includes(nombreLower.split(' ')[0])) continue

      let tipoDetectado = 'otro'
      for (const tipo of tipos) {
        if (tipo === 'otro') continue
        const kws = KEYWORDS[tipo] || []
        if (kws.some(function(kw) { return texto.includes(kw) })) {
          tipoDetectado = tipo
          break
        }
      }
      if (texto.includes('convocatoria') || texto.includes('asamblea')) tipoDetectado = 'asamblea'
      if (texto.includes('disoluci') || texto.includes('liquidaci')) tipoDetectado = 'disolucion'
      if (tipos.indexOf(tipoDetectado) === -1 && tipos.indexOf('otro') === -1) continue

      const fechaStr = item.fecha ? new Date(item.fecha).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

      resultados.push({
        tipo: tipoDetectado,
        fecha: fechaStr,
        numeroBoletin: '—',
        seccion: '2da seccion',
        resumen: (item.titulo + ' — ' + item.descripcion).slice(0, 600),
        url: item.link || 'https://www.boletinoficial.gob.ar',
      })
    }
  } catch (err) {
    console.error('Error RSS BO "' + nombreSociedad + '":', err.message)
  }
  return resultados
}
