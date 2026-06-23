# Status pill

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Exibir estado curto de Trajeto, Pesquisa, Preferida/Comprada ou casca futura.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Pílula textual com radius `pill`, fonte mono uppercase e borda semântica. Pode
ser `span` quando informativa.

## Tokens usados

`--radius-pill`, `--font-mono`, `--accent`, `--accent-border`, `--success`,
`--success-border`, `--warning`, `--warning-border`, `--text-muted`,
`--line-dashed`.

## Estados / interação

Projetados:

- Em decisão / preferências abertas: accent.
- Definido/comprado: success.
- Em aberto/pendente: warning.
- A registrar: muted.

## Movimento

Nenhum.

## A11y

O texto da pill deve bastar sem cor. Não use apenas dot colorido.

## Invariantes

- Não representar decisão de grupo inexistente.
- "Definido" só quando o dado realmente existe no modelo.

## Como editar

Crie enum de estado no domínio da tela, não no componente visual genérico.
