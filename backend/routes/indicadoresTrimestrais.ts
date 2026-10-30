import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { LIMITE_ANOS_SERIE, recortarSeries, type SeriesTrimestrais } from '../lib/seriesTrimestrais'
import { getSeriesTrimestrais } from '../services/seriesTrimestraisService'
import { TICKER_REGEX, normalizarTicker } from '../lib/tickers'

/** Ano inteiro entre 2010 e 2100, vindo da query string. */
const AnoSchema = z.coerce.number().int().min(2010).max(2100)

/** Parâmetros do intervalo. Sem `ate`, usa o ano corrente; sem `de`, usa o intervalo máximo permitido. */
const IntervaloSchema = z.object({
  de: AnoSchema.optional(),
  ate: AnoSchema.optional(),
})

/**
 * Rotas de histórico trimestral dos indicadores de um ativo.
 * @param app Instância do Fastify (registrada com prefixo `/api`).
 */
export async function indicadoresTrimestraisRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/ativos/:ticker/indicadores-trimestrais?de=2015&ate=2025 — séries trimestrais por indicador.
   */
  app.get<{ Params: { ticker: string }; Querystring: { de?: string; ate?: string } }>(
    '/ativos/:ticker/indicadores-trimestrais',
    async (req, reply: FastifyReply): Promise<SeriesTrimestrais | FastifyReply> => {
      const ticker = normalizarTicker(req.params.ticker)
      if (!TICKER_REGEX.test(ticker)) {
        return reply.code(400).send({ erro: 'Ticker inválido. Exemplo: PETR4' })
      }

      const intervalo = IntervaloSchema.safeParse(req.query)
      if (!intervalo.success) {
        return reply.code(400).send({ erro: 'Ano inválido. Use um ano entre 2010 e 2100.' })
      }
      const ate = intervalo.data.ate ?? new Date().getFullYear()
      const de = intervalo.data.de ?? ate - (LIMITE_ANOS_SERIE - 1)

      if (de > ate) {
        return reply.code(400).send({ erro: 'O ano inicial não pode ser maior que o final.' })
      }
      if (ate - de + 1 > LIMITE_ANOS_SERIE) {
        return reply
          .code(400)
          .send({ erro: `O intervalo máximo é de ${LIMITE_ANOS_SERIE} anos por requisição.` })
      }

      try {
        const series = await getSeriesTrimestrais(ticker)
        return recortarSeries(series, de, ate)
      } catch (erro: unknown) {
        app.log.error({ err: erro, ticker }, 'Falha ao ler indicadores trimestrais')
        return reply.code(503).send({ erro: 'Indicadores trimestrais indisponíveis no momento.' })
      }
    },
  )
}
