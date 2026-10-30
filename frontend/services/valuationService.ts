import { z } from 'zod'
import type { Valuation } from '@/types'

/** URL base do backend Fastify. Não é segredo; pode ser exposta ao cliente. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const numeroOuNulo = z.number().nullable()

const ValuationSchema = z.object({
  ticker: z.string(),
  cotacao: numeroOuNulo,
  lpa: numeroOuNulo,
  vpa: numeroOuNulo,
  grahamVI: numeroOuNulo,
  upsidePct: numeroOuNulo,
  atualizadoEm: z.string().nullable(),
  motivoNulo: z
    .enum(['SEM_DADO_FUNDAMENTALISTA', 'LPA_NAO_POSITIVO', 'VPA_NAO_POSITIVO', 'SEM_COTACAO'])
    .nullable(),
})

/**
 * Busca o valuation de Graham de um ativo.
 * @param ticker Ticker já validado, ex.: "PETR4".
 * @returns Valuation do ativo (campos sem dado vêm como null).
 * @throws Error se a API falhar ou o formato da resposta for inesperado.
 */
export async function buscarValuation(ticker: string): Promise<Valuation> {
  const resposta = await fetch(`${API_URL}/api/ativos/${ticker}/valuation`)
  if (!resposta.ok) {
    throw new Error(`Falha ao carregar o valuation (HTTP ${resposta.status})`)
  }
  const dados: unknown = await resposta.json()
  return ValuationSchema.parse(dados)
}
