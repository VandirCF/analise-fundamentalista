import { describe, expect, it } from 'vitest'
import { agruparSeries, type LinhaIndicador } from '../lib/seriesTrimestrais'

/**
 * Linha de indicador para os testes.
 * @param indicador Nome do indicador.
 * @param ano Ano.
 * @param trimestre Trimestre.
 * @param valor Valor (null quando não se aplica).
 * @returns Linha no formato lido do banco.
 */
function linha(
  indicador: string,
  ano: number,
  trimestre: number,
  valor: number | null,
): LinhaIndicador {
  return {
    indicador,
    ano,
    trimestre,
    valor,
    dataDivulgacao: new Date(`${ano}-03-31T00:00:00Z`),
  }
}

describe('agruparSeries', () => {
  it('agrupa por indicador e ordena por ano e trimestre', () => {
    const linhas = [
      linha('ROE', 2025, 2, 0.2),
      linha('ROE', 2024, 4, 0.18),
      linha('ROE', 2025, 1, 0.19),
      linha('ROA', 2025, 1, 0.05),
    ]
    const s = agruparSeries(linhas, 2024, 2025)
    expect(s.ROE?.map((p) => `${p.ano}T${p.trimestre}`)).toEqual(['2024T4', '2025T1', '2025T2'])
    expect(s.ROA?.length).toBe(1)
  })

  it('mantém valor null, sem convertê-lo em zero', () => {
    const s = agruparSeries([linha('LIQ_SECA', 2025, 1, null)], 2025, 2025)
    expect(s.LIQ_SECA?.[0].valor).toBeNull()
  })

  it('recorta pelo intervalo de anos, com os extremos inclusos', () => {
    const linhas = [linha('ROE', 2022, 1, 1), linha('ROE', 2023, 1, 2), linha('ROE', 2025, 1, 3)]
    const s = agruparSeries(linhas, 2023, 2024)
    expect(s.ROE?.map((p) => p.valor)).toEqual([2])
  })

  it('devolve a data de divulgação em AAAA-MM-DD', () => {
    const s = agruparSeries([linha('ROE', 2025, 1, 0.1)], 2025, 2025)
    expect(s.ROE?.[0].dataDivulgacao).toBe('2025-03-31')
  })

  it('não inclui indicadores sem linha no intervalo', () => {
    const s = agruparSeries([linha('ROE', 2020, 1, 0.1)], 2024, 2025)
    expect(s).toEqual({})
  })
})
