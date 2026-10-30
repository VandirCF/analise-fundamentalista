# 02 — Indicadores

Este documento define as fórmulas. Cada indicador tem teste unitário com valores calculados à mão (P4).

## Convenções

- **LL (Lucro Líquido)** é o lucro atribuível aos acionistas controladores.
- **PL (Patrimônio Líquido)** é o atribuível aos controladores.
- **Fluxo** (receita, EBIT, EBITDA, lucro): usa o acumulado dos **últimos 12 meses (TTM)**, que é a soma dos 4 últimos trimestres. O notebook de referência usava o valor trimestral isolado, o que distorce ROE e margens em trimestres sazonais. Esta especificação corrige isso.
- **Estoque** (ativo, passivo, PL, dívida, caixa): usa o saldo no **fim do trimestre**.
- Cada valor carrega a **data de divulgação** da demonstração que o originou (ver P3 e `03-ranking-carteira.md`).

## Indicadores trimestrais (F7)

| Indicador | Fórmula | Melhor quando | Regra de nulo |
|---|---|---|---|
| ROE (Retorno sobre o Patrimônio) | LL_TTM / PL_fim | Maior | Nulo se PL ≤ 0 |
| ROA (Retorno sobre os Ativos) | LL_TTM / AtivoTotal_fim | Maior | Nulo se AtivoTotal ≤ 0 |
| Margem EBIT | EBIT_TTM / Receita_TTM | Maior | Nulo se Receita ≤ 0 |
| Margem Líquida | LL_TTM / Receita_TTM | Maior | Nulo se Receita ≤ 0 |
| Margem EBITDA | EBITDA_TTM / Receita_TTM | Maior | Nulo se Receita ≤ 0 |
| Dívida Líquida / PL | DividaLiquida_fim / PL_fim | Menor | Nulo se PL ≤ 0 |
| Dívida Bruta / PL | DividaBruta_fim / PL_fim | Menor | Nulo se PL ≤ 0 |
| Liquidez Corrente | AtivoCirculante_fim / PassivoCirculante_fim | Maior | Nulo se PassivoCirculante ≤ 0 |
| Liquidez Seca | (AtivoCirculante_fim − Estoques_fim) / PassivoCirculante_fim | Maior | Nulo se Estoques ausente |
| Giro do Ativo | Receita_TTM / AtivoTotal_fim | Maior | Nulo se AtivoTotal ≤ 0 |

**Regras:**

- **PL negativo** torna ROE e dívida/PL sem sentido econômico. O valor é `null`, não um número com sinal trocado.
- **Liquidez seca sem estoques:** o notebook de referência caía silenciosamente na liquidez corrente. Não replicamos isso. Sem estoques, o valor é `null`.
- **Impostos efetivos** (`Impostos / LucroLiquido`) foram calculados no notebook, mas ficam fora do escopo, porque não têm regra clara para lucro negativo.

## Valuation (F6)

Os dados vêm do Fundamentus (`fundamentusService`): cotação de referência (fechamento do último pregão), P/L e P/VP, todos da mesma tabela e do mesmo fechamento. A cotação atual vem da cadeia de cotação já existente.

- **LPA (Lucro por Ação)** = Cotação de referência / P/L. Equivale a LL_12m / Nº de ações, porque P/L = Cotação / LPA. Usar P/L evita buscar lucro e número de ações em fontes separadas.
- **VPA (Valor Patrimonial por Ação)** = Cotação de referência / P/VP. Equivale a PL / Nº de ações, pelo mesmo motivo.
- **Graham VI (Valor Intrínseco)** = √(22,5 × LPA × VPA), **somente** quando LPA > 0 e VPA > 0. Caso contrário, `null`.
- **Upside (%)** = (Graham VI − Cotação atual) / Cotação atual × 100, com uma casa decimal. Positivo indica preço abaixo do valor intrínseco. O LPA e o VPA não dependem do preço do momento; só o upside depende.
- **Motivos de nulo** (campo `motivoNulo` da API): `SEM_DADO_FUNDAMENTALISTA` (P/L ou P/VP ausente), `LPA_NAO_POSITIVO` (P/L ≤ 0), `VPA_NAO_POSITIVO` (P/VP ≤ 0), `SEM_COTACAO` (sem preço atual; o Graham existe, mas o upside é `null`).

**Ressalvas exibidas na interface:**

- A constante 22,5 equivale a exigir P/L ≤ 15 e P/VP ≤ 1,5 simultaneamente. Por isso o Graham penaliza empresas de crescimento e de setores com margens altas.
- A fórmula não se aplica a empresas com prejuízo ou patrimônio negativo.
- O resultado é uma referência entre várias, não um critério de decisão.

**Correção em relação ao pipeline de referência:** o LPA de um dos repositórios foi corrigido para usar o lucro, e não a receita, e esta especificação já parte da versão correta.

## Médias móveis (F6)

- **MA20, MA50 e MA200** = média aritmética simples dos fechamentos dos últimos N pregões.
- Só exibir a média quando houver N pregões completos. O pipeline de referência usava `min_periods=1`, o que mostra uma MA200 parcial nos primeiros 199 pregões. Isso não é permitido.
- **MA200 é calculada no backend**, sobre a série diária completa, e não sobre os candles visíveis. Um período de 1 mês tem cerca de 21 candles, e a média de 200 pregões nunca apareceria no gráfico se fosse calculada só com eles.
- A série cobre o mesmo intervalo do gráfico, mas a média usa os pregões anteriores ao início do período (aquecimento). Cada ponto só existe quando há 200 pregões completos.
- A MA200 só existe para períodos diários (1M, 3M, 1A e 5A). Em 1D e 1S o botão fica desabilitado, porque esses períodos não têm pregões diários.
- MA20 e MA50 continuam como estão (calculadas no frontend sobre os candles visíveis). Unificar o cálculo fica como melhoria futura, fora da T-022.
