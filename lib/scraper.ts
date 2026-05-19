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

export async function buscarEnBoletin(nombreSociedad, tipos) {
  const resultados = []
  try {
    const res = await axios.get(
      'https://www.boletinoficial.gob.ar/busquedaAvanzada/realizarBusqueda',
      {
        params: {
          busqueda: 'basica',
          denominacion: nombreSociedad,
          seccion: '2',
          tipoBoletin: '1',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 15000,
      }
    )
    const avisos = res.data && res.data.avisos ? res.data.avisos :
                   res.data && res.data.results ? res.data.results :
                   res.data && res.data.data ? res.data.data : []

    for (const aviso of avisos) {
      const texto = String(aviso.descripcion || aviso.rubro || '').toLowerCase()
      let tipoDetectado = 'otro'
      for (const tipo of tipos) {
        if (tipo === 'otro') continue
        const kws = KEYWORDS[tipo] || []
        if (kws.some(function(kw) { return texto.includes(kw) })) {
          tipoDetectado = tipo
          break
        }
      }
      const rubro = String(aviso.rubro || '').toLowerCase()
      if (rubro.includes('convocatoria') || rubro.includes('asamblea')) tipoDetectado = 'asamblea'
      if (rubro.includes('disoluci') || rubro.includes('liquidaci')) tipoDetectado = 'disolucion'
      if (tipos.indexOf(tipoDetectado) === -1 && tipos.indexOf('otro') === -1) continue
      const fecha = String(aviso.fechaPublicacion || aviso.fecha || new Date().toISOString().slice(0, 10))
      resultados.push({
        tipo: tipoDetectado,
        fecha: fecha.slice(0, 10),
        numeroBoletin: String(aviso.numeroBoletin || '—'),
        seccion: '2da seccion',
        resumen: String(aviso.descripcion || aviso.rubro || 'Publicacion de ' + nombreSociedad).slice(0, 600),
        url: 'https://www.boletinoficial.gob.ar/detalleAviso/segunda/' + (aviso.id || '') + '/' + fecha.slice(0,10).replace(/-/g,''),
      })
    }
  } catch (err) {
    console.error('Error BO "' + nombreSociedad + '":', err.message)
  }
  return resultados
}
