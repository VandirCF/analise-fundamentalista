/** Indicadores calculados por trimestre (ver specs/02-indicadores.md). */
export const INDICADORES_TRIMESTRAIS = [
  'ROE',
  'ROA',
  'MARGEM_EBIT',
  'MARGEM_LIQUIDA',
  'MARGEM_EBITDA',
  'DIVIDA_LIQ_PL',
  'DIVIDA_BRUTA_PL',
  'LIQ_CORRENTE',
  'LIQ_SECA',
  'GIRO_ATIVO',
] as const

export type IndicadorTrimestral = (typeof INDICADORES_TRIMESTRAIS)[number]

/**
 * Valores de um trimestre, em reais. Fluxos (receita, EBIT, D&A, lucro) já em TTM; saldos no fim do trimestre.
 * Null quando a conta não existe no arquivo.
 */
export interface ValoresTrimestre {
  receitaTtm: number | null
  ebitTtm: number | null
  daTtm: number | null
  llTtm: number | null
  /** PL atribuível à controladora (2.03 − 2.03.09). */
  plControladora: number | null
  ativoTotal: number | null
  ativoCirculante: number | null
  passivoCirculante: number | null
  estoques: number | null
  caixa: number | null
  aplicacoes: number | null
  /** Empréstimos e financiamentos, circulante e não circulante (2.01.04 + 2.02.01). */
  dividaBruta: number | null
}

/**
 * Soma de valores, ou null se algum for null.
 * @param valores Parcelas.
 * @returns Soma, ou null.
 */
function somar(...valores: (number | null)[]): number | null {
  if (valores.some((v) => v === null)) return null
  return valores.reduce<number>((total, v) => total + (v as number), 0)
}

/**
 * Divide só quando o denominador é positivo e ambos existem. Denominador ≤ 0 vira null (P2).
 * O numerador pode ser negativo (ex.: prejuízo).
 * @param numerador Numerador.
 * @param denominador Denominador, que precisa ser positivo.
 * @returns Quociente, ou null.
 */
export function dividir(numerador: number | null, denominador: number | null): number | null {
  if (numerador === null || denominador === null || denominador <= 0) return null
  return numerador / denominador
}

/**
 * TTM de um fluxo no trimestre `q` (1 a 3), a partir dos acumulados (specs/02-indicadores.md):
 * TTM(Y, q) = YTD(Y, q) + Anual(Y − 1) − YTD(Y − 1, q). Para o 4º trimestre, o TTM é o próprio exercício anual.
 * @param ytdAtual Acumulado do ano até o trimestre (YTD(Y, q)).
 * @param anualAnterior Exercício anual do ano anterior (Anual(Y − 1)).
 * @param ytdAnterior Acumulado do ano anterior até o mesmo trimestre (YTD(Y − 1, q)).
 * @returns TTM, ou null se algum componente faltar.
 */
export function calcularTtm(
  ytdAtual: number | null,
  anualAnterior: number | null,
  ytdAnterior: number | null,
): number | null {
  return somar(ytdAtual, anualAnterior, ytdAnterior === null ? null : -ytdAnterior)
}

/**
 * Calcula os dez indicadores de um trimestre, com as regras de nulo de specs/02-indicadores.md.
 * @param v Valores do trimestre.
 * @returns Mapa indicador → valor (null quando não se aplica ou falta dado).
 */
export function calcularIndicadoresTrimestrais(
  v: ValoresTrimestre,
): Record<IndicadorTrimestral, number | null> {
  const dividaLiquida = somar(
    v.dividaBruta,
    v.caixa === null ? null : -v.caixa,
    v.aplicacoes === null ? null : -v.aplicacoes,
  )
  const ebitda = somar(v.ebitTtm, v.daTtm)
  const liquidezSeca =
    v.estoques === null || v.ativoCirculante === null
      ? null
      : dividir(v.ativoCirculante - v.estoques, v.passivoCirculante)

  return {
    ROE: dividir(v.llTtm, v.plControladora),
    ROA: dividir(v.llTtm, v.ativoTotal),
    MARGEM_EBIT: dividir(v.ebitTtm, v.receitaTtm),
    MARGEM_LIQUIDA: dividir(v.llTtm, v.receitaTtm),
    MARGEM_EBITDA: dividir(ebitda, v.receitaTtm),
    DIVIDA_LIQ_PL: dividir(dividaLiquida, v.plControladora),
    DIVIDA_BRUTA_PL: dividir(v.dividaBruta, v.plControladora),
    LIQ_CORRENTE: dividir(v.ativoCirculante, v.passivoCirculante),
    LIQ_SECA: liquidezSeca,
    GIRO_ATIVO: dividir(v.receitaTtm, v.ativoTotal),
  }
}
