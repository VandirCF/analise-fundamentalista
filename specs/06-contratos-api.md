# 06 — Contratos da API

Rotas novas no backend Fastify. Os parâmetros de query são validados com Zod. Erros de fonte seguem o tipo `Result<T>` do CLAUDE.md, e a resposta de erro tem o formato `{ "erro": string, "mensagem": string }`.

## Valuation (F6)

`GET /api/ativos/:ticker/valuation`

```json
{
  "ticker": "PETR4",
  "cotacao": 38.5,
  "lpa": 6.1,
  "vpa": 22.3,
  "grahamVI": 52.0,
  "upsidePct": 35.1,
  "atualizadoEm": "2026-10-30T14:05:00-03:00",
  "motivoNulo": null
}
```

- `grahamVI` e `upsidePct` são `null` quando LPA ou VPA não são positivos. `motivoNulo` diz qual foi a causa (ex.: `"LPA_NAO_POSITIVO"`).
- A interface mostra "—" para qualquer `null`.

## Indicadores trimestrais (F7)

`GET /api/ativos/:ticker/indicadores-trimestrais?de=2015&ate=2025`

- Retorna uma série por indicador, com `ano`, `trimestre`, `valor` e `dataDivulgacao`.
- Limite de 20 anos por requisição.

## Ranking (F8)

`GET /api/ranking?anoFim=2025`

- `anoFim` é o último ano da janela de 3 anos, de `anoFim−2` a `anoFim`.
- Retorna a lista de ativos elegíveis, com `posicao`, `nota`, `alocacaoPct` e os valores médios dos cinco indicadores.
- Inclui `avisos`: lista de ativos excluídos e motivo.
- Sempre inclui o texto de não recomendação (P6).

## Simulação (F9)

`GET /api/simulacao?inicio=2018&fim=2025&capital=100000&custoFixo=0`

- Limites: `inicio ≥ 2015`, `fim ≤` ano corrente − 1, `capital > 0`, `custoFixo ≥ 0`.
- Retorna a série diária do capital de cada estratégia, o capital anual e as métricas de `03-ranking-carteira.md`, seção 5.
- Inclui `limitacoes` (texto da seção 6 de `03-ranking-carteira.md`) e o aviso de não recomendação.

## Regras comuns

- Todas as respostas com valores monetários e percentuais já vêm formatadas em pt-BR somente na camada de apresentação. A API devolve números, e o frontend formata com `lib/formatters.ts`.
- Rotas em kebab-case (CLAUDE.md).
- Respostas são cacheadas conforme `05-modelo-de-dados.md`.
