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
- **Formato:** arquivos CSV separados por `;`, em **latin1** (Windows-1252). Decodificar antes de ler. Um arquivo por tipo de demonstração e por ano: `itr_cia_aberta_DRE_con_2025.csv`, `..._BPA_con_...`, `..._BPP_con_...`, `..._DFC_MI_con_...` (ITR) e `dfp_cia_aberta_DRE_con_...` (DFP). `con` é consolidado.
- **Plano de contas e códigos:** conferidos com a PETR4 (ver tabela de contas em `02-indicadores.md`).
- **Escala:** a coluna `ESCALA_MOEDA` vem como `MIL` nos arquivos verificados (PETR4, 2025). Os valores são multiplicados por 1.000 quando `MIL`. Outros valores de escala (ex.: `UNIDADE`) **não foram verificados**: a implementação deve recusar linhas com escala desconhecida, em vez de assumir. Sem essa conversão, os indicadores que misturam balanço e lucro ficam distorcidos.
- **Exercício:** a coluna `ORDEM_EXERC` traz `ÚLTIMO` e `PENÚLTIMO`. Usar só `ÚLTIMO` (o exercício corrente da linha). O `PENÚLTIMO` é o ano anterior, já coberto por outra linha.
- **Acumulados:** o ITR traz linhas de trimestre isolado e linhas acumuladas desde 1º de janeiro. O cálculo usa as acumuladas, pela fórmula de TTM em `02-indicadores.md`.
- **Vínculo com o ticker:** o arquivo traz `CD_CVM` (código da companhia, com seis dígitos e zeros à esquerda, ex.: `009512`), não o ticker. O vínculo ticker → código CVM vem do cadastro de valores mobiliários (FCA) e está em `backend/lib/cvmMapeamento.ts`. Não se inventa vínculo: tickers sem código ficam em `NAO_MAPEADOS_CVM`.
- **Procedimento do mapeamento (manual, em 2026-10-30):**
  1. Baixar `fca_cia_aberta_2025.zip` em `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/FCA/DADOS/`.
  2. Em `fca_cia_aberta_valor_mobiliario_2025.csv`, pegar o `CNPJ_Companhia` de cada `Codigo_Negociacao` sem `Data_Fim_Negociacao`.
  3. Em `fca_cia_aberta_geral_2025.csv`, pegar o `Codigo_CVM` do mesmo `CNPJ_Companhia`.
  4. Os tickers sem correspondência na etapa 2 ou 3 vão para `NAO_MAPEADOS_CVM`.
  Em 2026-10-30 o resultado foi 43 de 50 mapeados. Não mapeados: AXIA3, BPAC11, CMIN3, CPLE6, CRFB3, CSNA3 e MBRF3.
- **Data de divulgação (P3):** o arquivo não traz a data de recebimento (verificado em 2026-10-30 nos arquivos de 2025). Usa-se, portanto, o **prazo regulatório** como data conservadora: ITR em 45 dias após o fim do trimestre e DFP em 3 meses (90 dias) após o fim do exercício. Assim a demonstração só entra nas decisões depois do prazo. Essa regra é mais restritiva que a divulgação real, o que é o lado seguro para evitar *look-ahead*.
- **Validação:** cada linha passa por schema Zod antes da gravação (CLAUDE.md). Linhas com valor não numérico viram `null`, não zero.
- **Carga:** job trimestral, com reprocessamento completo do ano corrente e incremental para os anos anteriores.

## Fundamentus (F6)

- Usado para cotação de referência, P/L e P/VP (valuation, F6). Lucro líquido e número de ações não são necessários, pois LPA e VPA saem do P/L e do P/VP (ver `02-indicadores.md`).
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
