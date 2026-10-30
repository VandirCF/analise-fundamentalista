import { z } from 'zod'
import type { PontoMediaMovel } from '@/types'

/** URL base do backend Fastify. Não é segredo; pode ser exposta ao cliente. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const PontoSchema = z.object({
  timestamp: z.string(),
  valor: z.number(),
})

const RespostaSchema = z.array(PontoSchema)

/**
 * Busca a média móvel de 200 pregões de um ativo para um período diário.
 * @param ticker Ticker já validado, ex.: "PETR4".
 * @param periodo Um de '1m' | '3m' | '1y' | '5y'.
 * @returns Pontos da média, somente onde há 200 pregões completos.
 * @throws Error se a API falhar ou o formato da resposta for inesperado.
 */
export async function buscarMediaMovel200(
  ticker: string,
  periodo: '1m' | '3m' | '1y' | '5y',
): Promise<PontoMediaMovel[]> {
  const resposta = await fetch(`${API_URL}/api/ativos/${ticker}/media-movel-200?periodo=${periodo}`)
  if (!resposta.ok) {
    throw new Error(`Falha ao carregar a média de 200 pregões (HTTP ${resposta.status})`)
  }
  const dados: unknown = await resposta.json()
  return RespostaSchema.parse(dados)
}
