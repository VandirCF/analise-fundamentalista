# Referências e atribuição

Os dois repositórios abaixo inspiraram o método deste projeto. Nenhum código foi copiado, e os métodos foram reimplementados em TypeScript (ADR-002).

## Repositórios de referência

| Autor | Repositório | Contribuição ao método |
|---|---|---|
| William Brandão | https://github.com/William-Brandao/Analise-fundamentalista | Ranking por fatores em janelas móveis (3 anos de avaliação e 1 de teste), normalização entre ativos, carteira quantitativa vs igualitária com reinvestimento anual |
| Alexandre da Fonseca | https://github.com/alefonsecabb/B3-Stock-Analisys-with-Python | Fórmula de Graham com a condição de LPA e VPA positivos, médias móveis de 20, 50 e 200 pregões, pipeline diário de dados |

## Licenças

- **Alexandre da Fonseca:** o README cita licença MIT, mas o arquivo `LICENSE` não está no repositório. **Pendente de verificação.**
- **William Brandão:** não há arquivo de licença no repositório. **Pendente de verificação.**

Como o código não foi copiado, a ausência de licença clara não afeta este projeto. A atribuição de método é feita aqui.

## Correções registradas em relação às referências

- Ranking: indicadores fixos e regra de divulgação (ADR-003 e `03-ranking-carteira.md`).
- Dívida: sentido invertido na normalização.
- Retorno: preços ajustados por dividendos.
- LPA: lucro por ação, e não receita por ação.
- Médias móveis: exibidas somente com janela completa.
- Liquidez seca: `null` quando faltam estoques, sem cair na liquidez corrente.

## Bibliotecas e dados de terceiros

- `yahoo-finance2` e Yahoo Finance: verificar os termos de uso antes de exibir publicamente a simulação.
- Fundamentus e brapi: uso conforme os termos de cada serviço, com limite de requisições.
- CVM Dados Abertos: dados públicos.
