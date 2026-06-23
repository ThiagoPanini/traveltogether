# Decision card

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Exibir comparação ou estado de decisão pessoal dentro do Painel sem transformar
preferências em votação de grupo.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Card `surface` com borda `line` e left-border `border-accent-edge`. Conteúdo:
prompt, opções/lista de Pesquisas ou Preferidas visíveis e CTA textual para
Rotas.

## Tokens usados

`--surface`, `--line`, `--border-accent-edge`, `--accent`, `--warning`,
`--font-display`, `--font-mono`, `--text-muted`, `--text-bright`,
`--text-faint`.

## Estados / interação

Futuro vocabulário:

- `2 votos` -> `2 de 4 já preferem`.
- `escolhida` -> `Preferida de você` ou `Preferida de Nome`.
- `votou/falta votar` -> estado pessoal de Preferida/Comprada.

## Movimento

Nenhum obrigatório.

## A11y

Lista de opções deve ser lista real. CTA deve ser link para Rotas ou botão se
abrir modal/ação local.

## Invariantes

- Decisão é por-pessoa.
- O Painel pode agregar preferências, mas não decide por ninguém.
- Sem preço no Painel.

## Como editar

Use ADR-0004 antes de escrever copy. Qualquer termo de eleição é bug.
