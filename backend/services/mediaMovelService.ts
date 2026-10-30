import type { Candle, PontoMediaMovel } from '../types'
import { cache } from '../lib/cache'
import { normalizarTicker } from '../lib/tickers'
import {
  JANELA_MEDIA_200,
  mediaMovelCompleta,
  pontosDesde,
  type FechamentoDiario,
} from '../lib/mediaMovel'
import { buscarCandlesYahoo } from './yahooService'

/** Períodos diários: os únicos em que a média de 200 pregões faz sentido (ver specs/02-indicadores.md). */
export const PERIODOS_DIARIOS = ['1m', '3m', '1y', '5y'] as const
export type PeriodoDiario = (typeof PERIODOS_DIARIOS)[number]

/** Dias corridos visíveis em cada período diário. */
const DIAS_VISIVEIS: Readonly<Record<PeriodoDiario, number>> = {
  '1m': 31,
  '3m': 92,
  '1y': 366,
  '5y': 1830,
}

/** Dias corridos de aquecimento: 200 pregões cabem em cerca de 290 dias corridos. */
const DIAS_AQUECIMENTO = 400

/** TTL da série completa da média em segundos. */
export const MEDIA_MOVEL_200_TTL = 3600

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Data civil (AAAA-MM-DD) de um timestamp no fuso de Brasília.
 * @param iso Timestamp ISO 8601.
 * @returns Data no formato AAAA-MM-DD.
 */
function dataBrasilia(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Converte candles diários em fechamentos com data de Brasília.
 * @param candles Candles diários em ordem crescente.
 * @returns Fechamentos por pregão.
 */
function fechamentos(candles: readonly Candle[]): FechamentoDiario[] {
  return candles.map((candle) => ({
    data: dataBrasilia(candle.timestamp),
    fechamento: candle.close,
  }))
}

/**
 * Retorna a média móvel de 200 pregões de um ativo para um período diário.
 * A série completa (com aquecimento) fica em cache; o período só recorta os pontos visíveis.
 * @param ticker Ticker do ativo, com ou sem `.SA`.
 * @param periodo Um de '1m' | '3m' | '1y' | '5y'.
 * @returns Pontos da média, somente onde há 200 pregões completos.
 * @throws Erro se o Yahoo não responder ou não houver pregões diários.
 */
export async function getMediaMovel200(
  ticker: string,
  periodo: PeriodoDiario,
): Promise<PontoMediaMovel[]> {
  const t = normalizarTicker(ticker)

  const serieCompleta = await cache.getOrSet(
    `mm200:${t}`,
    MEDIA_MOVEL_200_TTL,
    async (): Promise<PontoMediaMovel[]> => {
      const candles = await buscarCandlesYahoo(t, DIAS_VISIVEIS['5y'] + DIAS_AQUECIMENTO, '1d')
      if (candles.length === 0) throw new Error(`Sem pregões diários para ${t}`)
      return mediaMovelCompleta(fechamentos(candles), JANELA_MEDIA_200)
    },
  )

  const desde = dataBrasilia(
    new Date(Date.now() - DIAS_VISIVEIS[periodo] * MILISSEGUNDOS_POR_DIA).toISOString(),
  )
  return pontosDesde(serieCompleta, desde)
}
