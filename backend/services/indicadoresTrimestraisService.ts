import { prisma } from '../lib/db'
import { MAPEAMENTO_CVM } from '../lib/cvmMapeamento'
import { logger } from '../lib/logger'
import {
  calcularIndicadoresTrimestrais,
  calcularTtm,
  INDICADORES_TRIMESTRAIS,
  type ValoresTrimestre,
} from '../lib/indicadoresTrimestrais'

/** Fim de cada trimestre (MM-DD). */
const FIM_TRIMESTRE = ['03-31', '06-30', '09-30', '12-31'] as const

/** Contas do plano de contas da CVM usadas nos indicadores (specs/02-indicadores.md). */
const CONTAS = {
  receita: '3.01',
  ebit: '3.05',
  da: '6.01.01.04',
  lucroControladora: '3.11.01',
  patrimonioTotal: '2.03',
  naoControladores: '2.03.09',
  ativoTotal: '1',
  ativoCirculante: '1.01',
  caixa: '1.01.01',
  aplicacoes: '1.01.02',
  estoques: '1.01.04',
  passivoCirculante: '2.01',
  dividaCirculante: '2.01.04',
  dividaNaoCirculante: '2.02.01',
} as const

const TODAS_CONTAS: readonly string[] = Object.values(CONTAS)

/** Valor de uma conta, com a data de divulgação da linha de origem. */
interface Lancamento {
  valor: number | null
  dataDivulgacao: Date
}

/** Linha de indicador pronta para gravar. */
export interface IndicadorParaGravar {
  ticker: string
  ano: number
  trimestre: number
  indicador: string
  valor: number | null
  dataDivulgacao: Date
}

/**
 * Chave de busca de uma conta: conta + data de referência + início do período.
 * @param conta Código da conta.
 * @param dtRefer Data de referência (AAAA-MM-DD).
 * @param dtInicio Início do período (AAAA-MM-DD). Para balanço, igual à data de referência.
 * @returns Chave textual.
 */
function chave(conta: string, dtRefer: string, dtInicio: string): string {
  return `${conta}|${dtRefer}|${dtInicio}`
}

/**
 * Soma duas datas de divulgação e fica com a mais recente: o indicador só vale depois de todas as fontes.
 * @param atual Data já acumulada, ou null.
 * @param nova Data nova.
 * @returns A data mais recente.
 */
function maisRecente(atual: Date | null, nova: Date): Date {
  return atual === null || nova > atual ? nova : atual
}

/**
 * Recalcula e grava os indicadores trimestrais de um ativo para os anos informados.
 * Lê as linhas de DemonstracaoContabil de `ano − 1` até `ano` (o TTM precisa do ano anterior), usa a
 * versão mais recente de cada linha e substitui os indicadores desses anos em uma transação.
 * Trimestres sem nenhuma conta de origem não geram linha (P2).
 * @param ticker Ticker do ativo, ex.: PETR4.
 * @param anos Anos a recalcular.
 * @returns Número de indicadores gravados.
 */
export async function recalcularIndicadoresTicker(
  ticker: string,
  anos: readonly number[],
): Promise<number> {
  if (anos.length === 0) return 0
  const anoMin = Math.min(...anos) - 1
  const anoMax = Math.max(...anos)

  // Demonstrações são da companhia (código CVM), que pode ter mais de um ticker.
  const cdCvm = MAPEAMENTO_CVM[ticker]
  if (cdCvm === undefined) throw new Error(`Ticker sem código CVM: ${ticker}`)

  const linhas = await prisma.demonstracaoContabil.findMany({
    where: {
      cdCvm,
      conta: { in: [...TODAS_CONTAS] },
      dtRefer: {
        gte: new Date(`${anoMin}-01-01T00:00:00Z`),
        lte: new Date(`${anoMax}-12-31T00:00:00Z`),
      },
    },
    select: {
      conta: true,
      dtRefer: true,
      dtInicioExerc: true,
      versao: true,
      valor: true,
      dataDivulgacao: true,
    },
  })

  // Uma entrada por conta/período: a versão mais alta prevalece.
  const porChave = new Map<string, { versao: number; lancamento: Lancamento }>()
  for (const l of linhas) {
    const k = chave(
      l.conta,
      l.dtRefer.toISOString().slice(0, 10),
      l.dtInicioExerc.toISOString().slice(0, 10),
    )
    const atual = porChave.get(k)
    if (atual && atual.versao >= l.versao) continue
    porChave.set(k, {
      versao: l.versao,
      lancamento: { valor: l.valor, dataDivulgacao: l.dataDivulgacao },
    })
  }

  const buscar = (conta: string, dtRefer: string, dtInicio: string): Lancamento | undefined =>
    porChave.get(chave(conta, dtRefer, dtInicio))?.lancamento

  const gravar: IndicadorParaGravar[] = []
  for (const ano of anos) {
    const inicioAno = `${ano}-01-01`
    FIM_TRIMESTRE.forEach((fim, indice) => {
      const trimestre = indice + 1
      const dtRefer = `${ano}-${fim}`
      const usados: Lancamento[] = []
      const ler = (conta: string, refer: string, inicio: string): number | null => {
        const l = buscar(conta, refer, inicio)
        if (l) usados.push(l)
        return l?.valor ?? null
      }

      // Fluxos em TTM: no 4º trimestre é o exercício; nos demais, YTD(Y,q) + Anual(Y−1) − YTD(Y−1,q).
      const fluxo = (conta: string): number | null => {
        if (trimestre === 4) return ler(conta, dtRefer, inicioAno)
        return calcularTtm(
          ler(conta, dtRefer, inicioAno),
          ler(conta, `${ano - 1}-12-31`, `${ano - 1}-01-01`),
          ler(conta, `${ano - 1}-${fim}`, `${ano - 1}-01-01`),
        )
      }
      // Saldos: no fim do trimestre (balanço, sem início de período).
      const saldo = (conta: string): number | null => ler(conta, dtRefer, dtRefer)

      const patrimonio = saldo(CONTAS.patrimonioTotal)
      const naoControladores = saldo(CONTAS.naoControladores)
      const plControladora =
        patrimonio === null || naoControladores === null ? null : patrimonio - naoControladores

      const dividaCirc = saldo(CONTAS.dividaCirculante)
      const dividaNaoCirc = saldo(CONTAS.dividaNaoCirculante)
      const dividaBruta =
        dividaCirc === null || dividaNaoCirc === null ? null : dividaCirc + dividaNaoCirc

      const valores: ValoresTrimestre = {
        receitaTtm: fluxo(CONTAS.receita),
        ebitTtm: fluxo(CONTAS.ebit),
        daTtm: fluxo(CONTAS.da),
        llTtm: fluxo(CONTAS.lucroControladora),
        plControladora,
        ativoTotal: saldo(CONTAS.ativoTotal),
        ativoCirculante: saldo(CONTAS.ativoCirculante),
        passivoCirculante: saldo(CONTAS.passivoCirculante),
        estoques: saldo(CONTAS.estoques),
        caixa: saldo(CONTAS.caixa),
        aplicacoes: saldo(CONTAS.aplicacoes),
        dividaBruta,
      }

      if (usados.length === 0) return
      const dataDivulgacao = usados.reduce<Date | null>(
        (data, l) => maisRecente(data, l.dataDivulgacao),
        null,
      )
      if (dataDivulgacao === null) return

      const resultado = calcularIndicadoresTrimestrais(valores)
      for (const indicador of INDICADORES_TRIMESTRAIS) {
        gravar.push({
          ticker,
          ano,
          trimestre,
          indicador,
          valor: resultado[indicador],
          dataDivulgacao,
        })
      }
    })
  }

  await prisma.$transaction([
    prisma.indicadorTrimestral.deleteMany({ where: { ticker, ano: { in: [...anos] } } }),
    prisma.indicadorTrimestral.createMany({ data: gravar }),
  ])
  logger.info({ ticker, anos, gravados: gravar.length }, 'Indicadores trimestrais recalculados')
  return gravar.length
}
