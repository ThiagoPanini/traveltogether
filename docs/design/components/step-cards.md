# Step cards

## Estrato

**Implementado (as-built).**

## Propósito

Explicar a promessa da landing em três passos: cadastrar a viagem, desenhar as
paradas e pesquisar o translado.

## Fronteira de código

- `apps/web/components/step-cards.tsx`
- Dados/copy: `apps/web/lib/landing/content.ts`

## Estrutura / DOM

`ol` sem marcador visual, com `li` por passo. Cada item tem número, glifo
decorativo, título `h3` e corpo.

O grid vivo é responsivo:

`repeat(auto-fit, minmax(220px, 1fr))`

## Tokens usados

`--border-hairline`, `--line`, `--radius-lg`, `--surface`, `--font-display`,
`--accent`, `--text-faint`, `--text-bright`, `--text-muted`.

## Estados / interação

Nenhum estado interativo.

## Movimento

Nenhum.

## A11y

Usa lista ordenada real. Glifo do passo é `aria-hidden`.

## Invariantes

- Sempre três passos na landing atual.
- Copy segue tom coletivo e domínio: `Cadastrem`, `Desenhem`, `Pesquisem`.
- Não usar termos proibidos ou mecânica de voto.

## Como editar

Mude conteúdo em `content.ts`. Só altere a anatomia quando precisar de novo
contrato de layout; nesse caso atualize este arquivo e os testes da landing.
