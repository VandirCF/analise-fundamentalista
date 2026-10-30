import { describe, expect, it } from 'vitest'
import { calcularGraham, calcularUpside, calcularValuation } from '../lib/valuation'

describe('calcularGraham', () => {
  it('calcula √(22,5 × LPA × VPA) com valores exatos', () => {
    // 22,5 × 4 × 10 = 900; √900 = 30
    expect(calcularGraham(4, 10)).toBe(30)
  })

  it('retorna null quando o LPA não é positivo', () => {
    expect(calcularGraham(-4, 10)).toBeNull()
    expect(calcularGraham(0, 10)).toBeNull()
  })

  it('retorna null quando o VPA não é positivo', () => {
    expect(calcularGraham(4, -10)).toBeNull()
    expect(calcularGraham(4, 0)).toBeNull()
  })
})

describe('calcularUpside', () => {
  it('é positivo quando o preço está abaixo do valor intrínseco', () => {
    // (30 − 20) / 20 × 100 = 50,0
    expect(calcularUpside(30, 20)).toBe(50)
  })

  it('é negativo quando o preço está acima do valor intrínseco', () => {
    // (30 − 40) / 40 × 100 = −25,0
    expect(calcularUpside(30, 40)).toBe(-25)
  })

  it('arredonda para uma casa decimal', () => {
    // √360 = 18,97366…; (18,97366 − 15) / 15 × 100 = 26,49… → 26,5
    expect(calcularUpside(Math.sqrt(360), 15)).toBe(26.5)
  })

  it('retorna null sem cotação positiva', () => {
    expect(calcularUpside(30, 0)).toBeNull()
  })
})

describe('calcularValuation', () => {
  const base = {
    ticker: 'PETR4',
    cotacaoReferencia: 20,
    pl: 5,
    pvp: 2,
    precoAtual: 24,
    atualizadoEm: '2026-10-30T14:05:00-03:00',
  }

  it('deriva LPA e VPA da cotação de referência, dividida por P/L e P/VP', () => {
    const v = calcularValuation(base)
    expect(v.lpa).toBe(4) // 20 / 5
    expect(v.vpa).toBe(10) // 20 / 2
    expect(v.grahamVI).toBe(30) // √(22,5 × 4 × 10)
    expect(v.upsidePct).toBe(25) // (30 − 24) / 24 × 100
    expect(v.cotacao).toBe(24)
    expect(v.motivoNulo).toBeNull()
  })

  it('usa o preço atual no upside, e não a cotação de referência', () => {
    const v = calcularValuation({ ...base, precoAtual: 15 })
    expect(v.grahamVI).toBe(30)
    expect(v.upsidePct).toBe(100) // (30 − 15) / 15 × 100
  })

  it('marca LPA_NAO_POSITIVO com P/L negativo, sem valor de Graham', () => {
    const v = calcularValuation({ ...base, pl: -5 })
    expect(v.lpa).toBe(-4)
    expect(v.grahamVI).toBeNull()
    expect(v.upsidePct).toBeNull()
    expect(v.motivoNulo).toBe('LPA_NAO_POSITIVO')
  })

  it('marca VPA_NAO_POSITIVO com P/VP negativo', () => {
    const v = calcularValuation({ ...base, pvp: -2 })
    expect(v.grahamVI).toBeNull()
    expect(v.motivoNulo).toBe('VPA_NAO_POSITIVO')
  })

  it('marca SEM_DADO_FUNDAMENTALISTA quando P/L é nulo ou zero', () => {
    expect(calcularValuation({ ...base, pl: null }).motivoNulo).toBe('SEM_DADO_FUNDAMENTALISTA')
    expect(calcularValuation({ ...base, pl: 0 }).motivoNulo).toBe('SEM_DADO_FUNDAMENTALISTA')
    expect(calcularValuation({ ...base, pl: 0 }).lpa).toBeNull()
  })

  it('marca SEM_DADO_FUNDAMENTALISTA quando P/VP é nulo ou zero', () => {
    expect(calcularValuation({ ...base, pvp: null }).motivoNulo).toBe('SEM_DADO_FUNDAMENTALISTA')
    expect(calcularValuation({ ...base, pvp: 0 }).motivoNulo).toBe('SEM_DADO_FUNDAMENTALISTA')
    expect(calcularValuation({ ...base, pvp: 0 }).vpa).toBeNull()
  })

  it('mantém o valor de Graham e marca SEM_COTACAO quando não há preço atual', () => {
    const v = calcularValuation({ ...base, precoAtual: null, atualizadoEm: null })
    expect(v.grahamVI).toBe(30)
    expect(v.upsidePct).toBeNull()
    expect(v.cotacao).toBeNull()
    expect(v.motivoNulo).toBe('SEM_COTACAO')
  })
})
