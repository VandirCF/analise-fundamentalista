import { describe, expect, it } from 'vitest'
import { montarDemonstracoes, parsearCsvCvm } from '../lib/cvm'

// Regressão: em todos os arquivos da CVM, DT_REFER é a data do documento. Nas linhas PENÚLTIMO ela é
// igual à das linhas ÚLTIMO; o período está em DT_FIM_EXERC. Antes da correção, o balanço do exercício
// corrente colidia com o do anterior e era perdido. O PENÚLTIMO vem primeiro, como no arquivo real.
const cabecalhoBalanco =
  'CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA'

describe('período das demonstrações (DT_FIM_EXERC)', () => {
  it('mantém o balanço do exercício corrente mesmo com o anterior na mesma DT_REFER', () => {
    const texto = [
      cabecalhoBalanco,
      '00.000.000/0001-91;2025-03-31;1;X;009512;DF;REAL;MIL;PENÚLTIMO;2024-12-31;1;Ativo Total;100;S',
      '00.000.000/0001-91;2025-03-31;1;X;009512;DF;REAL;MIL;ÚLTIMO;2025-03-31;1;Ativo Total;200;S',
    ].join('\n')
    const { linhas } = parsearCsvCvm(texto)
    const { registros, descartadas } = montarDemonstracoes(linhas, 'ITR')
    expect(registros.length).toBe(1)
    expect(registros[0].dtRefer).toBe('2025-03-31')
    expect(registros[0].dtInicioExerc).toBe('2025-03-31')
    expect(registros[0].valor).toBe(200 * 1000)
    expect(descartadas).toEqual({ EXERCICIO_ANTERIOR: 1 })
  })

  it('o balanço do exercício anterior, quando lido, fica na sua própria data', () => {
    const texto = [
      cabecalhoBalanco,
      '00.000.000/0001-91;2025-03-31;1;X;009512;DF;REAL;MIL;PENÚLTIMO;2024-12-31;1;Ativo Total;100;S',
    ].join('\n')
    const { linhas } = parsearCsvCvm(texto)
    expect(linhas[0].dtRefer).toBe('2024-12-31')
  })
})
