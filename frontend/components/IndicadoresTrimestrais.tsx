'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts'
import {
  INDICADORES_TRIMESTRAIS,
  type IndicadorTrimestral,
  type PontoSerie,
  type SeriesTrimestrais,
} from '@/types'
import { buscarIndicadoresTrimestrais } from '@/services/indicadoresTrimestraisService'
import { formatarData, formatarNumero, formatarPercentual } from '@/lib/formatters'
import { useTema } from './ProvedorTema'

/** Anos exibidos por padrão (intervalo de 10 anos, dentro do limite de 20 da API). */
const ANOS_PADRAO = 10

/** Definição de um indicador: rótulo por extenso, explicação e formato. */
interface DefinicaoIndicador {
  rotulo: string
  descricao: string
  /** Fração no backend (0,25) exibida como percentual (25%). Senão, múltiplo em vezes (2,1x). */
  percentual: boolean
}

const DEFINICOES: Record<IndicadorTrimestral, DefinicaoIndicador> = {
  ROE: {
    rotulo: 'ROE (Retorno sobre o Patrimônio)',
    descricao:
      'Lucro líquido dos últimos 12 meses dividido pelo patrimônio líquido da controladora.',
    percentual: true,
  },
  ROA: {
    rotulo: 'ROA (Retorno sobre os Ativos)',
    descricao: 'Lucro líquido dos últimos 12 meses dividido pelo total de ativos.',
    percentual: true,
  },
  MARGEM_EBIT: {
    rotulo: 'Margem EBIT (Lucro antes de juros e impostos sobre receita)',
    descricao: 'EBIT dos últimos 12 meses dividido pela receita dos mesmos 12 meses.',
    percentual: true,
  },
  MARGEM_LIQUIDA: {
    rotulo: 'Margem líquida',
    descricao: 'Lucro líquido dos últimos 12 meses dividido pela receita dos mesmos 12 meses.',
    percentual: true,
  },
  MARGEM_EBITDA: {
    rotulo: 'Margem EBITDA (Lucro antes de juros, impostos, depreciação e amortização)',
    descricao:
      'EBITDA (EBIT mais depreciação e amortização) dividido pela receita dos últimos 12 meses.',
    percentual: true,
  },
  DIVIDA_LIQ_PL: {
    rotulo: 'Dívida líquida / PL (Patrimônio Líquido)',
    descricao:
      'Empréstimos menos caixa e aplicações, dividido pelo patrimônio líquido. Menor é melhor. Negativo quando há mais caixa que dívida.',
    percentual: false,
  },
  DIVIDA_BRUTA_PL: {
    rotulo: 'Dívida bruta / PL (Patrimônio Líquido)',
    descricao: 'Empréstimos de curto e longo prazo, dividido pelo patrimônio líquido.',
    percentual: false,
  },
  LIQ_CORRENTE: {
    rotulo: 'Liquidez corrente',
    descricao:
      'Ativo circulante dividido pelo passivo circulante. Acima de 1 indica folga de curto prazo.',
    percentual: false,
  },
  LIQ_SECA: {
    rotulo: 'Liquidez seca',
    descricao: 'Ativo circulante menos estoques, dividido pelo passivo circulante.',
    percentual: false,
  },
  GIRO_ATIVO: {
    rotulo: 'Giro do ativo',
    descricao: 'Receita dos últimos 12 meses dividida pelo total de ativos.',
    percentual: false,
  },
}

/** Fim de cada trimestre: mês (0 a 11) e dia. */
const FIM_TRIMESTRE: readonly [number, number][] = [
  [2, 31],
  [5, 30],
  [8, 30],
  [11, 31],
]

/**
 * Tempo do gráfico para um ponto: fim do trimestre, em segundos UTC.
 * @param ponto Ponto da série (ano e trimestre).
 * @returns Instante do fim do trimestre.
 */
function tempoDoPonto(ponto: Pick<PontoSerie, 'ano' | 'trimestre'>): UTCTimestamp {
  const [mes, dia] = FIM_TRIMESTRE[ponto.trimestre - 1]
  return (Date.UTC(ponto.ano, mes, dia) / 1000) as UTCTimestamp
}

/**
 * Valor como texto em pt-BR, no formato do indicador.
 * @param valor Valor no formato do backend (fração ou múltiplo).
 * @param definicao Definição do indicador.
 * @returns Texto formatado.
 */
function formatarValor(valor: number, definicao: DefinicaoIndicador): string {
  return definicao.percentual ? formatarPercentual(valor * 100) : `${formatarNumero(valor)}x`
}

/**
 * Cores do gráfico por tema, para manter o contraste nos dois modos.
 * @param tema Tema atual.
 * @returns Cores de texto, grade e linha.
 */
function coresDoTema(tema: 'escuro' | 'claro'): { texto: string; grade: string; linha: string } {
  return tema === 'escuro'
    ? { texto: '#94a3b8', grade: '#1e293b', linha: '#34d399' }
    : { texto: '#475569', grade: '#e2e8f0', linha: '#059669' }
}

/**
 * Histórico trimestral de um indicador do ativo: gráfico de linha, seletor de indicador e tabela.
 * Trimestres sem valor não são desenhados nem ligados a zero. A data de divulgação aparece no tooltip.
 * @param props.ticker Ticker do ativo, ex.: "PETR4".
 * @returns Gráfico e tabela, ou estados de carregamento e erro.
 */
export default function IndicadoresTrimestrais({ ticker }: { ticker: string }) {
  const { tema } = useTema()
  const anoAtual = new Date().getFullYear()
  const [indicador, setIndicador] = useState<IndicadorTrimestral>('ROE')
  const [tooltip, setTooltip] = useState<{ texto: string; x: number; y: number } | null>(null)

  const { data, error, isLoading, mutate } = useSWR<SeriesTrimestrais>(
    ['indicadores-trimestrais', ticker, anoAtual],
    () => buscarIndicadoresTrimestrais(ticker, anoAtual - (ANOS_PADRAO - 1), anoAtual),
    { revalidateOnFocus: false },
  )

  const definicao = DEFINICOES[indicador]
  const pontos = useMemo<PontoSerie[]>(() => data?.[indicador] ?? [], [data, indicador])
  const comValor = useMemo(
    () => pontos.filter((p): p is PontoSerie & { valor: number } => p.valor !== null),
    [pontos],
  )

  const wrapperRef = useRef<HTMLDivElement>(null)
  const graficoRef = useRef<IChartApi | null>(null)
  const serieRef = useRef<ISeriesApi<'Line'> | null>(null)
  // O callback do tooltip é criado uma vez; estas refs leem sempre os valores atuais.
  const pontosRef = useRef<PontoSerie[]>(pontos)
  const definicaoRef = useRef<DefinicaoIndicador>(definicao)
  pontosRef.current = pontos
  definicaoRef.current = definicao

  // Cria o gráfico uma vez e o destrói ao sair.
  useEffect(() => {
    const container = wrapperRef.current
    if (!container) return
    const cores = coresDoTema(tema)
    const grafico = createChart(container, {
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: cores.texto,
      },
      grid: { vertLines: { color: cores.grade }, horzLines: { color: cores.grade } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { vertLine: { visible: true }, horzLine: { visible: false } },
    })
    const serie = grafico.addLineSeries({ color: cores.linha, lineWidth: 2 })
    graficoRef.current = grafico
    serieRef.current = serie

    grafico.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setTooltip(null)
        return
      }
      const instante = param.time as number
      const ponto = pontosRef.current.find((p) => tempoDoPonto(p) === instante)
      if (!ponto) {
        setTooltip(null)
        return
      }
      const quando = `${ponto.trimestre}º tri de ${ponto.ano}`
      const texto =
        ponto.valor === null
          ? `${quando}: sem valor · divulgado em ${formatarData(ponto.dataDivulgacao)}`
          : `${quando}: ${formatarValor(ponto.valor, definicaoRef.current)} · divulgado em ${formatarData(ponto.dataDivulgacao)}`
      setTooltip({ texto, x: param.point.x, y: param.point.y })
    })

    const redimensionar = (): void => grafico.applyOptions({ width: container.clientWidth })
    redimensionar()
    const observador = new ResizeObserver(redimensionar)
    observador.observe(container)

    return () => {
      observador.disconnect()
      grafico.remove()
      graficoRef.current = null
      serieRef.current = null
    }
    // Criação única: os dados e o tema são atualizados por efeitos próprios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualiza a série ao trocar de indicador ou chegar novo dado. Só desenha trimestres com valor.
  useEffect(() => {
    const serie = serieRef.current
    if (!serie) return
    const linhas: LineData<UTCTimestamp>[] = comValor.map((p) => ({
      time: tempoDoPonto(p),
      value: definicao.percentual ? p.valor * 100 : p.valor,
    }))
    serie.setData(linhas)
    graficoRef.current?.timeScale().fitContent()
  }, [comValor, definicao.percentual])

  // Cores do gráfico acompanham o tema.
  useEffect(() => {
    const cores = coresDoTema(tema)
    graficoRef.current?.applyOptions({
      layout: { textColor: cores.texto },
      grid: { vertLines: { color: cores.grade }, horzLines: { color: cores.grade } },
    })
    serieRef.current?.applyOptions({ color: cores.linha })
  }, [tema])

  if (isLoading) {
    return (
      <div
        className="h-[360px] animate-pulse rounded-lg border border-slate-800 bg-slate-800/40"
        aria-label="Carregando histórico trimestral"
      />
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-slate-800 p-6 text-center">
        <p className="text-slate-300">Não foi possível carregar o histórico trimestral agora.</p>
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

  const semValor = pontos.length - comValor.length

  return (
    <section aria-labelledby="historico-trimestral" className="space-y-4">
      <h3
        id="historico-trimestral"
        className="text-sm font-semibold uppercase tracking-wide text-slate-400"
      >
        Histórico trimestral
      </h3>

      <div role="group" aria-label="Indicador" className="flex flex-wrap gap-2">
        {INDICADORES_TRIMESTRAIS.map((nome) => (
          <button
            key={nome}
            type="button"
            aria-pressed={nome === indicador}
            onClick={() => setIndicador(nome)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              nome === indicador
                ? 'border-slate-500 text-slate-100'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {DEFINICOES[nome].rotulo.split(' (')[0]}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-400">{definicao.descricao}</p>

      <div className="relative">
        <div
          ref={wrapperRef}
          className="w-full"
          role="img"
          aria-label={`Gráfico de ${definicao.rotulo}`}
        />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
            style={{ left: Math.min(tooltip.x + 12, 240), top: 8 }}
          >
            {tooltip.texto}
          </div>
        )}
      </div>

      {comValor.length === 0 && (
        <p className="text-sm text-slate-400">Sem valores para este indicador no período.</p>
      )}
      {semValor > 0 && (
        <p className="text-xs text-slate-500">
          {semValor} trimestre{semValor > 1 ? 's' : ''} sem valor (exibido como &quot;—&quot; na
          tabela).
        </p>
      )}

      <details className="rounded-lg border border-slate-800 p-4">
        <summary className="cursor-pointer text-sm text-slate-300">Ver tabela</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">{definicao.rotulo}, por trimestre</caption>
            <thead className="text-xs text-slate-400">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Trimestre
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Valor
                </th>
                <th scope="col" className="py-2 font-medium">
                  Divulgado em
                </th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={`${p.ano}-${p.trimestre}`} className="border-t border-slate-800">
                  <td className="py-2 pr-4 text-slate-300">{`${p.trimestre}º tri de ${p.ano}`}</td>
                  <td className="py-2 pr-4 text-slate-100">
                    {p.valor === null ? '—' : formatarValor(p.valor, definicao)}
                  </td>
                  <td className="py-2 text-slate-400">{formatarData(p.dataDivulgacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
