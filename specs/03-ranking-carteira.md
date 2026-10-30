# 03 — Ranking por fatores e simulação de carteira

Este documento descreve o método de ranking (F8) e a simulação (F9). Os valores padrão são propostas a validar na implementação, exceto onde a regra é um princípio da constituição.

## 1. Regra de tempo (P3)

Uma decisão tomada no **primeiro pregão do ano t** só pode usar demonstrações cuja **data de divulgação** seja anterior ou igual a essa data.

Consequência: na janela `t−3 … t−1`, as demonstrações anuais (DFP) do exercício `t−1` ainda não estão disponíveis em 1º de janeiro de `t`. Elas entram somente depois da divulgação, em geral em março. O ranking usa apenas o que estava publicado naquela data.

O notebook de referência não aplicava essa regra.

## 2. Indicadores do ranking (ADR-003)

Os indicadores são fixos e definidos antes de qualquer teste.

| Indicador | Sentido | Justificativa |
|---|---|---|
| ROE | Maior é melhor | Rentabilidade sobre o capital próprio |
| ROA | Maior é melhor | Rentabilidade independente da estrutura de capital |
| Margem Líquida | Maior é melhor | Eficiência operacional |
| Dívida Líquida / PL | Menor é melhor | Risco de endividamento |
| Liquidez Corrente | Maior é melhor | Capacidade de pagar obrigações de curto prazo |

**Proibido:** escolher indicadores por correlação com o lucro, ou por qualquer outro critério calculado sobre o período de avaliação ou de teste. O notebook de referência fazia isso, e isso introduz viés.

O conjunto acima é uma proposta. Qualquer alteração exige novo ADR.

## 3. Cálculo da nota

1. **Valor do indicador no ativo `i` na janela `J`:** média dos valores trimestrais válidos de `i` dentro de `J`, usando apenas trimestres com divulgação disponível pela regra da seção 1.
2. **Elegibilidade:** um ativo entra na janela somente se tiver pelo menos **4 trimestres válidos** para **cada** indicador. Ativo inelegível fica fora do ranking daquela janela, sem preenchimento com zero (P2).
3. **Normalização min-max** entre os ativos elegíveis, para cada indicador:
   - Indicador "maior é melhor": `x' = (x − mín) / (máx − mín)`
   - Indicador "menor é melhor": `x' = 1 − (x − mín) / (máx − mín)`
   - Se `máx = mín`, todos recebem `x' = 0,5` (neutro).
4. **Nota composta:** soma simples dos `x'` com pesos iguais. Pesos alternativos são parâmetro, com padrão igual.
5. **Ranking:** ordem decrescente da nota. Empates recebem a mesma posição (método `min`).
6. **Alocação:** `nota_i / Σ notas`, somando 100%. Se a soma das notas for zero, a alocação é igualitária entre os elegíveis.

O notebook de referência usava o mesmo esquema de normalização e soma, mas sem a inversão de sentido para dívida, o que fazia o ranking premiar endividamento.

## 4. Simulação

**Parâmetros padrão:** capital inicial R$ 100.000, período de simulação de 2018 a 2025, custo fixo por operação zero.

**Para cada ano `t` da simulação:**

1. A alocação é a do ranking da janela `t−3 … t−1`, calculada conforme as seções 1 a 3.
2. A compra ocorre no **fechamento do primeiro pregão de `t`**, com o capital total do início do ano dividido pela alocação.
3. A venda ocorre no **fechamento do último pregão de `t`**, e o capital final vira o capital inicial de `t+1` (reinvestimento integral).
4. Os preços usados são **ajustados por dividendos e desdobramentos** (retorno total). O notebook de referência usava o fechamento sem ajuste, o que subestima o retorno das ações pagadoras de dividendos.

**Carteira igualitária (benchmark):**

- Pesos iguais entre os **mesmos ativos elegíveis** da carteira quantitativa naquele ano. Usar o universo inteiro favoreceria a estratégia por comparar carteiras diferentes.
- Quando a carteira quantitativa não tem elegíveis suficientes para uma janela, o ano é marcado como "sem dados" e não entra nas métricas comparativas.

**Ativos sem preço no ano:** ficam fora da carteira daquele ano, e a alocação é renormalizada entre os ativos com preço.

## 5. Métricas exibidas

| Métrica | Definição |
|---|---|
| Retorno total acumulado | Capital final / capital inicial − 1 |
| Retorno anualizado (CAGR) | (Capital final / capital inicial)^(1/anos) − 1 |
| Volatilidade anualizada | Desvio-padrão dos retornos diários × √252 |
| Máximo drawdown | Maior queda percentual do pico ao vale do capital diário |

Sharpe fica fora desta versão (ver `01-escopo.md`).

## 6. Limitações que a interface precisa exibir

- **Viés de sobrevivência:** o universo é a composição atual do IBovespa. Empresas que saíram do índice ou deixaram de existir não aparecem.
- **Sem custos, impostos ou aluguel de ações**, exceto o custo fixo parametrizável.
- **Rebalanceamento anual** e execução idealizada ao fechamento, sem considerar liquidez intradiária.
- **Período curto:** oito anos de simulação não bastam para concluir que uma estratégia funciona.
- **Aviso de não recomendação** (P6).
