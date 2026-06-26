# Especificação de design — Noturno

## Princípio

`Noturno` é uma pele quente de aviação analógica: petróleo profundo, cremes, accent terracota, display condensado em caixa-alta e metadados mono. Use esta forma visual sem reimportar o bundle congelado de origem.

## Tokens

`docs/design/tokens.json` é a fonte viva dos tokens nomeados. O app consome o espelho em `apps/web/app/globals.css`; a página `/tokens` e os testes consomem `apps/web/lib/design/tokens.ts`. Os três devem ficar sincronizados; divergência é bug.

### Camadas

| Camada | Tokens | Uso |
|---|---|---|
| Fundo | `bg-root`, `bg-canvas`, `bg-inset`, `surface`, `surface-bar`, `fill-subtle`, `fill-accent` | Profundidade, cartões, painéis, inputs e seleção de rota. |
| Linha | `line`, `line-muted`, `line-dashed`, `line-strong`, `line-faint` | Hairlines, divisórias, borda tracejada, contornos e ícones apagados. |
| Texto | `text-bright`, `text-body`, `text-muted`, `text-mono`, `text-faint`, `text-faintest` | Hierarquia de leitura e metadados. |
| Acento/semântica | `accent`, `accent-alert`, `on-accent`, `success`, `warning`, bordas alpha | Marca, CTA, status e alerta de expiração. |
| Forma | `radius-*`, `border-*` | Raios, pílulas, hairline e acento lateral. |
| Layout | `page-gutter`, `max-width-wide`, `max-width-panel`, `hero-max`, `login-card`, `map-panel-height` | Containers, larguras de tela e altura fixa do mapa da criação. |
| Sombra | `shadow-switcher` | Switcher inferior projetado. |

### Nome vivo

O bundle de origem chama a borda secundária de `line-2`; no código vivo o token é `line-muted` / `--line-muted`. Use `line-muted`.

### Tokens de reserva

Tokens definidos sem uso na home pertencem ao estrato `⏳ projetado` (`blueprint.md`) e não dão licença para inventar superfície sem contrato. Antes de usar um token de reserva, leia a peça projetada que o justifica.

## Cores

Nunca escreva hex direto em componente; use token CSS. As únicas exceções são os literais conscientes catalogados abaixo. Selection usa `accent` sobre `bg-root`; texto sobre fundo `accent` usa `on-accent`.

## Tipografia

As famílias são injetadas por `next/font` em `apps/web/app/layout.tsx`:

| Papel | Família | Regra |
|---|---|---|
| Display | Saira Condensed 500/600/700 | Títulos, números grandes, botões, chips, IATA grande; sempre uppercase. |
| Corpo | Public Sans 400/500/600 | Parágrafos, explicações e nomes em corpo normal. |
| Mono | Spline Sans Mono 400/500 | Rótulos, metadados, captions e códigos; uppercase com tracking aberto. |

O `body` aplica Public Sans `15px` / line-height `1.5` sobre `bg-root`; `h1–h6` herdam Saira Condensed uppercase; `.mono` (e `code/kbd/samp/pre`) herdam Spline Sans Mono uppercase com tracking `0.1em`.

Escala:

| Papel | Tamanho |
|---|---|
| Hero | `74px` máximo, com clamp na home |
| H1 painel | `56px` |
| H2 seção | `34-42px` |
| Título de card | `18-22px` |
| Corpo | `14-17px` |
| Rótulo mono | `9-13px` |

## Voz e copy

- Idioma: pt-BR.
- Tom: coletivo, direto e informal.
- Vocabulário de forma: embarque, tripulação, caderno de bordo, translado.
- Vocabulário de domínio: use `CONTEXT.md` para Viagem, Parada, Trajeto, Rota, Trecho, Pesquisa, Preferida e Comprada.
- Evite voto/eleição/escolhida de grupo: a decisão é **por-pessoa** (CONTEXT inv. 4 · [ADR-0006](../adr/0006-apostas-de-dominio.md)).
- Dinheiro e pontos só aparecem na Pesquisa de translado/Rotas, nunca no Painel (CONTEXT inv. 5).
- Não traduza nomes de marca nem copy técnica de terminal. A marca é `travelmanager` (display `travel·manager`); nunca `traveltogether`.

## Movimento

A home **tem** movimento implementado. São três mecanismos, todos com `prefers-reduced-motion` tratado:

- **`pulse`** — `apps/web/components/pulse.module.css`: `@keyframes pulse` contínuo de `4.5s` (opacidade `0.55→1`, escala `1→1.12`), aplicado na estrela `✦` do `Wordmark` (`pulse` prop) e na estrela do eyebrow do herói. O elemento é sempre decorativo (`aria-hidden`). Sob `prefers-reduced-motion: reduce` a animação é desligada no próprio módulo; a estrela fica estática, sem perder forma nem cor.
- **`reveal`** — `apps/web/components/reveal.tsx` + `reveal.module.css`: scroll-reveal por `IntersectionObserver` (fade + translateY de entrada, duração/distância/atraso parametrizáveis por custom property para escalonar irmãos). Vários `<Reveal>` orquestram a entrada de header, herói, seções e cada camada da home. Degrada com segurança: sem `IntersectionObserver` ou sob reduced-motion o conteúdo aparece de imediato e **nunca** fica preso em opacity 0. A *declaração* da transição mora no módulo CSS (não inline) para que a media query de reduced-motion consiga vencê-la.
- **`ScrollLayers`** — `apps/web/components/scroll-layers.tsx`: orquestra as camadas de domínio reveladas abaixo da dobra conforme o scroll, compondo `<Reveal>` por camada (não é uma animação própria, é a composição do reveal ao longo da página).

Regra para movimento novo:

- Defina o comportamento no arquivo do componente.
- Inclua `@media (prefers-reduced-motion: reduce)` junto do componente.
- Com CSS Modules, co-localize `@keyframes` no mesmo módulo em que a classe usa `animation-name` — nomes de keyframe não são globais confiáveis nesse caso.
- Não use animação como único feedback de estado.

## Literais conscientes

Valores que espelham tokens e exigem sincronia manual:

- `docs/design/tokens.json` (fonte viva de tokens).
- `apps/web/app/globals.css` (espelho CSS; deve continuar igual ao JSON).
- `apps/web/lib/design/tokens.ts` (catálogo TS/testes; idem).

Literais responsivos conscientes na home: `clamp(42px, 8vw, 76px)` (herói) e `clamp(30px, 5vw, 48px)` / `clamp(30px, 5vw, 44px)` (H2 de seção) — o teto espelha a escala de hero/H2.

Valores locais de geometria (`gap`, `padding`, `fontSize`, `clamp`) podem ficar no componente enquanto forem específicos. Se aparecerem em várias fronteiras, promova para token.
