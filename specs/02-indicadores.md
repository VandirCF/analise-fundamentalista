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

Os dados de Lucro Líquido e Patrimônio vêm do Fundamentus (`fundamentusService`), e a cotação vem da cadeia de cotação já existente.

- **LPA (Lucro por Ação)** = LL_12m / Nº de ações
- **VPA (Valor Patrimonial por Ação)** = PL / Nº de ações
- **Graham VI (Valor Intrínseco)** = √(22,5 × LPA × VPA), **somente** quando LPA > 0 e VPA > 0. Caso contrário, `null`.
- **Upside (%)** = (Graham VI − Cotação) / Cotação × 100, com uma casa decimal. Positivo indica preço abaixo do valor intrínseco.

**Ressalvas exibidas na interface:**

- A constante 22,5 equivale a exigir P/L ≤ 15 e P/VP ≤ 1,5 simultaneamente. Por isso o Graham penaliza empresas de crescimento e de setores com margens altas.
- A fórmula não se aplica a empresas com prejuízo ou patrimônio negativo.
- O resultado é uma referência entre várias, não um critério de decisão.

**Correção em relação ao pipeline de referência:** o LPA de um dos repositórios foi corrigido para usar o lucro, e não a receita, e esta especificação já parte da versão correta.

## Médias móveis (F6)

- **MA20, MA50 e MA200** = média aritmética simples dos fechamentos dos últimos N pregões.
- Só exibir a média quando houver N pregões completos. O pipeline de referência usava `min_periods=1`, o que mostra uma MA200 parcial nos primeiros 199 pregões. Isso não é permitido.
- MA200 entra como nova série no gráfico, com o mesmo toggle das médias existentes (T-010).
