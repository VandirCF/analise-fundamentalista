# 05 — Modelo de dados e cache

Os modelos abaixo são propostos. As migrations são criadas na F7, com `npm run db:migrate` (CLAUDE.md).

## Tabelas novas (F7)

### `DemonstracaoContabil`

Linha bruta da CVM, depois da validação.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | Int, PK | |
| `ticker` | String | Ticker resolvido a partir do código CVM |
| `cdCvm` | Int | Código da companhia na CVM |
| `tipo` | String | `DFP` ou `ITR` |
| `dtRefer` | DateTime | Data de referência do balanço (fim do período) |
| `versao` | Int | Versão da demonstração (retificações) |
| `conta` | String | Código da conta (ex.: `3.11`) |
| `descricao` | String | Nome da conta, como publicado |
| `valor` | Float? | `null` quando o valor não é numérico |
| `dataDivulgacao` | DateTime | Base da regra de não look-ahead (P3) |

Índice único: `(cdCvm, dtRefer, conta, versao)`.

### `IndicadorTrimestral`

Resultado calculado a partir de `DemonstracaoContabil`, conforme `02-indicadores.md`.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | Int, PK | |
| `ticker` | String | |
| `ano` | Int | |
| `trimestre` | Int | 1 a 4 |
| `indicador` | String | Ex.: `ROE`, `ROA`, `MARGEM_LIQUIDA`, `DIVIDA_LIQ_PL`, `LIQ_CORRENTE` |
| `valor` | Float? | `null` pelas regras de nulo |
| `dataDivulgacao` | DateTime | Divulgação da demonstração de origem |
| `calculadoEm` | DateTime | Data do cálculo, para auditoria |

Índice único: `(ticker, ano, trimestre, indicador)`.

**Sem TimescaleDB:** o volume é de 50 ativos × 12 anos × 4 trimestres × ~10 indicadores, algo em torno de 24 mil linhas. Uma tabela comum com índice basta.

## Cache (proposta de TTLs)

Quando estas chaves forem implementadas, a tabela de TTLs do `CLAUDE.md` deve ser atualizada na mesma mudança (regra do próprio arquivo).

| Dado | Chave Redis | TTL proposto | Motivo |
|---|---|---|---|
| Valuation (Graham e upside) | `valuation:{ticker}` | 3600 s | Depende da cotação, que muda durante o dia |
| Indicadores trimestrais | `indtri:{ticker}` | 86400 s | Muda só com nova demonstração |
| Ranking por janela | `ranking:{anoFim}` | 86400 s | Calculado sobre dados trimestrais estáveis |
| Simulação | `simulacao:{hash-dos-parametros}` | 86400 s | Histórico fechado; o hash inclui capital, período e custo |

Os TTLs são propostas. Qualquer ajuste é feito aqui e no `CLAUDE.md` ao mesmo tempo.
