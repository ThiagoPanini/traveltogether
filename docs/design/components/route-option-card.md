# Route option card

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Exibir uma Rota candidata para um Trajeto na tela Rotas, permitindo selecionar
qual caminho está sendo inspecionado.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Card selecionável com título, detalhe mono e tag de estado. Ativo usa borda
`accent`, fundo `fill-accent` e foreground `accent`; inativo usa `surface` e
`line-muted`.

## Tokens usados

`--accent`, `--fill-accent`, `--surface`, `--line-muted`, `--radius-card`,
`--font-display`, `--font-mono`, `--text-body`, `--text-mono`.

## Estados / interação

- Ativo: rota em inspeção na UI.
- Inativo: rota alternativa.

Evite tag `escolhida` se isso sugerir decisão de grupo. Prefira `selecionada`
para estado de UI ou `preferida` quando for decisão pessoal real.

## Movimento

Nenhum obrigatório.

## A11y

Use `button` ou radio group se a escolha altera painel na mesma tela. Use texto
de estado além de cor.

## Invariantes

- Rota é caminho candidato que realiza um Trajeto.
- "Com escala" só deve ser usado para Pesquisa/bilhete com escala; se há dois
  pulos, descreva como dois Trechos ou rota via cidade.

## Como editar

Modele primeiro Trajeto -> Rotas -> Trechos. O card não deve carregar preço;
preço pertence à Pesquisa/ticket.
