import type { IndicadorTrimestral } from './indicadoresTrimestrais'

/** Linha de IndicadorTrimestral como lida do banco. */
export interface LinhaIndicador {
  indicador: string
  ano: number
  trimestre: number
  valor: number | null
  dataDivulgacao: Date
}

/** Ponto de uma série trimestral. `valor` é null quando o indicador não se aplica ou falta dado. */
export interface PontoSerie {
  ano: number
  trimestre: number
  valor: number | null
  /** Data a partir da qual o indicador pode ser usado (AAAA-MM-DD). */
  dataDivulgacao: string
}

/** Séries por indicador, na ordem cronológica. */
export type SeriesTrimestrais = Partial<Record<IndicadorTrimestral, PontoSerie[]>>

/** Limite de anos por requisição (specs/06-contratos-api.md). */
export const LIMITE_ANOS_SERIE = 20

/**
 * Agrupa as linhas por indicador, em ordem de ano e trimestre, dentro do intervalo pedido.
 * @param linhas Linhas de IndicadorTrimestral do ativo.
 * @param de Primeiro ano, inclusive.
 * @param ate Último ano, inclusive.
 * @returns Séries por indicador. Indicadores sem nenhuma linha no intervalo não aparecem.
 */
export function agruparSeries(
  linhas: readonly LinhaIndicador[],
  de: number,
  ate: number,
): SeriesTrimestrais {
  const series: Record<string, PontoSerie[]> = {}
  const dentro = linhas
    .filter((l) => l.ano >= de && l.ano <= ate)
    .sort((a, b) => a.ano - b.ano || a.trimestre - b.trimestre)

  for (const l of dentro) {
    const serie = (series[l.indicador] ??= [])
    serie.push({
      ano: l.ano,
      trimestre: l.trimestre,
      valor: l.valor,
      dataDivulgacao: l.dataDivulgacao.toISOString().slice(0, 10),
    })
  }
  return series as SeriesTrimestrais
}

/**
 * Recorta séries já montadas ao intervalo de anos pedido, com os extremos inclusos.
 * O cache guarda a série completa do ativo; o recorte acontece a cada leitura.
 * @param series Séries completas por indicador.
 * @param de Primeiro ano, inclusive.
 * @param ate Último ano, inclusive.
 * @returns Séries restritas ao intervalo. Indicadores que ficam vazios são removidos.
 */
export function recortarSeries(
  series: SeriesTrimestrais,
  de: number,
  ate: number,
): SeriesTrimestrais {
  const recorte: Record<string, PontoSerie[]> = {}
  for (const [indicador, pontos] of Object.entries(series)) {
    const dentro = (pontos ?? []).filter((p) => p.ano >= de && p.ano <= ate)
    if (dentro.length > 0) recorte[indicador] = dentro
  }
  return recorte as SeriesTrimestrais
}
