# Em breve card

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Mostrar cascas honestas dentro de uma Viagem sem prometer funcionalidade ativa.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Card com borda tracejada, ícone mono, título, nota e pill `em breve`.

## Tokens usados

`--line-dashed`, `--radius-sm`, `--font-display`, `--font-mono`,
`--text-muted`, `--text-faintest`, `--line`, `--line-faint`.

## Estados / interação

Informativo. Não deve parecer clicável se não há tela.

## Movimento

Nenhum.

## A11y

Ícone decorativo `aria-hidden`; texto comunica indisponibilidade.

## Invariantes

- Dentro da Viagem, cascas V1: Roteiro, Orçamento, Ingressos.
- Não usar `Tarefas` na V1.
- Em breve só dentro de uma Viagem, não no menu global.

## Como editar

Se uma casca vira funcional, remova pill `em breve`, crie contrato do novo
componente/tela e atualize roadmap/ADR se necessário.
