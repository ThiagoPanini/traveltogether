# Boarding-pass ribbon

## Estrato

**Implementado (as-built).**

## Propósito

Mostrar um exemplo de roteiro do grupo como cartão de embarque analógico, com
IATA e cidades em sequência.

## Fronteira de código

- `apps/web/components/boarding-pass-ribbon.tsx`
- Dados/copy: `apps/web/lib/landing/content.ts`

## Estrutura / DOM

`section` com `aria-label`, header com label/meta e `ol` flex-wrap para as
pernas do roteiro. Setas entre cidades são decorativas.

Entalhes laterais são `span aria-hidden`, posicionados absolutamente em
`left/right: -9px`, tamanho `18px`.

## Tokens usados

`--surface`, `--border-hairline`, `--line`, `--radius-lg`, `--line-dashed`,
`--font-display`, `--text-bright`, `--text-faint`, `--accent`,
`--radius-circle`, `--bg-root`.

## Estados / interação

Nenhum estado interativo.

## Movimento

Nenhum.

## A11y

Região nomeada como cartão de embarque. O roteiro é lista ordenada. Setas e
entalhes são decorativos.

## Invariantes

- O contrato as-built é round-trip: `GRU -> JFK -> MIA -> MCO -> GRU`.
- O entalhe usa `--bg-root` porque a home atual renderiza direto sobre esse
  fundo. Se a tela passar a usar `--bg-canvas`, revise o token do entalhe.
- IATA aqui é exemplo visual de translado; em telas de dados, IATA pertence a
  Trecho/Pesquisa, não à Parada.

## Como editar

Mude roteiro/meta em `content.ts`. Se mudar o fundo da página, valide o recorte
dos entalhes e registre o delta em `procedencia-e-deltas.md`.
