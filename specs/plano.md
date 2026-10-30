# Plano de implementação

## Fases

| Fase | Entrega | Tarefas | Depende de |
|---|---|---|---|
| **F6 — Valuation básico** | Graham, upside e MA200 | T-021 a T-023 | Fundamentus já integrado |
| **F7 — Histórico trimestral** | Ingestão CVM e indicadores trimestrais | T-024 a T-028 | F6 (reaproveita a camada de cache e o padrão de serviços) |
| **F8 — Ranking** | Ranking em janelas móveis, sem look-ahead | T-029 a T-031 | F7 |
| **F9 — Simulação** | Carteira quantitativa vs igualitária | T-032 a T-033 | F8 |

A fase F5 (qualidade e deploy) continua em andamento, e as fases novas não a bloqueiam. Pendências de F5 (contas e segredos) seguem no `CLAUDE.md`.

## Ordem sugerida dentro de cada fase

- **F6:** cálculo puro com testes → endpoint → exibição na tela de detalhe.
- **F7:** mapeamento de tickers e um arquivo real validado → parser e testes → migration → job → endpoint → gráfico.
- **F8:** função pura de ranking com testes de casos conhecidos (ex.: três ativos com valores escolhidos à mão) → verificação da regra de divulgação → endpoint → tela.
- **F9:** simulador puro com testes → métricas → endpoint → gráfico com aviso.

## Critérios de sucesso

- Cada fórmula tem teste unitário com valor calculado à mão.
- Nenhum indicador exibe valor de um período sem divulgação disponível na data de decisão.
- Nenhum valor ausente aparece como zero na interface.
- A simulação se comporta de forma idêntica quando executada duas vezes com os mesmos parâmetros.
- Todas as telas de ranking e simulação exibem o aviso de não recomendação.

## Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Formato dos arquivos da CVM diferente do esperado | Média | Validar com arquivo real antes do parser; teste com um ano conhecido |
| Mapeamento de ticker para código CVM incompleto | Média | Registrar os não mapeados em `avisos`, sem inventar vínculo |
| Viés de sobrevivência distorcer os resultados | Alta | Aviso explícito na interface (`03-ranking-carteira.md`, seção 6) |
| Look-ahead por data de divulgação incorreta | Média | Teste que confere a data de divulgação antes de cada decisão |
| Scraping do Fundamentus quebrar | Média (já existente) | Fallback para o último valor válido com data de leitura |
| Termos de uso do Yahoo Finance para exibição pública | Baixa a média | Verificar antes de publicar a simulação (`04-fontes-de-dados.md`) |

## Fora do plano desta etapa

Relatório PDF (B-007), indicadores técnicos novos e comparação entre dois ativos no mesmo gráfico (B-004).
