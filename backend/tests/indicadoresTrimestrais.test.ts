import { describe, expect, it } from 'vitest'
import {
  calcularIndicadoresTrimestrais,
  calcularTtm,
  dividir,
  type ValoresTrimestre,
} from '../lib/indicadoresTrimestrais'

/** Trimestre base: números redondos, para que cada indicador seja conferido à mão. */
const base: ValoresTrimestre = {
  receitaTtm: 400,
  ebitTtm: 80,
  daTtm: 20,
  llTtm: 50,
  plControladora: 200,
  ativoTotal: 800,
  ativoCirculante: 120,
  passivoCirculante: 80,
  estoques: 40,
  caixa: 50,
  aplicacoes: 20,
  dividaBruta: 300,
}

describe('calcularTtm (acumulados do ano)', () => {
  it('TTM(Y, q) = YTD(Y, q) + Anual(Y − 1) − YTD(Y − 1, q)', () => {
    // 100 + 500 − 80 = 520
    expect(calcularTtm(100, 500, 80)).toBe(520)
  })

  it('retorna null se algum acumulado faltar', () => {
    expect(calcularTtm(null, 500, 80)).toBeNull()
    expect(calcularTtm(100, null, 80)).toBeNull()
    expect(calcularTtm(100, 500, null)).toBeNull()
  })
})

describe('dividir', () => {
  it('divide quando o denominador é positivo', () => {
    expect(dividir(50, 200)).toBe(0.25)
  })

  it('retorna null com denominador zero ou negativo', () => {
    expect(dividir(50, 0)).toBeNull()
    expect(dividir(50, -10)).toBeNull()
  })

  it('aceita numerador negativo (prejuízo)', () => {
    expect(dividir(-50, 200)).toBe(-0.25)
  })
})

describe('calcularIndicadoresTrimestrais', () => {
  const indicadores = calcularIndicadoresTrimestrais(base)

  it('rentabilidade: ROE = LL / PL controladora; ROA = LL / ativo total', () => {
    expect(indicadores.ROE).toBe(0.25) // 50 / 200
    expect(indicadores.ROA).toBe(0.0625) // 50 / 800
  })

  it('margens: EBIT, líquida e EBITDA sobre a receita TTM', () => {
    expect(indicadores.MARGEM_EBIT).toBe(0.2) // 80 / 400
    expect(indicadores.MARGEM_LIQUIDA).toBe(0.125) // 50 / 400
    expect(indicadores.MARGEM_EBITDA).toBeCloseTo(0.25, 10) // (80 + 20) / 400
  })

  it('dívida líquida = dívida bruta − caixa − aplicações (230), sobre o PL', () => {
    expect(indicadores.DIVIDA_LIQ_PL).toBe(1.15) // 230 / 200
    expect(indicadores.DIVIDA_BRUTA_PL).toBe(1.5) // 300 / 200
  })

  it('liquidez corrente e seca', () => {
    expect(indicadores.LIQ_CORRENTE).toBe(1.5) // 120 / 80
    expect(indicadores.LIQ_SECA).toBe(1) // (120 − 40) / 80
  })

  it('giro do ativo = receita / ativo total', () => {
    expect(indicadores.GIRO_ATIVO).toBe(0.5) // 400 / 800
  })

  it('liquidez seca é null sem estoques, e não cai para a liquidez corrente', () => {
    const semEstoques = calcularIndicadoresTrimestrais({ ...base, estoques: null })
    expect(semEstoques.LIQ_SECA).toBeNull()
    expect(semEstoques.LIQ_CORRENTE).toBe(1.5)
  })

  it('PL negativo torna ROE e dívida sobre PL sem valor', () => {
    const plNegativo = calcularIndicadoresTrimestrais({ ...base, plControladora: -10 })
    expect(plNegativo.ROE).toBeNull()
    expect(plNegativo.DIVIDA_LIQ_PL).toBeNull()
    expect(plNegativo.DIVIDA_BRUTA_PL).toBeNull()
  })

  it('receita zero torna as margens sem valor; o giro, que depende só do ativo, fica zero', () => {
    const semReceita = calcularIndicadoresTrimestrais({ ...base, receitaTtm: 0 })
    expect(semReceita.MARGEM_EBIT).toBeNull()
    expect(semReceita.MARGEM_LIQUIDA).toBeNull()
    expect(semReceita.MARGEM_EBITDA).toBeNull()
    // Pela especificação, o giro só é nulo com ativo total não positivo: receita zero dá zero.
    expect(semReceita.GIRO_ATIVO).toBe(0)
  })

  it('EBITDA sem D&A é null', () => {
    expect(calcularIndicadoresTrimestrais({ ...base, daTtm: null }).MARGEM_EBITDA).toBeNull()
  })

  it('passivo circulante zero torna a liquidez sem valor', () => {
    const r = calcularIndicadoresTrimestrais({ ...base, passivoCirculante: 0 })
    expect(r.LIQ_CORRENTE).toBeNull()
    expect(r.LIQ_SECA).toBeNull()
  })
})
