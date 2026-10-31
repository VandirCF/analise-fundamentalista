import { describe, expect, it } from 'vitest'
import { montarDemonstracoes, parsearCsvCvm } from '../lib/cvm'
import { MAPEAMENTO_CVM } from '../lib/cvmMapeamento'

const cabecalho =
  'CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA'

describe('uma demonstração por companhia, mesmo com mais de um ticker', () => {
  // PETR3 e PETR4 compartilham o código 009512 no mapeamento.
  it('não duplica a linha da companhia para cada ticker', () => {
    const texto = [
      cabecalho,
      '00.000.000/0001-91;2025-03-31;1;PETROBRAS;009512;DF;REAL;MIL;ÚLTIMO;2025-03-31;1;Ativo Total;100;S',
    ].join('\n')
    const { linhas } = parsearCsvCvm(texto)
    const { registros } = montarDemonstracoes(linhas, 'ITR')
    expect(registros.length).toBe(1)
    expect(['PETR3', 'PETR4']).toContain(registros[0].ticker)
    expect(registros[0].cdCvm).toBe('009512')
  })

  it('o mapeamento do projeto tem tickers da mesma companhia com o mesmo código', () => {
    expect(MAPEAMENTO_CVM.PETR3).toBe(MAPEAMENTO_CVM.PETR4)
    expect(MAPEAMENTO_CVM.BBDC3).toBe(MAPEAMENTO_CVM.BBDC4)
  })
})
