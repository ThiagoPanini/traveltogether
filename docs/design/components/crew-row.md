# Crew row

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Mostrar pessoas da Viagem e seu estado relevante para a decisão atual.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Linha flex com avatar inicial, nome e status mono. Avatar tem anel
`line-strong`, radius `circle`.

## Tokens usados

`--line`, `--line-strong`, `--radius-circle`, `--font-display`,
`--font-mono`, `--text-body`, `--accent`, `--text-mono`, `--warning`.

## Estados / interação

O bundle usa `organiza`, `votou`, `falta votar`. Implementação futura deve
usar papéis e estados reais:

- `organiza` para papel Organizador quando a tela pede papel.
- `preferiu`, `comprou`, `sem preferida` ou copy equivalente quando a tela pede
  decisão pessoal.

## Movimento

Nenhum.

## A11y

Avatar inicial é decorativo se o nome completo está visível. Não use cor como
único indicador de status.

## Invariantes

- Convite só vira membro após aceite.
- Não sugerir voto.

## Como editar

Defina se a linha está mostrando papel, presença ou decisão. Não misture os três
no mesmo status curto.
