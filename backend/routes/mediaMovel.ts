import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { PontoMediaMovel } from '../types'
import { PERIODOS_DIARIOS, getMediaMovel200 } from '../services/mediaMovelService'
import { TICKER_REGEX, normalizarTicker } from '../lib/tickers'

const PeriodoDiarioSchema = z.enum(PERIODOS_DIARIOS)

/** Mensagem genérica para falhas de fonte externa. */
const MENSAGEM_INDISPONIVEL = 'Média móvel indisponível no momento. Tente novamente em instantes.'

/**
 * Rotas de média móvel de 200 pregões, calculada no backend.
 * @param app Instância do Fastify (registrada com prefixo `/api`).
 */
export async function mediaMovelRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/ativos/:ticker/media-movel-200?periodo=1m — média de 200 pregões do período diário.
   */
  app.get<{ Params: { ticker: string }; Querystring: { periodo?: string } }>(
    '/ativos/:ticker/media-movel-200',
    async (req, reply: FastifyReply): Promise<PontoMediaMovel[] | FastifyReply> => {
      const ticker = normalizarTicker(req.params.ticker)
      if (!TICKER_REGEX.test(ticker)) {
        return reply.code(400).send({ erro: 'Ticker inválido. Exemplo: PETR4' })
      }
      const periodo = PeriodoDiarioSchema.safeParse(req.query.periodo)
      if (!periodo.success) {
        return reply
          .code(400)
          .send({ erro: 'Período inválido para a média de 200 pregões. Use 1m, 3m, 1y ou 5y' })
      }
      try {
        return await getMediaMovel200(ticker, periodo.data)
      } catch (erro: unknown) {
        app.log.error({ err: erro, ticker }, 'Falha ao calcular média móvel de 200 pregões')
        return reply.code(503).send({ erro: MENSAGEM_INDISPONIVEL })
      }
    },
  )
}
