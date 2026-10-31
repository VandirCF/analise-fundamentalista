/**
 * Vínculo ticker → código da companhia na CVM, para os ativos do IBovespa.
 *
 * Gerado a partir do cadastro de valores mobiliários da CVM (FCA 2025, dados abertos), casando o
 * ticker (Codigo_Negociacao) com o CNPJ e depois com o Codigo_CVM do cadastro geral.
 * Gerado manualmente em 2026-10-30. O procedimento está em specs/04-fontes-de-dados.md.
 *
 * Tickers sem vínculo são listados em NAO_MAPEADOS_CVM. Não se inventa vínculo para eles (P2):
 * esses ativos ficam fora do histórico fundamentalista até o vínculo ser confirmado.
 */

/** Código CVM (seis dígitos, com zeros à esquerda) por ticker. */
export const MAPEAMENTO_CVM: Readonly<Record<string, string>> = {
  ABEV3: '023264',
  ASAI3: '025372',
  B3SA3: '021610',
  BBAS3: '001023',
  BBDC3: '000906',
  BBDC4: '000906',
  BBSE3: '023159',
  BRKM5: '004820',
  CMIG4: '002453',
  CPFE3: '018660',
  CSAN3: '019836',
  EMBJ3: '020087',
  ENGI11: '015253',
  EQTL3: '020010',
  FLRY3: '021881',
  GGBR4: '003980',
  HAPV3: '024392',
  ITSA4: '007617',
  ITUB4: '019348',
  JBSS3: '020575',
  LREN3: '008133',
  MGLU3: '022470',
  MOTV3: '018821',
  MRVE3: '020915',
  PETR3: '009512',
  PETR4: '009512',
  PRIO3: '022187',
  PSSA3: '016659',
  RADL3: '005258',
  RAIL3: '017450',
  RDOR3: '024821',
  RENT3: '019739',
  SANB11: '020532',
  SBSP3: '014443',
  SLCE3: '020745',
  SMTO3: '020516',
  SUZB3: '013986',
  TOTS3: '019992',
  UGPA3: '018465',
  VALE3: '004170',
  VBBR3: '024295',
  VIVT3: '017671',
  WEGE3: '005410',
}

/** Tickers do IBovespa sem código CVM encontrado no cadastro. */
export const NAO_MAPEADOS_CVM: readonly string[] = ['AXIA3', 'BPAC11', 'CMIN3', 'CPLE6', 'CRFB3', 'CSNA3', 'MBRF3']
