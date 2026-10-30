import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  montarDemonstracoes,
  parsearCsvCvm,
  prazoDivulgacao,
  somenteUltimaVersao,
} from '../lib/cvm'

const FIXTURES = join(__dirname, 'fixtures', 'cvm')

/**
 * Lê um arquivo de amostra da CVM, decodificando de latin1 como nos arquivos oficiais.
 * @param nome Nome do arquivo em tests/fixtures/cvm.
 * @returns Texto decodificado.
 */
function lerFixture(nome: string): string {
  return new TextDecoder('latin1').decode(readFileSync(join(FIXTURES, nome)))
}

describe('parsearCsvCvm com amostra real (PETR4, 2025)', () => {
  it('lê o ITR e mantém os acumulados e trimestrais', () => {
    const { linhas, descartadas } = parsearCsvCvm(lerFixture('itr_2025_dre_petr4.csv'))
    expect(linhas.length).toBe(20)
    expect(descartadas).toEqual({})
    expect(linhas.every((l) => l.cdCvm === '009512')).toBe(true)
  })

  it('decodifica acentos do latin1 nas descrições', () => {
    const { linhas } = parsearCsvCvm(lerFixture('itr_2025_dre_petr4.csv'))
    const receita = linhas.find((l) => l.conta === '3.01')
    expect(receita?.descricao).toBe('Receita de Venda de Bens e/ou Serviços')
  })

  it('lê o valor como número, na escala publicada (MIL)', () => {
    const { linhas } = parsearCsvCvm(lerFixture('itr_2025_dre_petr4.csv'))
    const receitaTrimestre = linhas.find(
      (l) =>
        l.conta === '3.01' && l.dtInicioExerc === '2025-01-01' && l.dtFimExerc === '2025-03-31',
    )
    expect(receitaTrimestre?.valor).toBe(123144000)
    expect(receitaTrimestre?.escala).toBe('MIL')
  })

  it('lê o balanço (BPA), em que DT_INI_EXERC vem vazio e o início é a data de referência', () => {
    const { linhas, descartadas } = parsearCsvCvm(lerFixture('itr_2025_bpa_petr4.csv'))
    expect(descartadas).toEqual({})
    const estoques = linhas.find((l) => l.conta === '1.01.04')
    expect(estoques?.dtInicioExerc).toBe('2025-03-31')
    expect(estoques?.dtRefer).toBe('2025-03-31')
    expect(estoques?.valor).toBe(42779000)
  })

  it('lança erro quando faltam colunas obrigatórias', () => {
    expect(() => parsearCsvCvm('CD_CVM;DT_REFER\n009512;2025-03-31')).toThrow(/sem colunas/)
  })
})

describe('montarDemonstracoes com amostra real', () => {
  it('converte a escala MIL para reais: lucro da controladora do DFP 2025', () => {
    const { linhas } = parsearCsvCvm(lerFixture('dfp_2025_dre_petr4.csv'))
    const { registros } = montarDemonstracoes(linhas, 'DFP')
    const lucro = registros.find((r) => r.conta === '3.11.01')
    expect(lucro?.ticker).toBe('PETR4')
    expect(lucro?.valor).toBe(110129000 * 1000)
    expect(lucro?.dataDivulgacao).toBe('2026-03-31')
  })

  it('usa o acumulado de seis meses do ITR, sem somar trimestres', () => {
    const { linhas } = parsearCsvCvm(lerFixture('itr_2025_dre_petr4.csv'))
    const { registros } = montarDemonstracoes(linhas, 'ITR')
    const acumulado = registros.find(
      (r) =>
        r.conta === '3.11.01' && r.dtInicioExerc === '2025-01-01' && r.dtRefer === '2025-06-30',
    )
    expect(acumulado?.valor).toBe(61861000 * 1000)
    expect(acumulado?.dataDivulgacao).toBe('2025-08-14')
  })
})

describe('descartes por motivo', () => {
  const cabecalho =
    'CD_CVM;DT_REFER;VERSAO;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA'

  it('conta cada motivo e não interrompe a carga', () => {
    const texto = [
      cabecalho,
      '009512;2025-03-31;1;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.01;Receita;100',
      '009512;2025-03-31;1;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.02;Custo', // colunas incompletas
      '009512;31/03/2025;1;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.03;Data inválida;1', // data
      '009512;2025-03-31;0;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.04;Versão zero;1', // versão
    ].join('\n')
    const { linhas, descartadas } = parsearCsvCvm(texto)
    expect(linhas.length).toBe(1)
    expect(descartadas).toEqual({ COLUNAS_INCOMPLETAS: 1, CAMPO_INVALIDO: 2 })
  })

  it('descarta exercício anterior, companhia sem ticker e escala desconhecida', () => {
    const texto = [
      cabecalho,
      '009512;2025-03-31;1;MIL;PENÚLTIMO;2024-01-01;2024-03-31;3.01;Receita;90', // anterior
      '999999;2025-03-31;1;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.01;Receita;50', // sem ticker
      '009512;2025-03-31;1;XPTO;ÚLTIMO;2025-01-01;2025-03-31;3.01;Receita;70', // escala
    ].join('\n')
    const { linhas } = parsearCsvCvm(texto)
    const { registros, descartadas } = montarDemonstracoes(linhas, 'ITR')
    expect(registros).toEqual([])
    expect(descartadas).toEqual({
      EXERCICIO_ANTERIOR: 1,
      SEM_TICKER: 1,
      ESCALA_DESCONHECIDA: 1,
    })
  })

  it('valor vazio vira null, e não zero', () => {
    const texto = [
      cabecalho,
      '009512;2025-03-31;1;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.01;Receita;',
    ].join('\n')
    const { linhas } = parsearCsvCvm(texto)
    const { registros } = montarDemonstracoes(linhas, 'ITR')
    expect(registros[0].valor).toBeNull()
  })
})

describe('somenteUltimaVersao', () => {
  it('mantém a versão mais alta de cada informação (retificação)', () => {
    const cabecalho =
      'CD_CVM;DT_REFER;VERSAO;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA'
    const texto = [
      cabecalho,
      '009512;2025-03-31;1;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.11;Lucro;10',
      '009512;2025-03-31;2;MIL;ÚLTIMO;2025-01-01;2025-03-31;3.11;Lucro;12',
    ].join('\n')
    const { linhas } = parsearCsvCvm(texto)
    const unicas = somenteUltimaVersao(linhas)
    expect(unicas.length).toBe(1)
    expect(unicas[0].versao).toBe(2)
    expect(unicas[0].valor).toBe(12)
  })
})

describe('prazoDivulgacao (não look-ahead, P3)', () => {
  it('ITR: 45 dias após o fim do trimestre', () => {
    expect(prazoDivulgacao('ITR', '2025-03-31')).toBe('2025-05-15')
    expect(prazoDivulgacao('ITR', '2025-06-30')).toBe('2025-08-14')
  })

  it('DFP: 3 meses após o fim do exercício', () => {
    expect(prazoDivulgacao('DFP', '2025-12-31')).toBe('2026-03-31')
  })
})
