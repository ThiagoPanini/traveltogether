# Layout

## Estrutura global

O app usa `html lang="pt-BR"` e fontes injetadas por `next/font` em
`apps/web/app/layout.tsx`. O `body` aplica `bg-root`, `text-body`, Public Sans,
`15px` e line-height `1.5`.

A home atual não cria uma camada `bg-canvas`; ela renderiza direto sobre
`bg-root`. Componentes implementados que precisam simular recorte no fundo,
como os entalhes do boarding pass, devem casar com o fundo real da tela.

## Containers

| Token | Uso |
|---|---|
| `--page-gutter` (`40px`) | Padding externo das telas desktop. |
| `--max-width-wide` (`1040px`) | Landing, Rotas e páginas utilitárias largas. |
| `--max-width-panel` (`1000px`) | Painel da Viagem projetado. |
| `--hero-max` (`720px`) | Bloco de hero/intro. |
| `--login-card` (`400px`) | Card central do login projetado. |

## Home implementada

Fronteira: `apps/web/app/page.tsx`.

- Container centralizado com `max-width-wide`, `page-gutter`, grid e gap `72px`.
- Header em flex, `justify-content: space-between`.
- Hero com `hero-max`, heading em três linhas e CTAs flex-wrap.
- Seções em grid com gap `20px`.
- Footer com border-top `line` e wordmark reduzido.

Responsivo atual:

- Hero e H2 usam `clamp`.
- Step cards usam `repeat(auto-fit, minmax(220px, 1fr))`.
- Ribbon usa flex-wrap.
- CTAs e header quebram linha naturalmente.

## Telas projetadas

### Landing

Container `max-width-wide`, `page-gutter`, header com wordmark + tagline, hero
até `hero-max`, step cards, CTAs e boarding-pass ribbon.

### Login

Tela full-height com header superior e card central de `login-card`. O card
tem superfície `surface`, borda `line`, radius `lg`, OTP de seis células e
ações primária/Google.

### Painel da Viagem

Container `max-width-panel`. Header com tabs/chips, resumo da viagem, contador
de dias, progress strip e grid principal `1.5fr / 1fr`:

- Coluna principal: timeline de Trajetos/decisões pessoais.
- Rail: tripulação e cards "em breve".

### Rotas

Container `max-width-wide` com grid `1.2fr / 1fr`.

- Coluna esquerda: Paradas e Trajetos derivados, com cards de rota.
- Coluna direita: painel sticky com flight map e ticket panel.

## Z-index

Não há z-index na home implementada.

Projetado:

- Bottom switcher: `position: fixed`, `bottom: 20px`, `left: 50%`,
  `transform: translateX(-50%)`, `z-index: 50`, `shadow-switcher`.
- Flight map: camadas absolutas internas; SVG e dots não devem escapar do
  painel `bg-inset`.
- Painel sticky de Rotas: `top: 24px`, sem criar novo contexto global.

## Breakpoints

Ainda não há tokens de breakpoint. O contrato atual prefere CSS intrínseco:
`clamp`, `auto-fit`, `minmax`, `flex-wrap` e containers máximos. Só crie
breakpoint nomeado quando um layout real exigir uma decisão que esses padrões
não expressem.
