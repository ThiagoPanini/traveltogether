# Timeline leg

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Mostrar o salto da Viagem ao longo do tempo, com status e possível decisão
pessoal embutida.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Grid projetado `58px / 20px / 1fr`:

- data mono;
- dot de status;
- conteúdo com título, status pill, subcódigo e card opcional.

## Tokens usados

`--line`, `--font-mono`, `--text-muted`, `--text-faint`, `--font-display`,
`--text-bright`, `--accent`, `--success`, `--warning`, `--line-faint`.

## Estados / interação

O bundle mostra "trecho a trecho"; implementação deve distinguir:

- Trajeto como salto derivado.
- Rota como caminho candidato.
- Trecho como pulo/compra.

## Movimento

Nenhum.

## A11y

Timeline pode ser lista (`ol`) com cada item como `li`. Dot é decorativo se o
texto da status pill comunica o estado.

## Invariantes

- Não usar preço.
- Não chamar Trajeto de Trecho.
- IATA só se o item estiver falando de Trecho/Pesquisa.

## Como editar

Antes de implementar, escreva o mapeamento de dados da tela: Parada -> Trajeto
derivado -> Rotas/Trechos/Pesquisas exibidos.
