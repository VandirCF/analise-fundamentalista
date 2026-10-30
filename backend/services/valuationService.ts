import type { Valuation } from '../types'
import { cache } from '../lib/cache'
import { normalizarTicker } from '../lib/tickers'
import { calcularValuation } from '../lib/valuation'
import { getPrecoAtivo } from './brapiService'
import { getTabelaFundamentus } from './fundamentusService'

/** TTL do valuation em segundos (depende da cotação atual, que muda durante o dia). */
export const VALUATION_TTL = 3600

/**
 * Retorna o valuation de Graham de um ativo, com cache de 1 hora.
 * Só grava no cache quando há dados fundamentalistas e cotação atual, para não fixar uma falha.
 * @param ticker Ticker do ativo, com ou sem `.SA`.
 * @returns Valuation do ativo, com motivoNulo quando o cálculo não se aplica.
 * @throws Erro se a tabela do Fundamentus não puder ser obtida.
 */
export async function getValuation(ticker: string): Promise<Valuation> {
  const t = normalizarTicker(ticker)
  const chave = `valuation:${t}`

  const emCache = await cache.get<Valuation>(chave)
  if (emCache !== null) return emCache

  const [tabela, preco] = await Promise.all([getTabelaFundamentus(), getPrecoAtivo(t)])
  const linha = tabela.get(t)

  const valuation = calcularValuation({
    ticker: t,
    cotacaoReferencia: linha?.cotacao ?? null,
    pl: linha?.pl ?? null,
    pvp: linha?.pvp ?? null,
    precoAtual: preco?.preco ?? null,
    atualizadoEm: preco?.atualizadoEm ?? null,
  })

  if (linha !== undefined && preco !== null) {
    await cache.set(chave, valuation, VALUATION_TTL)
  }
  return valuation
}
