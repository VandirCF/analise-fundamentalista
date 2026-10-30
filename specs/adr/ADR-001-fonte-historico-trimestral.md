# ADR-001 — Fonte do histórico fundamentalista trimestral

**Status:** aceito
**Data:** 2026-10-30

## Contexto

O ranking e os indicadores trimestrais precisam de demonstrações contábeis de 2012 em diante, para 50 ativos. As opções avaliadas foram:

- **Fintz:** API com histórico de itens contábeis, mas exige chave e plano pago, e o notebook de referência dependia dela.
- **brapi (`balanceSheetHistory`):** já usada no projeto, porém o acesso depende do plano contratado, e o histórico disponível não foi verificado.
- **CVM Dados Abertos (DFP e ITR):** publicação oficial, gratuita e pública, com data de entrega registrada. Exige parsing.

## Decisão

Usar **CVM Dados Abertos** como fonte primária do histórico trimestral e anual (F7).

## Consequências

- Nenhuma chave paga entra no projeto (P7).
- A data de entrega permite aplicar a regra de não look-ahead (P3) com base oficial.
- Parte do esforço vai para o parser e para o mapeamento ticker → código CVM, que precisam de testes com arquivos reais.
- A brapi continua como fonte de indicadores de mercado, sem ser usada para o histórico de demonstrações.
- Se a CVM alterar o formato dos arquivos, o parser precisa de ajuste. Por isso o parser tem teste com um arquivo de referência versionado.
