import { prisma } from '../lib/db'
import { logger } from '../lib/logger'
import { montarDemonstracoes, parsearCsvCvm, type TipoDemonstracao } from '../lib/cvm'

/** Tamanho dos lotes de gravação no PostgreSQL. */
const LOTE = 1000

/** Resumo de uma importação de arquivo da CVM. */
export interface ResumoImportacao {
  lidas: number
  gravadas: number
  descartadas: Record<string, number>
}

/**
 * Importa um arquivo de demonstrações da CVM (DFP ou ITR) para DemonstracaoContabil.
 * Só o exercício corrente e a versão mais recente entram. Reexecutar a carga não duplica linhas,
 * porque a chave única impede a repetição (`skipDuplicates`). Descartes são registrados no log.
 * @param texto Conteúdo do CSV, já decodificado de latin1.
 * @param tipo DFP ou ITR, conforme o arquivo.
 * @returns Quantidades lidas, gravadas e descartadas por motivo.
 * @throws Error se o cabeçalho do arquivo não tiver as colunas obrigatórias.
 */
export async function importarArquivoCvm(
  texto: string,
  tipo: TipoDemonstracao,
): Promise<ResumoImportacao> {
  const { linhas, descartadas: descartadasLeitura } = parsearCsvCvm(texto)
  const { registros, descartadas: descartadasMontagem } = montarDemonstracoes(linhas, tipo)

  const descartadas = { ...descartadasLeitura }
  for (const [motivo, quantidade] of Object.entries(descartadasMontagem)) {
    descartadas[motivo] = (descartadas[motivo] ?? 0) + quantidade
  }
  if (Object.keys(descartadas).length > 0) {
    logger.warn({ tipo, descartadas }, 'Linhas da CVM descartadas na importação')
  }

  let gravadas = 0
  for (let inicio = 0; inicio < registros.length; inicio += LOTE) {
    const lote = registros.slice(inicio, inicio + LOTE)
    const resultado = await prisma.demonstracaoContabil.createMany({
      data: lote.map((r) => ({
        ticker: r.ticker,
        cdCvm: r.cdCvm,
        tipo: r.tipo,
        dtRefer: new Date(`${r.dtRefer}T00:00:00Z`),
        dtInicioExerc: new Date(`${r.dtInicioExerc}T00:00:00Z`),
        versao: r.versao,
        conta: r.conta,
        descricao: r.descricao,
        valor: r.valor,
        dataDivulgacao: new Date(`${r.dataDivulgacao}T00:00:00Z`),
      })),
      skipDuplicates: true,
    })
    gravadas += resultado.count
  }

  logger.info({ tipo, lidas: linhas.length, gravadas }, 'Importação da CVM concluída')
  return { lidas: linhas.length, gravadas, descartadas }
}
