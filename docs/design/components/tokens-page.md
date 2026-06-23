# Tokens page

## Estrato

**Implementado (suporte de design).**

## Propósito

Expor uma kitchen sink simples dos tokens vivos para inspeção rápida durante o
desenvolvimento.

## Fronteira de código

- `apps/web/app/tokens/page.tsx`
- `apps/web/lib/design/tokens.ts`
- Testes: `apps/web/app/tokens/page.test.tsx`,
  `apps/web/lib/design/tokens.test.ts`

## Estrutura / DOM

`main` centralizado com seções de paleta e tipografia. A paleta renderiza
`colorTokens`; a tipografia renderiza `typeScale`.

## Tokens usados

`--max-width-wide`, `--page-gutter`, `--border-hairline`, `--line`,
`--radius-card`, `--surface`, `--text-faint`, variáveis de fonte.

## Estados / interação

Nenhum.

## Movimento

Nenhum.

## A11y

Usa headings e listas. É página de suporte, não fluxo principal.

## Invariantes

- Deve refletir tokens vivos, não o bundle congelado.
- Se `tokens.json`, `globals.css` e `tokens.ts` divergirem, trate como bug de
  sincronização.

## Como editar

Adicione categoria no catálogo TS e teste correspondente. Não use esta página
como desculpa para criar token sem uso ou sem componente projetado.
