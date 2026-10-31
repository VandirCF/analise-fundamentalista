import { z } from 'zod'
import { INDICADORES_TRIMESTRAIS, type SeriesTrimestrais } from '@/types'

/** URL base do backend Fastify. Não é segredo; pode ser exposta ao cliente. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const PontoSchema = z.object({
  ano: z.number().int(),
  trimestre: z.number().int(),
  valor: z.number().nullable(),
  dataDivulgacao: z.string(),
})

/** Schema da resposta: cada indicador conhecido pode vir com sua série. */
const SeriesSchema = z.object(
  Object.fromEntries(INDICADORES_TRIMESTRAIS.map((i) => [i, z.array(PontoSchema).optional()])),
)

/**
 * Busca as séries trimestrais de um ativo em um intervalo de anos.
 * @param ticker Ticker já validado, ex.: "PETR4".
 * @param de Primeiro ano, inclusive.
 * @param ate Último ano, inclusive.
 * @returns Séries por indicador (campos sem dado vêm ausentes).
 * @throws Error se a API falhar ou o formato da resposta for inesperado.
 */
export async function buscarIndicadoresTrimestrais(
  ticker: string,
  de: number,
  ate: number,
): Promise<SeriesTrimestrais> {
  const resposta = await fetch(
    `${API_URL}/api/ativos/${ticker}/indicadores-trimestrais?de=${de}&ate=${ate}`,
  )
  if (!resposta.ok) {
    throw new Error(`Falha ao carregar os indicadores trimestrais (HTTP ${resposta.status})`)
  }
  const dados: unknown = await resposta.json()
  return SeriesSchema.parse(dados)
}
