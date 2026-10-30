# ADR-002 — Cálculos em TypeScript, sem runtime Python

**Status:** aceito
**Data:** 2026-10-30

## Contexto

Os dois repositórios de referência usam Python (pandas, numpy, yfinance, fundamentus). O projeto é inteiramente TypeScript (Next.js e Fastify), com deploy na Vercel e na Railway.

## Decisão

- Os métodos são **reimplementados em TypeScript** no backend, em `backend/services/`, com funções puras e testes unitários.
- Nenhum código dos repositórios de referência é copiado. A implementação parte da descrição do método, não do código.
- Não há runtime Python em produção nem no CI.

## Consequências

- Um único stack para manter, testar e fazer deploy (P9).
- Menos risco de licença: o método não tem licença e o código tem. Ver `referencias/atribuicao.md`.
- Exige reimplementar a normalização, a média por janela e a simulação. Pandas e numpy são substituídos por código simples, suficiente para 50 ativos e 12 anos.
- Os notebooks de referência não entram no repositório.
