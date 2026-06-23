# Ticket panel

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Mostrar a Pesquisa de translado selecionada com dinheiro e pontos/milhas como
dimensões separadas, além de ações pessoais Preferida/Comprada.

## Fronteira de código

Nenhuma implementação viva.

## Estrutura / DOM

Panel `surface` com header, grade de duas colunas para pontos/dinheiro e área
de ações pessoais.

## Tokens usados

`--surface`, `--line`, `--radius-md`, `--font-display`, `--font-mono`,
`--text-bright`, `--text-faint`, `--accent`, `--on-accent`,
`--line-strong`, `--fill-subtle`.

## Estados / interação

- Preferida: toggle pessoal.
- Comprada: toggle/status pessoal depois de Preferida.
- Valores: podem existir dinheiro, pontos ou ambos, mas nunca conversão.

## Movimento

Nenhum obrigatório.

## A11y

Use botões reais para Preferida/Comprada. Valores precisam de labels textuais,
não apenas posição visual.

## Invariantes

- Único lugar permitido para dinheiro/pontos é Pesquisa de translado/Rotas.
- Não dizer "mais barato" cruzando unidades.
- Pontos de programas diferentes não se somam.

## Como editar

Antes de implementar, modele `Pesquisa` e suas unidades. Trate ida-e-volta como
uma Pesquisa cobrindo um ou mais Trechos, não como duplicação de preço.
