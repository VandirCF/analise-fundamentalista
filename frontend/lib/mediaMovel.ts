import type { LineData, UTCTimestamp } from 'lightweight-charts'
import type { Candle, PontoMediaMovel } from '@/types'

/**
 * Dia civil (AAAA-MM-DD) de um timestamp no fuso de Brasília.
 * @param iso Timestamp ISO do candle ou da média.
 * @returns Data no formato AAAA-MM-DD.
 */
function diaBrasilia(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Alinha a média de 200 pregões aos candles exibidos, pelo dia civil de Brasília.
 * O ponto usa o mesmo instante do candle do dia, para que a linha coincida com o eixo do gráfico.
 * Candles sem média (ou sem pregões completos) não geram ponto.
 * @param candles Candles diários exibidos.
 * @param media Pontos da média de 200 pregões do período.
 * @returns Pontos de linha prontos para o gráfico, em ordem crescente de tempo.
 */
export function alinharMediaMovel(
  candles: readonly Candle[],
  media: readonly PontoMediaMovel[],
): LineData<UTCTimestamp>[] {
  const porDia = new Map<string, number>()
  for (const ponto of media) porDia.set(ponto.timestamp, ponto.valor)

  const pontos: LineData<UTCTimestamp>[] = []
  for (const candle of candles) {
    const valor = porDia.get(diaBrasilia(candle.timestamp))
    if (valor === undefined) continue
    pontos.push({
      time: Math.floor(new Date(candle.timestamp).getTime() / 1000) as UTCTimestamp,
      value: valor,
    })
  }
  return pontos
}
