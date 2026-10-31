import { describe, expect, it } from 'vitest'
import {
  gerarRanking,
  mediaIndicadorNaJanela,
  mediaJanela,
  normalizar,
  type MediasAtivo,
  type PontoJanela,
} from '../lib/ranking'

/**
 * Médias de um ativo para os cinco indicadores do ranking.
 * @param roe ROE médio.
 * @param roa ROA médio.
 * @param ml Margem líquida média.
 * @param dl Dívida líquida / PL média.
 * @param lc Liquidez corrente média.
 * @returns Médias do ativo.
 */
function medias(
  roe: number | null,
  roa: number | null,
  ml: number | null,
  dl: number | null,
  lc: number | null,
): MediasAtivo {
  return { ROE: roe, ROA: roa, MARGEM_LIQUIDA: ml, DIVIDA_LIQ_PL: dl, LIQ_CORRENTE: lc }
}

describe('mediaJanela', () => {
  it('calcula a média quando há ao menos 4 trimestres válidos', () => {
    expect(mediaJanela([1, 2, 3, 4])).toBe(2.5)
  })

  it('ignora trimestres sem valor na média', () => {
    expect(mediaJanela([1, 2, null, 3, 4])).toBe(2.5)
  })

  it('retorna null com menos de 4 trimestres válidos, sem preencher com zero', () => {
    expect(mediaJanela([1, 2, 3, null])).toBeNull()
  })
})

describe('mediaIndicadorNaJanela (P3: só o que foi divulgado até a decisão)', () => {
  const pontos: PontoJanela[] = [
    { ano: 2022, trimestre: 1, valor: 0.1, dataDivulgacao: '2022-05-15' },
    { ano: 2022, trimestre: 2, valor: 0.2, dataDivulgacao: '2022-08-14' },
    { ano: 2022, trimestre: 3, valor: 0.3, dataDivulgacao: '2022-11-14' },
    { ano: 2022, trimestre: 4, valor: 0.4, dataDivulgacao: '2023-03-31' }, // divulgado depois de 1º/jan/2023
    { ano: 2023, trimestre: 1, valor: 0.5, dataDivulgacao: '2023-05-15' },
  ]

  it('exclui trimestres divulgados depois da data de decisão', () => {
    // Janela 2020–2022 com decisão em 2023-01-01: entram só os três primeiros de 2022.
    expect(mediaIndicadorNaJanela(pontos, 2022, '2023-01-01')).toBeNull() // só 3 válidos
  })

  it('usa a janela de três anos e a média dos válidos quando há quatro', () => {
    const comQuatro = [
      ...pontos.slice(0, 3),
      { ano: 2021, trimestre: 4, valor: 0.6, dataDivulgacao: '2022-03-31' },
    ]
    // 2021 T4 (0,6) + 2022 T1–T3 (0,1, 0,2, 0,3) = 1,2 / 4 = 0,3
    expect(mediaIndicadorNaJanela(comQuatro, 2022, '2023-01-01')).toBeCloseTo(0.3, 10)
  })

  it('ignora pontos fora dos três anos da janela', () => {
    const fora = [{ ano: 2019, trimestre: 1, valor: 9, dataDivulgacao: '2019-05-15' }]
    expect(mediaIndicadorNaJanela(fora, 2022, '2023-01-01')).toBeNull()
  })
})

describe('normalizar', () => {
  it('maior é melhor: o maior valor recebe 1, o menor recebe 0', () => {
    const r = normalizar(
      new Map([
        ['A', 3],
        ['B', 1],
        ['C', 2],
      ]),
      'maior',
    )
    expect(r.get('A')).toBe(1)
    expect(r.get('B')).toBe(0)
    expect(r.get('C')).toBe(0.5)
  })

  it('menor é melhor: o menor valor recebe 1 (inversão)', () => {
    const r = normalizar(
      new Map([
        ['A', 2],
        ['B', 1],
        ['C', 0.5],
      ]),
      'menor',
    )
    // min 0,5, max 2: A = 1 − 1 = 0; B: x = (1 − 0,5)/1,5 = 1/3, invertido = 2/3; C = 1
    expect(r.get('C')).toBe(1)
    expect(r.get('A')).toBe(0)
    expect(r.get('B')).toBeCloseTo(2 / 3, 10)
  })

  it('valores iguais viram 0,5 (neutro)', () => {
    const r = normalizar(
      new Map([
        ['A', 2],
        ['B', 2],
      ]),
      'maior',
    )
    expect(r.get('A')).toBe(0.5)
    expect(r.get('B')).toBe(0.5)
  })
})

describe('gerarRanking', () => {
  // Três ativos com médias escolhidas para o cálculo conferido à mão.
  // ROE:  A 0,3 (1), B 0,1 (0), C 0,2 (0,5)
  // ROA:  A 0,10 (1), B 0,05 (0), C 0,08 (0,6)
  // ML:   A 0,2 (1), B 0,1 (0), C 0,15 (0,5)
  // DL (menor é melhor): A 1,0 → 2/3; B 2,0 → 0; C 0,5 → 1
  // LC:   A 2,0 (1), B 1,0 (0), C 1,5 (0,5)
  // Notas: A = 1+1+1+2/3+1 = 4,6667; B = 0; C = 0,5+0,6+0,5+1+0,5 = 3,1
  const entradas = [
    { ticker: 'A', medias: medias(0.3, 0.1, 0.2, 1.0, 2.0) },
    { ticker: 'B', medias: medias(0.1, 0.05, 0.1, 2.0, 1.0) },
    { ticker: 'C', medias: medias(0.2, 0.08, 0.15, 0.5, 1.5) },
  ]
  const { ranking, avisos } = gerarRanking(entradas)

  it('ordena pela nota: A, C, B', () => {
    expect(ranking.map((r) => r.ticker)).toEqual(['A', 'C', 'B'])
    expect(ranking.map((r) => r.posicao)).toEqual([1, 2, 3])
  })

  it('calcula a nota composta com os pesos iguais', () => {
    expect(ranking[0].nota).toBeCloseTo(14 / 3, 10) // 4,6667
    expect(ranking[1].nota).toBeCloseTo(3.1, 10)
    expect(ranking[2].nota).toBe(0)
  })

  it('aloca nota / soma das notas, e a soma das alocações é 1', () => {
    // soma = 14/3 + 3,1 = 7,7667; A = 4,6667 / 7,7667 ≈ 0,6009; B = 0
    expect(ranking[0].alocacao).toBeCloseTo(14 / 3 / (14 / 3 + 3.1), 10)
    expect(ranking[2].alocacao).toBe(0)
    const soma = ranking.reduce((s, r) => s + r.alocacao, 0)
    expect(soma).toBeCloseTo(1, 10)
  })

  it('não há avisos quando todos têm as cinco médias', () => {
    expect(avisos).toEqual([])
  })

  it('exclui com aviso o ativo com alguma média ausente, sem preenchê-lo com zero', () => {
    const r = gerarRanking([...entradas, { ticker: 'D', medias: medias(0.5, null, 0.3, 0.1, 2) }])
    expect(r.ranking.map((i) => i.ticker)).not.toContain('D')
    expect(r.avisos).toEqual([
      { ticker: 'D', motivo: 'INDICADOR_SEM_JANELA_VALIDA', indicadores: ['ROA'] },
    ])
  })

  it('empates recebem a mesma posição, e o próximo pula (método min)', () => {
    const iguais = gerarRanking([
      { ticker: 'X', medias: medias(0.3, 0.1, 0.2, 1, 2) },
      { ticker: 'Y', medias: medias(0.3, 0.1, 0.2, 1, 2) },
      { ticker: 'Z', medias: medias(0.1, 0.05, 0.1, 2, 1) },
    ]).ranking
    expect(iguais.map((i) => i.posicao)).toEqual([1, 1, 3])
  })

  it('dois ativos idênticos recebem notas iguais e alocação de 50%', () => {
    const r = gerarRanking([
      { ticker: 'P', medias: medias(0.3, 0.1, 0.2, 1, 2) },
      { ticker: 'Q', medias: medias(0.3, 0.1, 0.2, 1, 2) },
    ])
    expect(r.ranking[0].alocacao).toBeCloseTo(0.5, 10)
  })

  it('sem ativos elegíveis, devolve ranking vazio', () => {
    expect(gerarRanking([]).ranking).toEqual([])
  })
})
