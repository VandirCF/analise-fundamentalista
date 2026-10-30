# 00 — Constituição do projeto

Princípios que valem para todas as funcionalidades. Uma mudança que viole um princípio exige um ADR que o revogue explicitamente.

**P1 — Cálculo determinístico.** Indicadores, valuation, ranking e simulação são funções matemáticas sobre dados. Nenhum resultado depende de modelo de linguagem ou de julgamento automático.

**P2 — Nunca inventar valores.** Quando um dado não existe, o valor é `null` e a interface mostra "—". Não se preenche com zero, média ou valor de outro período. Zero só significa zero quando a regra do indicador disser isso (ver `02-indicadores.md`).

**P3 — Sem look-ahead.** Nenhuma decisão histórica (ranking, alocação, simulação) usa informação divulgada depois da data em que a decisão seria tomada.

**P4 — Reprodutibilidade.** Toda fórmula tem teste unitário com valores calculados à mão. Um resultado deve ser reproduzível a partir dos dados brutos e da versão da especificação.

**P5 — Transparência do método.** A interface explica o que cada indicador mede e o que o ranking e a simulação assumem. Abreviaturas são escritas por extenso (ex.: `P/L (Preço/Lucro)`), conforme o `CLAUDE.md`.

**P6 — Não é recomendação.** O produto apresenta análises e simulações históricas. Toda tela de ranking e de simulação exibe o aviso de que não constitui recomendação de investimento e que resultados passados não garantem resultados futuros.

**P7 — Fontes públicas e controladas.** Dados vêm de fontes públicas (CVM, Yahoo Finance via `yahoo-finance2`, Fundamentus, brapi). Nenhuma chave paga é exigida para as funcionalidades novas. Scraping respeita o intervalo de 1 s (`lib/throttle.ts`).

**P8 — Pt-BR e formatação centralizada.** Valores monetários, percentuais e datas passam por `lib/formatters.ts`, nunca por formatação inline.

**P9 — Código em TypeScript.** Cálculos rodam no backend em TypeScript estrito, sem `any`. Nenhum runtime Python entra em produção (ADR-002).
