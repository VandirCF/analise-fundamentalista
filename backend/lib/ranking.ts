/** Indicadores do ranking, fixos (ADR-003). */
export const INDICADORES_RANKING = [
  'ROE',
  'ROA',
  'MARGEM_LIQUIDA',
  'DIVIDA_LIQ_PL',
  'LIQ_CORRENTE',
] as const

export type IndicadorRanking = (typeof INDICADORES_RANKING)[number]

/** Sentido de cada indicador: 'maior' é melhor, ou 'menor' é melhor (dívida). */
export const SENTIDO: Readonly<Record<IndicadorRanking, 'maior' | 'menor'>> = {
  ROE: 'maior',
  ROA: 'maior',
  MARGEM_LIQUIDA: 'maior',
  DIVIDA_LIQ_PL: 'menor',
  LIQ_CORRENTE: 'maior',
}

/** Mínimo de trimestres com valor válido em cada janela, por indicador (specs/03, seção 3). */
export const MINIMO_TRIMESTRES = 4

/** Ponto de indicador trimestral com a data em que ficou disponível (AAAA-MM-DD). */
export interface PontoJanela {
  ano: number
  trimestre: number
  valor: number | null
  dataDivulgacao: string
}

/** Média de um ativo para cada indicador do ranking, na janela. Null quando inelegível naquele indicador. */
export type MediasAtivo = Record<IndicadorRanking, number | null>

/** Item do ranking de um ativo elegível. */
export interface ItemRanking {
  ticker: string
  posicao: number
  nota: number
  /** Alocação em fração (0,25 = 25%). A soma dos itens é 1. */
  alocacao: number
  medias: MediasAtivo
}

/** Ativo fora do ranking e o motivo. */
export interface AvisoRanking {
  ticker: string
  motivo: 'INDICADOR_SEM_JANELA_VALIDA'
  indicadores: IndicadorRanking[]
}

/**
 * Média dos trimestres com valor válido na janela, ou null se houver menos que o mínimo (P2).
 * @param valores Valores de um indicador na janela (null = sem valor).
 * @returns Média aritmética, ou null.
 */
export function mediaJanela(valores: readonly (number | null)[]): number | null {
  const validos = valores.filter((v): v is number => v !== null)
  if (validos.length < MINIMO_TRIMESTRES) return null
  return validos.reduce((soma, v) => soma + v, 0) / validos.length
}

/**
 * Média de um indicador na janela de `anoFim − 2` a `anoFim`, usando só demonstrações divulgadas
 * até a data de decisão (P3). A decisão do ranking de `anoFim` ocorre em 1º de janeiro de `anoFim + 1`.
 * @param pontos Pontos do indicador para o ativo.
 * @param anoFim Último ano da janela de 3 anos.
 * @param dataDecisao Data da decisão (AAAA-MM-DD). Só entram pontos divulgados até essa data.
 * @returns Média da janela, ou null.
 */
export function mediaIndicadorNaJanela(
  pontos: readonly PontoJanela[],
  anoFim: number,
  dataDecisao: string,
): number | null {
  const anoInicio = anoFim - 2
  const disponiveis = pontos.filter(
    (p) => p.ano >= anoInicio && p.ano <= anoFim && p.dataDivulgacao <= dataDecisao,
  )
  return mediaJanela(disponiveis.map((p) => p.valor))
}

/**
 * Normaliza um indicador entre os elegíveis: min-max em [0, 1], com inversão quando menor é melhor.
 * Se todos têm o mesmo valor, o resultado é 0,5 (neutro).
 * @param valores Valor de cada ativo elegível, por ticker.
 * @param sentido 'maior' ou 'menor' é melhor.
 * @returns Nota normalizada por ticker.
 */
export function normalizar(
  valores: ReadonlyMap<string, number>,
  sentido: 'maior' | 'menor',
): Map<string, number> {
  const nums = [...valores.values()]
  const minimo = Math.min(...nums)
  const maximo = Math.max(...nums)
  const normalizado = new Map<string, number>()
  for (const [ticker, valor] of valores) {
    const x = maximo === minimo ? 0.5 : (valor - minimo) / (maximo - minimo)
    normalizado.set(ticker, sentido === 'maior' ? x : 1 - x)
  }
  return normalizado
}

/**
 * Gera o ranking de uma janela. Ativos sem média válida em algum indicador ficam de fora, com aviso
 * (nunca preenchidos com zero). Nota = soma dos indicadores normalizados (pesos iguais). Alocação =
 * nota / soma das notas; se a soma for zero, alocação igualitária. Empates recebem a mesma posição.
 * @param entradas Médias por ativo.
 * @returns Itens do ranking, ordenados por posição, e avisos dos ativos excluídos.
 */
export function gerarRanking(entradas: readonly { ticker: string; medias: MediasAtivo }[]): {
  ranking: ItemRanking[]
  avisos: AvisoRanking[]
} {
  const elegiveis: { ticker: string; medias: MediasAtivo }[] = []
  const avisos: AvisoRanking[] = []
  for (const entrada of entradas) {
    const faltando = INDICADORES_RANKING.filter((i) => entrada.medias[i] === null)
    if (faltando.length > 0) {
      avisos.push({
        ticker: entrada.ticker,
        motivo: 'INDICADOR_SEM_JANELA_VALIDA',
        indicadores: faltando,
      })
    } else {
      elegiveis.push(entrada)
    }
  }
  if (elegiveis.length === 0) return { ranking: [], avisos }

  const notas = new Map<string, number>(elegiveis.map((e) => [e.ticker, 0]))
  for (const indicador of INDICADORES_RANKING) {
    const valores = new Map(elegiveis.map((e) => [e.ticker, e.medias[indicador] as number]))
    for (const [ticker, x] of normalizar(valores, SENTIDO[indicador])) {
      notas.set(ticker, (notas.get(ticker) ?? 0) + x)
    }
  }

  const somaNotas = [...notas.values()].reduce((s, n) => s + n, 0)
  const ordenados = [...elegiveis].sort(
    (a, b) => (notas.get(b.ticker) ?? 0) - (notas.get(a.ticker) ?? 0),
  )

  const ranking: ItemRanking[] = []
  let posicaoAtual = 0
  let notaAnterior: number | null = null
  ordenados.forEach((e, indice) => {
    const nota = notas.get(e.ticker) ?? 0
    if (notaAnterior === null || nota < notaAnterior) posicaoAtual = indice + 1
    notaAnterior = nota
    ranking.push({
      ticker: e.ticker,
      posicao: posicaoAtual,
      nota,
      alocacao: somaNotas === 0 ? 1 / elegiveis.length : nota / somaNotas,
      medias: e.medias,
    })
  })
  return { ranking, avisos }
}
