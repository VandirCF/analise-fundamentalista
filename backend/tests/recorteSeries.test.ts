import { describe, expect, it } from 'vitest'
import { recortarSeries, type SeriesTrimestrais } from '../lib/seriesTrimestrais'

const series: SeriesTrimestrais = {
  ROE: [
    { ano: 2022, trimestre: 4, valor: 0.1, dataDivulgacao: '2023-03-31' },
    { ano: 2023, trimestre: 1, valor: 0.2, dataDivulgacao: '2023-05-15' },
    { ano: 2025, trimestre: 1, valor: 0.3, dataDivulgacao: '2025-05-15' },
  ],
  ROA: [{ ano: 2010, trimestre: 1, valor: 0.05, dataDivulgacao: '2010-05-15' }],
}

describe('recortarSeries', () => {
  it('mantém os pontos dentro do intervalo, com os extremos inclusos', () => {
    const r = recortarSeries(series, 2023, 2025)
    expect(r.ROE?.map((p) => p.ano)).toEqual([2023, 2025])
  })

  it('remove indicadores que ficam sem pontos no intervalo', () => {
    const r = recortarSeries(series, 2023, 2025)
    expect(r.ROA).toBeUndefined()
  })

  it('não altera a série original', () => {
    recortarSeries(series, 2024, 2024)
    expect(series.ROE?.length).toBe(3)
  })
})
