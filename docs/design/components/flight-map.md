# Flight map

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Dar contexto visual às Rotas com mapa abstrato de voo, dots IATA e paths
tracejados.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Painel `bg-inset` com grid pontilhada via dois `linear-gradient`, pontos
posicionados em `%` e SVG absoluto com `stroke-dasharray`.

## Tokens usados

`--bg-inset`, `--line`, `--accent`, `--line-faint`, `--text-body`,
`--text-muted`, `--font-mono`, `--radius-md`.

## Estados / interação

Projetado como visual informativo. Se virar interativo, precisa de foco por
ponto/rota e labels acessíveis.

## Movimento

Nenhum obrigatório. Se animar path, reduced-motion deve renderizar path estático.

## A11y

Mapa decorativo precisa de resumo textual próximo. Não depender só do SVG para
entender a Rota.

## Invariantes

- IATA pertence a Trecho/Pesquisa.
- O mapa do bundle é abstrato; não prometer geografia real.

## Como editar

Se a tela precisar de mapa real, isso é novo produto/design, não variação deste
componente.
