# Progress strip

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Mostrar avanço da Viagem ou do Painel sem expor preço: por exemplo, quantos
Trajetos/Pesquisas/decisões pessoais já têm estado suficiente.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Rótulo + porcentagem mono + trilha de `8px` com radius `bar` e preenchimento
`accent`. Pode acompanhar contador textual em `warning`.

## Tokens usados

`--fill-subtle`, `--accent`, `--radius-bar`, `--font-mono`, `--text-body`,
`--text-faint`, `--warning`.

## Estados / interação

Informativo. Percentual deve vir de dado calculado na tela, não do componente.

## Movimento

Não animar largura por padrão. Se animar, inclua reduced-motion.

## A11y

Use `role="progressbar"` apenas se houver valor atual/máximo claro. Caso
contrário, texto simples é melhor.

## Invariantes

- Não incluir dinheiro, pontos ou "economia".
- Não sugerir ranking ou melhor opção.

## Como editar

Defina primeiro a métrica de domínio. Depois mapeie para label, valor e máximo.
