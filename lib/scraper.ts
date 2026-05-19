ESTE ESEL CODIGOimport axios from 'axios'
export const TIPOS_LABEL: Record<string, string> = {
  asamblea:   'Convocatoria a asamblea',
  disolucion: 'Disolución / liquidación',
  directorio: 'Cambio de directorio',
  capital:    'Modificación de capital',
  estatuto:   'Reforma de estatuto',
  otro:       'Otro edicto',
}
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
export async function buscarEnBoletin(
  nombreSociedad: string,
  tipos: string[]
): Promise<BoletinResult[]> {
  const resultados: BoletinResult[] = []
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
          'Accept': 'application/json, text/javascript, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 15000,
      }
    )
    const avisos = res.data?.avisos ?? res.data?.results ?? res.data?.data ?? []
    for (const aviso of avisos) {
      const texto = (
        aviso.descripcion ?? aviso.texto ?? aviso.contenido ?? aviso.rubro ?? ''
      ).toLowerCase()
      const textoOriginal = aviso.descripcion ?? aviso.texto ?? aviso.contenido ?? aviso.rubro ?? ''
      let tipoDetectado = 'otro'
      for (const tipo of tipos) {
        if (tipo === 'otro') continue
        const kws = KEYWORDS[tipo] ?? []
        if (kws.some((kw) => texto.includes(kw))) {
          tipoDetectado = tipo
          break
        }
      }
      // También detectar por rubro
      const rubro = (aviso.rubro ?? '').toLowerCase()
      if (rubro.includes('convocatoria') || rubro.includes('asamblea')) tipoDetectado =
