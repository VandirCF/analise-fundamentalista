# 04 — Fontes de dados

## Resumo

| Dado | Fonte | Uso | Situação |
|---|---|---|---|
| Demonstrações trimestrais e anuais | **CVM Dados Abertos** (DFP e ITR) | Histórico fundamentalista (F7) | Escolhida (ADR-001) |
| Preço ajustado diário | Yahoo Finance via `yahoo-finance2` | Simulação e MA200 | Já usada no projeto |
| Cotação atual e variação | brapi e Status Invest | Upside do Graham | Já usada no projeto |
| Lucro, PL, Nº de ações (atual) | Fundamentus | Valuation (F6) | Já usada no projeto |
| Indicadores de mercado | brapi | Painel existente (T-016) | Já usada no projeto |
| Fintz | — | — | Descartada (ADR-001) |

## CVM Dados Abertos (F7)

- **Arquivos:** DFP (demonstrações anuais) e ITR (informações trimestrais), publicados em CSV por ano e agrupados em arquivos zip.
- **Plano de contas:** os dados usam códigos hierárquicos padronizados (ex.: `3.01` receita de venda de bens e serviços, `3.11` lucro líquido consolidado). **Validar** os códigos de cada indicador de `02-indicadores.md` com um arquivo real antes de escrever o parser.
- **Exercício:** usar apenas a coluna do exercício corrente, e a versão mais recente da demonstração quando houver retificação.
- **Vínculo com o ticker:** o arquivo traz o código CVM da companhia, não o ticker. O mapeamento ticker → código CVM vem do cadastro da CVM e é gravado na base, para não depender de busca em tempo de execução.
- **Data de divulgação (P3):** usar a data de recebimento informada no arquivo. Se ela não existir no arquivo validado, usar o **prazo regulatório** como data conservadora: ITR em 45 dias após o fim do trimestre e DFP em 90 dias após o fim do exercício. A escolha fica registrada na implementação.
- **Validação:** cada linha passa por schema Zod antes da gravação (CLAUDE.md). Linhas com valor não numérico viram `null`, não zero.
- **Carga:** job trimestral, com reprocessamento completo do ano corrente e incremental para os anos anteriores.

## Fundamentus (F6)

- Usado para Lucro Líquido 12 meses, PL, Nº de ações e cotação de referência.
- Página em ISO-8859-1, números em formato pt-BR (CLAUDE.md).
- Zero em múltiplos significa "não se aplica" (CLAUDE.md). Para Graham, zero em LPA ou VPA já resulta em `null`.

## Yahoo Finance (F9)

- Preço com ajuste por dividendos e desdobramentos para o retorno total da simulação.
- A biblioteca `yahoo-finance2` tem termos de uso próprios. Antes de publicar a simulação em ambiente público, conferir se o uso atende a esses termos (ver `referencias/atribuicao.md`).

## Regras gerais de consumo

- Toda chamada externa passa pela camada de cache `getOrSet` (CLAUDE.md).
- Scraping respeita o intervalo de 1 s.
- Falha de fonte não zera dado: o último valor válido sai do cache com a data de leitura, ou a interface mostra "—".
- Nenhuma chave de API nova entra no frontend (`NEXT_PUBLIC_*`).
