# ADR-003 — Indicadores do ranking fixos e definidos a priori

**Status:** aceito. Conjunto confirmado na F8 (2026-10-30), sem alterações em relação à proposta.
**Data:** 2026-10-30

## Contexto

O notebook de referência escolhia os dois indicadores do ranking pela correlação com o lucro líquido, calculada sobre o período inteiro e sobre um único ativo. Essa escolha usa informação do futuro em relação às janelas de teste, o que infla os resultados (*data snooping*). Além disso, o ranking somava todos os indicadores com o mesmo sentido, premiando dívida alta.

## Decisão

1. O conjunto de indicadores do ranking é **fixo**: ROE, ROA, margem líquida, dívida líquida/PL (menor é melhor) e liquidez corrente.
2. O sentido de cada indicador é declarado na especificação e aplicado na normalização (`03-ranking-carteira.md`, seção 3).
3. Qualquer alteração do conjunto exige novo ADR, com justificativa escrita **antes** da alteração ser testada.

## Confirmação (F8)

O conjunto foi mantido: ROE, ROA, margem líquida, dívida líquida/PL (menor é melhor) e liquidez corrente. Motivos: são os mesmos indicadores que a F7 já calcula por trimestre; foram escolhidos antes de qualquer resultado; e cobrem rentabilidade, eficiência e risco de dívida. Nenhum experimento com outros indicadores substitui este ranking.

## Consequências

- Os resultados do backtest deixam de depender de escolhas feitas com dados do período testado.
- O conjunto pode não ser o ótimo, e isso é aceito: o objetivo é um método honesto, não um resultado maximizado.
- Qualquer experimento com outros indicadores deve ser feito como análise separada, sem substituir o ranking oficial.
