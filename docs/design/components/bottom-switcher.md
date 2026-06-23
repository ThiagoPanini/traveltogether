# Bottom switcher

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Permitir navegação livre entre telas do protótipo ou vistas internas quando o
app autenticado existir.

## Fronteira de código

Nenhuma implementação viva. Não aparece na home atual.

## Estrutura / DOM

Barra fixa centralizada:

- `position: fixed`
- `bottom: 20px`
- `left: 50%`
- `transform: translateX(-50%)`
- `z-index: 50`
- itens com ativo `accent/on-accent`

## Tokens usados

`--surface-bar`, `--line-muted`, `--radius-card`, `--shadow-switcher`,
`--accent`, `--on-accent`, `--text-muted`, `--font-display`, `--font-mono`.

## Estados / interação

Ativo/inativo. Separador visual antes de links utilitários quando existirem.

## Movimento

Nenhum obrigatório.

## A11y

Use `nav` com `aria-label`. Links ativos usam `aria-current="page"`.

## Invariantes

- Não colocar switcher na landing pública atual só porque existe no bundle.
- Só entra quando houver mais de uma vista navegável real.

## Como editar

Defina primeiro o modelo de navegação: app global, Viagem ou ferramenta de
protótipo. O mesmo visual não precisa servir todos os contextos.
