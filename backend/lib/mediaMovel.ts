import type { PontoMediaMovel } from '../types'

/** Número de pregões da média móvel de longo prazo. */
export const JANELA_MEDIA_200 = 200

/** Fechamento de um pregão. */
export interface FechamentoDiario {
  /** Data do pregão (AAAA-MM-DD), no fuso de Brasília. */
  data: string
  fechamento: number
}

/**
 * Média móvel simples que só produz valor quando há `janela` pregões completos.
 * Não usa janela parcial: os primeiros `janela − 1` pregões não geram ponto.
 * @param serie Fechamentos diários em ordem crescente de data, sem datas repetidas.
 * @param janela Número de pregões da média.
 * @returns Pontos da média, do primeiro pregão com janela completa ao último.
 */
export function mediaMovelCompleta(
  serie: readonly FechamentoDiario[],
  janela: number,
): PontoMediaMovel[] {
  const pontos: PontoMediaMovel[] = []
  let soma = 0
  for (let i = 0; i < serie.length; i++) {
    soma += serie[i].fechamento
    if (i >= janela) soma -= serie[i - janela].fechamento
    if (i >= janela - 1) {
      pontos.push({ timestamp: serie[i].data, valor: soma / janela })
    }
  }
  return pontos
}

/**
 * Mantém somente os pontos a partir de uma data, inclusive.
 * @param pontos Pontos ordenados por data.
 * @param desde Data inicial (AAAA-MM-DD), inclusive.
 * @returns Pontos com data maior ou igual a `desde`.
 */
export function pontosDesde(pontos: readonly PontoMediaMovel[], desde: string): PontoMediaMovel[] {
  return pontos.filter((ponto) => ponto.timestamp >= desde)
}
