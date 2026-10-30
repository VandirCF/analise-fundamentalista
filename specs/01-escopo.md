# 01 — Escopo

## Dentro do escopo (F6 a F9)

- **Valuation básico:** Fórmula de Graham, upside em relação à cotação atual e MA200.
- **Histórico fundamentalista trimestral:** indicadores de rentabilidade, endividamento e liquidez calculados a partir das demonstrações da CVM, com data de divulgação registrada.
- **Ranking por fatores:** pontuação dos ativos do IBovespa em janelas móveis de 3 anos, com teste no ano seguinte.
- **Simulação de carteira:** comparação entre a carteira alocada pelo ranking e a carteira de pesos iguais, com reinvestimento anual e métricas básicas de risco.
- **Relatório PDF:** opcional, backlog B-007, fora da primeira entrega.

## Fora do escopo

- Qualquer chamada a LLM ou à Claude API (removida do projeto).
- Runtime Python em produção (ADR-002).
- Indicadores técnicos novos (MACD, RSI, Bandas de Bollinger), que ficam no backlog.
- Custos de corretagem, impostos sobre ganho de capital e aluguel de ações nas simulações. A primeira versão aceita um parâmetro de custo fixo, com valor padrão zero.
- Sharpe e outras métricas que dependem de taxa livre de risco, até a definição de qual série de juros usar.
- Universo fora da B3 e BDRs (B-009).
- Recomendação de compra ou venda.

## Universo

Os 50 ativos do IBovespa já cadastrados em `backend/lib/ativos-ibovespa.ts`. Os FIIs ficam fora do ranking, porque seus indicadores (DY, P/VP, FFO) não são comparáveis aos de ações.

## Período

Histórico a partir de 2012, com backtest de 2015 a 2025 (ranking de 2015 a 2025 e simulação de 2018 a 2025). O período é parâmetro, e o padrão vem de `specs/03-ranking-carteira.md`.
