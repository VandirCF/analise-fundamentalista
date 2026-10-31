import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { prisma } from '../lib/db'
import { logger } from '../lib/logger'
import type { TipoDemonstracao } from '../lib/cvm'
import { importarArquivoCvm } from '../services/cvmService'

/**
 * Lê os argumentos: o tipo (DFP ou ITR) e um ou mais caminhos de CSV da CVM.
 * Exemplo: `npm run cvm:importar -- ITR caminho/itr_cia_aberta_DRE_con_2025.csv`.
 * @param argumentos Argumentos após o nome do script.
 * @returns Tipo e lista de arquivos.
 * @throws Error se o tipo for inválido ou não houver arquivos.
 */
function lerArgumentos(argumentos: readonly string[]): {
  tipo: TipoDemonstracao
  arquivos: string[]
} {
  const [tipo, ...arquivos] = argumentos
  if (tipo !== 'DFP' && tipo !== 'ITR') throw new Error('Informe o tipo: DFP ou ITR')
  if (arquivos.length === 0) throw new Error('Informe ao menos um arquivo CSV')
  return { tipo, arquivos }
}

/**
 * Importa cada arquivo informado e mostra o resumo. Um arquivo com erro não interrompe os demais.
 * @returns Código de saída: 0 se todos foram importados, 1 se algum falhou.
 */
async function main(): Promise<number> {
  const { tipo, arquivos } = lerArgumentos(process.argv.slice(2))
  let falhas = 0
  for (const caminho of arquivos) {
    try {
      // Os arquivos da CVM são latin1 (Windows-1252).
      const texto = new TextDecoder('latin1').decode(readFileSync(caminho))
      const resumo = await importarArquivoCvm(texto, tipo)
      logger.info({ arquivo: basename(caminho), ...resumo }, 'Arquivo importado')
    } catch (erro: unknown) {
      falhas += 1
      logger.error({ err: erro, arquivo: basename(caminho) }, 'Falha ao importar arquivo da CVM')
    }
  }
  return falhas === 0 ? 0 : 1
}

/**
 * Executa a importação e fecha a conexão com o banco antes de encerrar.
 * @returns Código de saída do processo.
 */
async function executar(): Promise<number> {
  try {
    return await main()
  } catch (erro: unknown) {
    logger.error({ err: erro }, 'Erro na importação da CVM')
    return 1
  } finally {
    await prisma.$disconnect()
  }
}

executar().then((codigo) => process.exit(codigo))
