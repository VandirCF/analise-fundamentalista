# Especificações — Análise Fundamentalista

Esta pasta contém as especificações do projeto, no modelo SDD (*Spec-Driven Development*): o comportamento é definido antes da implementação, e o código deve cumprir a especificação.

## Índice

| Arquivo | Conteúdo |
|---|---|
| [00-constituicao.md](00-constituicao.md) | Princípios que não podem ser violados |
| [01-escopo.md](01-escopo.md) | O que entra e o que fica fora |
| [02-indicadores.md](02-indicadores.md) | Fórmulas dos indicadores trimestrais e de valuation |
| [03-ranking-carteira.md](03-ranking-carteira.md) | Ranking por fatores, janela móvel e simulação de carteira |
| [04-fontes-de-dados.md](04-fontes-de-dados.md) | Fontes, limites e regras de uso |
| [05-modelo-de-dados.md](05-modelo-de-dados.md) | Tabelas Prisma propostas e TTLs de cache |
| [06-contratos-api.md](06-contratos-api.md) | Rotas novas e schemas |
| [plano.md](plano.md) | Fases, dependências, riscos e critérios de sucesso |
| [adr/](adr/) | Decisões de arquitetura registradas |
| [referencias/atribuicao.md](referencias/atribuicao.md) | Repositórios de referência e atribuição |

As tarefas (T-021 a T-033) ficam no [TASKS.md](../TASKS.md), que é a fonte única de acompanhamento.

## Fluxo por funcionalidade

1. **Especificação:** atualizar o documento temático (ex.: `02-indicadores.md`).
2. **Decisão:** se houver escolha de arquitetura ou fonte, criar um ADR em `adr/`.
3. **Tarefa:** adicionar ou ajustar a tarefa no `TASKS.md`, com critérios de conclusão ligados à especificação.
4. **Implementação:** seguir as convenções do `CLAUDE.md`.
5. **Verificação:** marcar `[x]` no `TASKS.md` somente após conferir cada critério, incluindo os testes unitários das fórmulas.

Quando uma regra de cálculo mudar, a especificação muda primeiro, e o código e os testes acompanham.
