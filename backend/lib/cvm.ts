import { z } from 'zod'
import { MAPEAMENTO_CVM } from './cvmMapeamento'

/** Tipo de demonstração publicada pela CVM: anual (DFP) ou trimestral (ITR). */
export type TipoDemonstracao = 'DFP' | 'ITR'

/** Linha validada de um arquivo de demonstrações da CVM, ainda sem ticker. */
export interface LinhaCvm {
  cdCvm: string
  dtRefer: string
  dtInicioExerc: string
  dtFimExerc: string
  versao: number
  ordemExerc: string
  escala: string
  conta: string
  descricao: string
  /** Valor como publicado (na escala informada). Null quando não é numérico. */
  valor: number | null
}

/** Registro pronto para gravar em DemonstracaoContabil, com valor em reais. */
export interface DemonstracaoRegistro {
  ticker: string
  cdCvm: string
  tipo: TipoDemonstracao
  dtRefer: string
  dtInicioExerc: string
  versao: number
  conta: string
  descricao: string
  /** Valor em reais (escala MIL convertida), ou null. */
  valor: number | null
  /** Data a partir da qual a demonstração pode ser usada (prazo regulatório, P3). */
  dataDivulgacao: string
}

/** Resultado do parsing: linhas válidas e a contagem de descartadas por motivo. */
export interface ResultadoParsing {
  linhas: LinhaCvm[]
  descartadas: Record<string, number>
}

/** Colunas obrigatórias do CSV da CVM. */
const COLUNAS_OBRIGATORIAS = [
  'CD_CVM',
  'DT_REFER',
  'VERSAO',
  'ESCALA_MOEDA',
  'ORDEM_EXERC',
  'DT_INI_EXERC',
  'DT_FIM_EXERC',
  'CD_CONTA',
  'DS_CONTA',
  'VL_CONTA',
] as const

/** Fator de conversão para reais por escala. Outras escalas são descartadas, não assumidas (specs/04). */
const FATOR_ESCALA: Readonly<Record<string, number | undefined>> = { MIL: 1000, UNIDADE: 1 }

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Validação de cada linha do CSV com Zod (dados externos). Campos chegam como texto. */
const LinhaCsvSchema = z.object({
  CD_CVM: z.string().regex(/^\d{1,6}$/),
  DT_REFER: z.string().regex(DATA_ISO),
  DT_INI_EXERC: z.string().regex(DATA_ISO),
  DT_FIM_EXERC: z.string().regex(DATA_ISO),
  VERSAO: z
    .string()
    .regex(/^\d+$/)
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1)),
  ORDEM_EXERC: z.string(),
  ESCALA_MOEDA: z.string(),
  CD_CONTA: z.string().min(1),
  DS_CONTA: z.string(),
  VL_CONTA: z.string(),
})

/**
 * Converte um texto numérico da CVM (ex.: "123144000.0000000000") em número.
 * @param texto Valor como publicado.
 * @returns Número, ou null quando vazio ou não numérico.
 */
function numeroOuNulo(texto: string): number | null {
  if (texto.trim() === '') return null
  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : null
}

/**
 * Lê um arquivo CSV de demonstrações da CVM (texto já decodificado de latin1), separado por `;`.
 * Linhas com campos inválidos são descartadas e contadas por motivo; a carga não para.
 * @param texto Conteúdo do arquivo, já decodificado.
 * @returns Linhas válidas e a contagem de descartes por motivo.
 * @throws Error se o arquivo estiver vazio ou faltar alguma coluna obrigatória.
 */
export function parsearCsvCvm(texto: string): ResultadoParsing {
  const linhas = texto.split(/\r?\n/).filter((l) => l.length > 0)
  const [cabecalho, ...dados] = linhas
  if (cabecalho === undefined) throw new Error('Arquivo CVM vazio')

  const colunas = cabecalho.split(';')
  const faltando = COLUNAS_OBRIGATORIAS.filter((c) => !colunas.includes(c))
  if (faltando.length > 0) {
    throw new Error(`Cabeçalho CVM sem colunas: ${faltando.join(', ')}`)
  }

  const validas: LinhaCvm[] = []
  const descartadas: Record<string, number> = {}
  const descartar = (motivo: string): void => {
    descartadas[motivo] = (descartadas[motivo] ?? 0) + 1
  }

  for (const linha of dados) {
    const campos = linha.split(';')
    if (campos.length !== colunas.length) {
      descartar('COLUNAS_INCOMPLETAS')
      continue
    }
    const bruto = Object.fromEntries(
      COLUNAS_OBRIGATORIAS.map((coluna) => [coluna, campos[colunas.indexOf(coluna)]]),
    )
    const resultado = LinhaCsvSchema.safeParse(bruto)
    if (!resultado.success) {
      descartar('CAMPO_INVALIDO')
      continue
    }
    const d = resultado.data
    validas.push({
      cdCvm: d.CD_CVM.padStart(6, '0'),
      dtRefer: d.DT_REFER,
      dtInicioExerc: d.DT_INI_EXERC,
      dtFimExerc: d.DT_FIM_EXERC,
      versao: d.VERSAO,
      ordemExerc: d.ORDEM_EXERC,
      escala: d.ESCALA_MOEDA,
      conta: d.CD_CONTA,
      descricao: d.DS_CONTA,
      valor: numeroOuNulo(d.VL_CONTA),
    })
  }
  return { linhas: validas, descartadas }
}

/**
 * Prazo regulatório de divulgação, usado como data de não look-ahead (P3).
 * ITR: 45 dias após o fim do trimestre. DFP: 3 meses após o fim do exercício.
 * @param tipo DFP ou ITR.
 * @param dtRefer Data de referência do balanço (AAAA-MM-DD).
 * @returns Data a partir da qual a demonstração pode ser usada (AAAA-MM-DD).
 */
export function prazoDivulgacao(tipo: TipoDemonstracao, dtRefer: string): string {
  const data = new Date(`${dtRefer}T00:00:00Z`)
  if (tipo === 'ITR') {
    data.setUTCDate(data.getUTCDate() + 45)
  } else {
    data.setUTCMonth(data.getUTCMonth() + 3)
  }
  return data.toISOString().slice(0, 10)
}

/**
 * Mantém só a versão mais recente de cada informação (coluna VERSAO, para retificações).
 * @param linhas Linhas validadas.
 * @returns Uma linha por informação, na versão mais alta.
 */
export function somenteUltimaVersao(linhas: readonly LinhaCvm[]): LinhaCvm[] {
  const melhor = new Map<string, LinhaCvm>()
  for (const linha of linhas) {
    const chave = [linha.cdCvm, linha.dtRefer, linha.dtInicioExerc, linha.conta].join('|')
    const atual = melhor.get(chave)
    if (!atual || linha.versao > atual.versao) melhor.set(chave, linha)
  }
  return [...melhor.values()]
}

/**
 * Converte as linhas do exercício corrente em registros de DemonstracaoContabil.
 * Só entram companhias com ticker no mapeamento; a escala é convertida para reais.
 * @param linhas Linhas validadas do arquivo (podem conter o exercício anterior).
 * @param tipo DFP ou ITR, conforme o arquivo.
 * @returns Registros prontos para gravar e a contagem de descartes por motivo.
 */
export function montarDemonstracoes(
  linhas: readonly LinhaCvm[],
  tipo: TipoDemonstracao,
): { registros: DemonstracaoRegistro[]; descartadas: Record<string, number> } {
  const tickerPorCvm = new Map(Object.entries(MAPEAMENTO_CVM).map(([t, c]) => [c, t]))
  const descartadas: Record<string, number> = {}
  const descartar = (motivo: string): void => {
    descartadas[motivo] = (descartadas[motivo] ?? 0) + 1
  }

  const registros: DemonstracaoRegistro[] = []
  for (const linha of somenteUltimaVersao(linhas)) {
    if (linha.ordemExerc !== 'ÚLTIMO') {
      descartar('EXERCICIO_ANTERIOR')
      continue
    }
    const ticker = tickerPorCvm.get(linha.cdCvm)
    if (!ticker) {
      descartar('SEM_TICKER')
      continue
    }
    const fator = FATOR_ESCALA[linha.escala]
    if (fator === undefined) {
      descartar('ESCALA_DESCONHECIDA')
      continue
    }
    registros.push({
      ticker,
      cdCvm: linha.cdCvm,
      tipo,
      dtRefer: linha.dtRefer,
      dtInicioExerc: linha.dtInicioExerc,
      versao: linha.versao,
      conta: linha.conta,
      descricao: linha.descricao,
      valor: linha.valor === null ? null : linha.valor * fator,
      dataDivulgacao: prazoDivulgacao(tipo, linha.dtRefer),
    })
  }
  return { registros, descartadas }
}
