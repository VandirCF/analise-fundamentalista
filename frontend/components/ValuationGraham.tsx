'use client'

import useSWR from 'swr'
import type { MotivoNulo, Valuation } from '@/types'
import { buscarValuation } from '@/services/valuationService'
import { formatarDataHoraCurta, formatarMoeda, formatarVariacao } from '@/lib/formatters'

/** Texto explicando por que o valuation não se aplica, por motivo. */
const MOTIVOS: Record<MotivoNulo, string> = {
  SEM_DADO_FUNDAMENTALISTA:
    'Sem P/L (Preço/Lucro) ou P/VP (Preço/Valor Patrimonial) no Fundamentus para calcular o valuation.',
  LPA_NAO_POSITIVO: 'Lucro por ação não positivo: a fórmula de Graham não se aplica.',
  VPA_NAO_POSITIVO: 'Patrimônio por ação não positivo: a fórmula de Graham não se aplica.',
  SEM_COTACAO: 'Cotação atual indisponível: o upside não pode ser calculado.',
}

/** Definição de um card: rótulo com a abreviatura por extenso e explicação (tooltip). */
interface Cartao {
  rotulo: string
  descricao: string
  valor: string | null
}

/**
 * Monta os cards do valuation a partir dos dados da API. Valores ausentes viram null (exibidos como "—").
 * @param dados Valuation do ativo.
 * @returns Cartões na ordem de exibição.
 */
function montarCartoes(dados: Valuation): Cartao[] {
  return [
    {
      rotulo: 'Valor intrínseco (Graham)',
      descricao:
        'Estimativa de valor por ação pela fórmula de Benjamin Graham: √(22,5 × LPA × VPA). A constante 22,5 equivale a exigir P/L ≤ 15 e P/VP ≤ 1,5 ao mesmo tempo. Não vale para empresas com prejuízo ou patrimônio negativo. É uma referência entre várias, não um critério de decisão.',
      valor: dados.grahamVI === null ? null : formatarMoeda(dados.grahamVI),
    },
    {
      rotulo: 'Upside',
      descricao:
        'Quanto o valor intrínseco está acima (positivo) ou abaixo (negativo) da cotação atual, em percentual.',
      valor: dados.upsidePct === null ? null : formatarVariacao(dados.upsidePct),
    },
    {
      rotulo: 'LPA (Lucro por Ação)',
      descricao:
        'Lucro por ação, obtido pela cotação de referência do Fundamentus dividida pelo P/L (Preço/Lucro). Usa o fechamento do último pregão, não o preço atual.',
      valor: dados.lpa === null ? null : formatarMoeda(dados.lpa),
    },
    {
      rotulo: 'VPA (Valor Patrimonial por Ação)',
      descricao:
        'Patrimônio contábil por ação, obtido pela cotação de referência do Fundamentus dividida pelo P/VP (Preço/Valor Patrimonial). Usa o fechamento do último pregão.',
      valor: dados.vpa === null ? null : formatarMoeda(dados.vpa),
    },
  ]
}

/**
 * Painel de valuation pela Fórmula de Graham: valor intrínseco, upside, LPA e VPA.
 * Mostra o motivo quando o cálculo não se aplica e as ressalvas do método.
 * @param props.ticker Ticker do ativo, ex.: "PETR4".
 * @returns Cartões do valuation, ou estado de carregamento e erro.
 */
export default function ValuationGraham({ ticker }: { ticker: string }) {
  const { data, error, isLoading, mutate } = useSWR<Valuation>(
    ['valuation', ticker],
    () => buscarValuation(ticker),
    { revalidateOnFocus: false },
  )

  if (isLoading) {
    return (
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Carregando valuation">
        {Array.from({ length: 4 }, (_, indice) => (
          <li
            key={indice}
            className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-800/40"
          />
        ))}
      </ul>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-slate-800 p-6 text-center">
        <p className="text-slate-300">Não foi possível calcular o valuation agora.</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="mt-4 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <section aria-labelledby="valuation-graham" className="space-y-3">
      <h3
        id="valuation-graham"
        className="text-sm font-semibold uppercase tracking-wide text-slate-400"
      >
        Valuation (Graham)
      </h3>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {montarCartoes(data).map((cartao) => (
          <li
            key={cartao.rotulo}
            title={cartao.descricao}
            className="cursor-help rounded-lg border border-slate-800 p-4"
          >
            <p className="text-xs text-slate-400">{cartao.rotulo}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-100">
              {cartao.valor ?? '—'}
            </p>
            <p className="sr-only">{cartao.descricao}</p>
          </li>
        ))}
      </ul>

      {data.motivoNulo !== null && (
        <p className="text-sm text-slate-400">{MOTIVOS[data.motivoNulo]}</p>
      )}

      <p className="text-xs text-slate-500">
        LPA e VPA usam a cotação de referência do Fundamentus (último fechamento). O upside usa a
        cotação atual
        {data.atualizadoEm
          ? ` (lida em ${formatarDataHoraCurta(new Date(data.atualizadoEm))})`
          : ''}
        . Resultado de referência, não recomendação de investimento.
      </p>
    </section>
  )
}
