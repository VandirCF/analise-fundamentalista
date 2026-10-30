import type { MotivoNulo, Valuation } from '../types'

/** Constante de Graham: 22,5 equivale a P/L ≤ 15 e P/VP ≤ 1,5 simultaneamente. */
export const CONSTANTE_GRAHAM = 22.5

/** Entradas do valuation vindas do Fundamentus (cotação de referência) e da cotação atual. */
export interface EntradaValuation {
  ticker: string
  /** Cotação de referência do Fundamentus (fechamento do último pregão). */
  cotacaoReferencia: number | null
  /** P/L (Preço/Lucro) do Fundamentus. */
  pl: number | null
  /** P/VP (Preço/Valor Patrimonial) do Fundamentus. */
  pvp: number | null
  /** Cotação atual em reais, ou null quando nenhuma fonte respondeu. */
  precoAtual: number | null
  /** Momento da leitura da cotação atual (ISO 8601). */
  atualizadoEm: string | null
}

/**
 * Valor intrínseco de Graham: √(22,5 × LPA × VPA). Só existe com LPA e VPA positivos.
 * @param lpa Lucro por ação em reais.
 * @param vpa Valor patrimonial por ação em reais.
 * @returns Valor intrínseco em reais, ou null quando LPA ou VPA não são positivos.
 */
export function calcularGraham(lpa: number, vpa: number): number | null {
  if (!(lpa > 0) || !(vpa > 0)) return null
  return Math.sqrt(CONSTANTE_GRAHAM * lpa * vpa)
}

/**
 * Upside em percentual, com uma casa decimal: (valor intrínseco − cotação) / cotação × 100.
 * @param valorIntrinseco Valor intrínseco de Graham em reais.
 * @param cotacao Cotação atual em reais.
 * @returns Upside em percentual, ou null quando a cotação não é positiva.
 */
export function calcularUpside(valorIntrinseco: number, cotacao: number): number | null {
  if (!(cotacao > 0)) return null
  const percentual = ((valorIntrinseco - cotacao) / cotacao) * 100
  return Math.round(percentual * 10) / 10
}

/**
 * Monta o valuation de um ativo a partir das entradas. LPA e VPA saem da cotação de referência
 * dividida por P/L e P/VP, conforme specs/02-indicadores.md. Campos sem dado viram null.
 * A ordem dos motivos é: dado ausente, LPA não positivo, VPA não positivo, sem cotação atual.
 * @param entrada Dados do Fundamentus e cotação atual.
 * @returns Valuation do ativo, com motivoNulo quando algum campo ficou sem valor.
 */
export function calcularValuation(entrada: EntradaValuation): Valuation {
  const base = {
    ticker: entrada.ticker,
    cotacao: entrada.precoAtual,
    atualizadoEm: entrada.atualizadoEm,
  }

  const faltaDado =
    entrada.cotacaoReferencia === null ||
    entrada.pl === null ||
    entrada.pvp === null ||
    entrada.pl === 0 ||
    entrada.pvp === 0
  if (faltaDado) {
    return {
      ...base,
      lpa: null,
      vpa: null,
      grahamVI: null,
      upsidePct: null,
      motivoNulo: 'SEM_DADO_FUNDAMENTALISTA',
    }
  }

  const lpa = entrada.cotacaoReferencia! / entrada.pl!
  const vpa = entrada.cotacaoReferencia! / entrada.pvp!

  let motivo: MotivoNulo | null = null
  if (!(lpa > 0)) motivo = 'LPA_NAO_POSITIVO'
  else if (!(vpa > 0)) motivo = 'VPA_NAO_POSITIVO'

  const grahamVI = calcularGraham(lpa, vpa)
  let upsidePct: number | null = null
  if (grahamVI !== null && entrada.precoAtual !== null) {
    upsidePct = calcularUpside(grahamVI, entrada.precoAtual)
  } else if (grahamVI !== null && motivo === null) {
    motivo = 'SEM_COTACAO'
  }

  return { ...base, lpa, vpa, grahamVI, upsidePct, motivoNulo: motivo }
}
