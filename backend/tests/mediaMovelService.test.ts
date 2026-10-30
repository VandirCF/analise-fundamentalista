import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Candle } from '../types'
import { getMediaMovel200 } from '../services/mediaMovelService'

// Cache sem Redis: executa o fetch e não guarda nada, para o teste ser determinístico.
vi.mock('../lib/cache', () => ({
  cache: {
    getOrSet: async <T>(_chave: string, _ttl: number, fetchFn: () => Promise<T>): Promise<T> =>
      fetchFn(),
  },
}))

// Série diária sintética: fechamento igual ao índice do pregão (1, 2, 3, …).
const { buscarCandlesYahoo } = vi.hoisted(() => ({
  buscarCandlesYahoo: vi.fn<(t: string, dias: number, intervalo: string) => Promise<Candle[]>>(),
}))
vi.mock('../services/yahooService', () => ({ buscarCandlesYahoo }))

/** Data de referência fixa: 30/10/2026, meio-dia em Brasília. */
const AGORA = new Date('2026-10-30T15:00:00Z')

/**
 * Gera `total` pregões diários terminando em AGORA, com fechamento igual à posição (1..total).
 * @param total Número de pregões.
 * @returns Candles em ordem crescente de data.
 */
function candlesSinteticos(total: number): Candle[] {
  const candles: Candle[] = []
  for (let i = 0; i < total; i++) {
    const dias = total - 1 - i
    const instante = new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000)
    // 12:00 UTC cai no mesmo dia civil em Brasília.
    instante.setUTCHours(12, 0, 0, 0)
    candles.push({
      timestamp: instante.toISOString(),
      open: i + 1,
      high: i + 1,
      low: i + 1,
      close: i + 1,
      volume: 0,
    })
  }
  return candles
}

describe('getMediaMovel200', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(AGORA)
    buscarCandlesYahoo.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pede pregões diários com aquecimento, mesmo para o período de 1 mês', async () => {
    buscarCandlesYahoo.mockResolvedValue(candlesSinteticos(1500))
    await getMediaMovel200('PETR4', '1m')
    expect(buscarCandlesYahoo).toHaveBeenCalledWith('PETR4', 1830 + 400, '1d')
  })

  it('usa pregões anteriores ao período: a média de 1 mês tem 200 pregões completos', async () => {
    buscarCandlesYahoo.mockResolvedValue(candlesSinteticos(300))
    const pontos = await getMediaMovel200('PETR4', '1m')
    expect(pontos.length).toBeGreaterThan(0)
    // Cada ponto é a média dos 200 fechamentos anteriores e do próprio dia.
    // Fechamentos são 1..300; no último pregão, a média de 101..300 = 200,5.
    expect(pontos[pontos.length - 1].valor).toBe(200.5)
  })

  it('não gera ponto para os pregões sem 200 anteriores completos', async () => {
    // Só 150 pregões: nenhuma média completa de 200.
    buscarCandlesYahoo.mockResolvedValue(candlesSinteticos(150))
    expect(await getMediaMovel200('PETR4', '1m')).toEqual([])
  })

  it('recorta os pontos ao período pedido', async () => {
    buscarCandlesYahoo.mockResolvedValue(candlesSinteticos(400))
    const umMes = await getMediaMovel200('PETR4', '1m')
    const umAno = await getMediaMovel200('PETR4', '1y')
    expect(umMes.length).toBeLessThan(umAno.length)
    expect(umMes[0].timestamp >= '2026-09-29').toBe(true)
  })

  it('falha quando o Yahoo não devolve pregões diários', async () => {
    buscarCandlesYahoo.mockResolvedValue([])
    await expect(getMediaMovel200('PETR4', '1m')).rejects.toThrow(/Sem pregões diários/)
  })
})
