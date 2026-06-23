# Wordmark

## Estrato

**Implementado (as-built).**

## Propósito

Assinar o produto com a marca `travel·manager`, preservando a pista visual do
bundle: anel com estrela e wordmark condensado em caixa alta.

## Fronteira de código

- `apps/web/components/wordmark.tsx`
- Copy: `apps/web/lib/landing/content.ts`

## Estrutura / DOM

`span` inline-flex com duas partes:

- anel decorativo `aria-hidden` com `✦`;
- texto do wordmark.

O tamanho é parametrizado por prop `size`; o anel deriva de `size * 1.5`.

## Tokens usados

`--radius-circle`, `--border-outline`, `--accent`, `--font-display`,
`--text-bright`.

## Estados / interação

Não é interativo. Se virar link em navegação, o wrapper externo deve ser `a` e
manter o anel decorativo.

## Movimento

Nenhum.

## A11y

O glifo é decorativo e fica oculto para leitores de tela. O texto visível é a
marca.

## Invariantes

- Display usa `travel·manager`; identificadores de código usam `travelmanager`.
- O ponto-do-meio é só display de marca.
- Não reverter para `traveltogether`.

## Como editar

Mude a copy em `apps/web/lib/landing/content.ts`. Mude geometria visual no
componente. Se adicionar variante de cor, use token e documente aqui.
