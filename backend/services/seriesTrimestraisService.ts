import { cache } from '../lib/cache'
import { prisma } from '../lib/db'
import { normalizarTicker } from '../lib/tickers'
import { agruparSeries, type SeriesTrimestrais } from '../lib/seriesTrimestrais'

/** TTL das séries trimestrais em segundos (muda só com nova demonstração). */
export const INDTRI_TTL = 86400

/**
 * Séries trimestrais completas de um ativo (todos os anos gravados), com cache de 24 horas.
 * O recorte por intervalo é feito pelo chamador, para que a chave do cache seja só o ticker.
 * @param ticker Ticker do ativo, com ou sem `.SA`.
 * @returns Séries por indicador, na ordem cronológica.
 */
export async function getSeriesTrimestrais(ticker: string): Promise<SeriesTrimestrais> {
  const t = normalizarTicker(ticker)
  return cache.getOrSet(`indtri:${t}`, INDTRI_TTL, async (): Promise<SeriesTrimestrais> => {
    const linhas = await prisma.indicadorTrimestral.findMany({
      where: { ticker: t },
      select: { indicador: true, ano: true, trimestre: true, valor: true, dataDivulgacao: true },
      orderBy: [{ ano: 'asc' }, { trimestre: 'asc' }],
    })
    return agruparSeries(linhas, 0, 9999)
  })
}
