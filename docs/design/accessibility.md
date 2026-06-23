# Acessibilidade

## Contrato atual

- Documento em `pt-BR`.
- Headings seguem hierarquia: um único `h1` na home, seções em `h2`, cards em
  `h3`.
- `StepCards` usa `ol/li`, preservando ordem.
- `BoardingPassRibbon` é uma `section` com `aria-label` descritivo.
- Glifos decorativos usam `aria-hidden`.
- Links são links reais na home; nenhum outline de foco é removido.
- Não há animação implementada, então reduced-motion não tem efeito prático hoje.

## Foco

Componentes interativos devem usar elemento semântico:

- Navegação: `a`.
- Comando: `button`.
- Campo: `input`, `label`, `fieldset` quando aplicável.

O protótipo do bundle usa `span onClick`; isso é forma de protótipo, não contrato
de implementação. Ao construir Login, Painel, Rotas ou switcher, substitua por
controles semânticos e mantenha foco visível.

## Reduced motion

Cada componente com movimento deve documentar:

- Estado normal.
- Estado `prefers-reduced-motion: reduce`.
- O que continua comunicando o estado sem movimento.

Não concentre reduced-motion num reset global que esconda a responsabilidade do
componente.

## Forced colors

Ainda não há implementação específica de `forced-colors`. Ao adicionar novos
componentes:

- Evite depender apenas de cor para status; combine texto, rótulo ou forma.
- Use borda real onde o contraste importa.
- Prefira `currentColor` em ícones decorativos.
- Teste que botões, pills e inputs continuam reconhecíveis sem gradientes nem
  cor customizada.

## Trade-offs conscientes

- A home usa glifos como textura visual (`✦`, `◷`, `✈`, `→`); eles são
  decorativos ou fazem parte da copy visível. Quando decorativos, recebem
  `aria-hidden`.
- O ribbon repete `GRU` na ida e na volta; isso é intencional e coberto por
  teste.
- A página `/tokens` é suporte de design, não fluxo principal do usuário.

## Superfícies projetadas

- OTP precisa de label do grupo e navegação por teclado entre células.
- Countdown de login não deve depender só da cor `accent-alert`.
- Tabs/chips precisam anunciar estado ativo com `aria-current` ou
  `aria-selected`, conforme o padrão escolhido.
- Bottom switcher deve ser `nav` com rótulo claro.
- Ticket panel deve manter dinheiro e pontos como dimensões separadas; não
  somar, converter ou anunciar "melhor" automaticamente.
