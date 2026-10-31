import { prisma } from '../lib/db'
import { logger } from '../lib/logger'
import { MAPEAMENTO_CVM } from '../lib/cvmMapeamento'
import { recalcularIndicadoresTicker } from '../services/indicadoresTrimestraisService'

/**
 * Lê os anos da linha de comando, ex.: `npm run indicadores:calcular -- 2024 2025`.
 * @param argumentos Argumentos após o nome do script.
 * @returns Anos válidos, sem repetição e em ordem crescente.
 * @throws Error se algum argumento não for um ano entre 2010 e 2100.
 */
function lerAnos(argumentos: readonly string[]): number[] {
  const anos = argumentos.map((a) => Number(a))
  if (anos.length === 0) throw new Error('Informe ao menos um ano. Exemplo: 2024 2025')
  for (const ano of anos) {
    if (!Number.isInteger(ano) || ano < 2010 || ano > 2100) {
      throw new Error(`Ano inválido: ${ano}`)
    }
  }
  return [...new Set(anos)].sort((a, b) => a - b)
}

/**
 * Recalcula os indicadores trimestrais de todos os ativos mapeados para a CVM.
 * Um ativo com erro não interrompe os demais: o erro é registrado e o script segue.
 * @returns Código de saída: 0 se todos os ativos foram processados, 1 se algum falhou.
 */
async function main(): Promise<number> {
  const anos = lerAnos(process.argv.slice(2))
  const tickers = Object.keys(MAPEAMENTO_CVM)
  let falhas = 0
  for (const ticker of tickers) {
    try {
      await recalcularIndicadoresTicker(ticker, anos)
    } catch (erro: unknown) {
      falhas += 1
      logger.error({ err: erro, ticker }, 'Falha ao recalcular indicadores trimestrais')
    }
  }
  logger.info({ anos, total: tickers.length, falhas }, 'Recálculo de indicadores concluído')
  return falhas === 0 ? 0 : 1
}

/**
 * Executa o recálculo e fecha a conexão com o banco antes de encerrar o processo.
 * @returns Código de saída do processo.
 */
async function executar(): Promise<number> {
  try {
    return await main()
  } catch (erro: unknown) {
    logger.error({ err: erro }, 'Erro fatal no recálculo de indicadores')
    return 1
  } finally {
    await prisma.$disconnect()
  }
}

executar().then((codigo) => process.exit(codigo))
