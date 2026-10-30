import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Valuation } from '../types'
import { getValuation } from '../services/valuationService'
import { TICKER_REGEX, normalizarTicker } from '../lib/tickers'

/** Mensagem genérica para falhas de fonte externa. */
const MENSAGEM_INDISPONIVEL = 'Valuation indisponível no momento. Tente novamente em instantes.'

/**
 * Rotas de valuation: valor intrínseco de Graham e upside do ativo.
 * @param app Instância do Fastify (registrada com prefixo `/api`).
 */
export async function valuationRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/ativos/:ticker/valuation — LPA, VPA, valor intrínseco de Graham e upside.
   */
  app.get<{ Params: { ticker: string } }>(
    '/ativos/:ticker/valuation',
    async (req, reply: FastifyReply): Promise<Valuation | FastifyReply> => {
      const ticker = normalizarTicker(req.params.ticker)
      if (!TICKER_REGEX.test(ticker)) {
        return reply.code(400).send({ erro: 'Ticker inválido. Exemplo: PETR4' })
      }
      try {
        return await getValuation(ticker)
      } catch (erro: unknown) {
        app.log.error({ err: erro, ticker }, 'Falha ao calcular valuation')
        return reply.code(503).send({ erro: MENSAGEM_INDISPONIVEL })
      }
    },
  )
}
