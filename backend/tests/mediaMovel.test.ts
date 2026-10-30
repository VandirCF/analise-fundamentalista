import { describe, expect, it } from 'vitest'
import { JANELA_MEDIA_200, mediaMovelCompleta, pontosDesde } from '../lib/mediaMovel'

/**
 * Gera uma série diária de fechamentos a partir de 2026-01-01, um pregão por dia.
 * @param valores Fechamentos em ordem.
 * @returns Série no formato usado pela média.
 */
function serie(valores: number[]): { data: string; fechamento: number }[] {
  return valores.map((fechamento, i) => {
    const data = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
    return { data, fechamento }
  })
}

describe('mediaMovelCompleta', () => {
  it('não gera ponto antes de a janela estar completa', () => {
    const pontos = mediaMovelCompleta(serie([1, 2, 3, 4, 5]), 3)
    expect(pontos).toHaveLength(3)
    expect(pontos[0]).toEqual({ timestamp: '2026-01-03', valor: 2 }) // (1 + 2 + 3) / 3
  })

  it('calcula a média deslizante com valores exatos', () => {
    const pontos = mediaMovelCompleta(serie([1, 2, 3, 4, 5]), 3)
    expect(pontos.map((p) => p.valor)).toEqual([2, 3, 4]) // (2+3+4)/3 e (3+4+5)/3
  })

  it('não produz valor parcial quando a série é menor que a janela de 200 pregões', () => {
    const valores = Array.from({ length: JANELA_MEDIA_200 - 1 }, (_, i) => i + 1)
    expect(mediaMovelCompleta(serie(valores), JANELA_MEDIA_200)).toEqual([])
  })

  it('produz o primeiro ponto exatamente no 200º pregão', () => {
    const valores = Array.from({ length: JANELA_MEDIA_200 }, (_, i) => i + 1)
    const pontos = mediaMovelCompleta(serie(valores), JANELA_MEDIA_200)
    expect(pontos).toHaveLength(1)
    // média de 1..200 = 100,5
    expect(pontos[0].valor).toBe(100.5)
  })
})

describe('pontosDesde', () => {
  it('mantém somente os pontos a partir da data, inclusive', () => {
    const pontos = mediaMovelCompleta(serie([1, 2, 3, 4, 5]), 3)
    expect(pontosDesde(pontos, '2026-01-04').map((p) => p.timestamp)).toEqual([
      '2026-01-04',
      '2026-01-05',
    ])
  })
})
