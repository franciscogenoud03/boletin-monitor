import axios from 'axios'

export const TIPOS_LABEL: Record<string, string> = {
  asamblea:   'Convocatoria a asamblea',
  disolucion: 'Disolución / liquidación',
  directorio: 'Cambio de directorio',
  capital:    'Modificación de capital',
  estatuto:   'Reforma de estatuto',
  otro:       'Otro edicto',
}

// Palabras clave por tipo de publicación
const KEYWORDS: Record<string, string[]> = {
  asamblea:   ['asamblea', 'convocatoria', 'accionistas', 'reunión de socios'],
  disolucion: ['disolución', 'liquidación', 'liquidador'],
  directorio: ['directorio', 'directores', 'designación', 'presidente', 'autoridades'],
  capital:    ['capital social', 'aumento de capital', 'reducción de capital'],
  estatuto:   ['estatuto', 'reforma estatutaria', 'modificación estatuto'],
  otro:       [],
}

export type BoletinResult = {
  tipo: string
  fecha: string
  numeroBoletin: string
  seccion: string
  resumen: string
  url: string
}

/**
 * Busca publicaciones en el Boletín Oficial para una sociedad dada.
 * Usa la API pública de búsqueda del sitio oficial.
 */
export async function buscarEnBoletin(
  nombreSociedad: string,
  tipos: string[],
  fechaDesde?: string
): Promise<BoletinResult[]> {
  const resultados: BoletinResult[] = []

  // Fecha por defecto: últimas 48 hs
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 2)
  const desde = fechaDesde ?? ayer.toISOString().slice(0, 10).replace(/-/g, '')
  const hasta = hoy.toISOString().slice(0, 10).replace(/-/g, '')

  try {
    // API pública del Boletín Oficial argentino
    const url = `https://www.boletinoficial.gob.ar/busquedaAvanzada/api`
    const params = {
      denominacion: nombreSociedad,
      desde,
      hasta,
      secciones: '2', // 2da sección: Sociedades
      tipoBoletin: '1',
    }

    const res = await axios.get(url, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BoletinMonitor/1.0)',
        Accept: 'application/json',
      },
    })

    const data = res.data
    const avisos = data?.avisos ?? data?.results ?? data?.data ?? []

    for (const aviso of avisos) {
      const texto = (aviso.descripcion || aviso.texto || aviso.contenido || '').toLowerCase()
      const textoOriginal = aviso.descripcion || aviso.texto || aviso.contenido || ''

      // Detectar el tipo según keywords
      let tipoDetectado = 'otro'
      for (const tipo of tipos) {
        if (tipo === 'otro') continue
        const kws = KEYWORDS[tipo] ?? []
        if (kws.some((kw) => texto.includes(kw))) {
          tipoDetectado = tipo
          break
        }
      }

      // Filtrar: solo incluir si el tipo detectado está en los tipos solicitados
      if (!tipos.includes(tipoDetectado) && !tipos.includes('otro')) continue

      const fechaPublicacion =
        aviso.fecha ?? aviso.fechaPublicacion ?? hoy.toISOString().slice(0, 10)
      const numeroBoletin = aviso.numeroBoletin ?? aviso.nroBoletin ?? '—'
      const seccion = aviso.seccion ?? '2ª sección'

      resultados.push({
        tipo: tipoDetectado,
        fecha: fechaPublicacion.slice(0, 10),
        numeroBoletin: String(numeroBoletin),
        seccion,
        resumen: textoOriginal.slice(0, 600),
        url: `https://www.boletinoficial.gob.ar/detalleAviso/segunda/${aviso.id ?? ''}/${fechaPublicacion.slice(0, 10).replace(/-/g, '')}`,
      })
    }
  } catch (err: any) {
    // Si la API falla, intentar scraping básico como fallback
    console.error(`Error consultando BO para "${nombreSociedad}":`, err.message)
  }

  return resultados
}
