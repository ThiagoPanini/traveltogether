# Tabs e chips

## Estrato

**⏳ Projetado, não construído** para navegação interna da Viagem. Há uso visual
local de CTA na home, mas não de tabs/chips.

## Propósito

Representar vistas ou filtros compactos: Painel, Roteiro, Orçamento, Ingressos
e estados "em breve".

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Para navegação de seção, use `nav` com links. Para tabs reais de conteúdo, use
`tablist`/`tab`/`tabpanel`. Chip informativo pode ser `span`.

## Tokens usados

`--accent`, `--on-accent`, `--line-muted`, `--text-faint`,
`--line-dashed`, `--radius-btn`, `--radius-pill`, `--font-display`,
`--font-mono`.

## Estados / interação

- Ativo: `accent` sólido + `on-accent`.
- Inativo: transparente, borda `line-muted`, texto `text-faint`.
- Em breve: pílula tracejada ou muted, sem fingir interatividade.

## Movimento

Nenhum obrigatório.

## A11y

Estado ativo precisa ser anunciado (`aria-current` para links ou
`aria-selected` para tabs). Item indisponível não deve receber foco se não abre
nada.

## Invariantes

- Dentro da Viagem, cascas futuras são Roteiro, Orçamento e Ingressos.
- Não usar `Tarefas` como casca da V1.

## Como editar

Escolha primeiro se a interação é navegação ou tab. Documente a escolha no
componente implementado e atualize ADR se mudar a taxonomia de cascas.
