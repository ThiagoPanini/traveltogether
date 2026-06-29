# Especificação de design — Noturno

## Princípio

`Noturno` é uma pele quente de aviação analógica: petróleo profundo, cremes, accent terracota, display condensado em caixa-alta e metadados mono. Use esta forma visual para as telas do redesign sem voltar ao tema antigo de SaaS genérico.

## Tokens

`docs/design/tokens.json` é a fonte viva dos tokens nomeados. O app consome o espelho em `apps/web/app/globals.css`; a página `/tokens` e os testes consomem `apps/web/lib/design/tokens.ts`. Os três devem ficar sincronizados; divergência é bug.

### Camadas

| Camada | Tokens | Uso |
|---|---|---|
| Fundo | `bg-root`, `bg-canvas`, `bg-inset`, `surface`, `surface-bar`, `fill-subtle`, `fill-accent` | Profundidade, cartões, painéis, inputs e seleção de rota. |
| Linha | `line`, `line-muted`, `line-dashed`, `line-strong`, `line-faint` | Hairlines, divisórias, borda tracejada, contornos e ícones apagados. |
| Texto | `text-bright`, `text-body`, `text-muted`, `text-mono`, `text-faint`, `text-faintest` | Hierarquia de leitura e metadados. |
| Acento/semântica | `accent`, `accent-alert`, `on-accent`, `success`, `warning`, bordas alpha | Marca, CTA, status, alerta e Preferida. |
| Forma | `radius-*`, `border-*` | Raios, pílulas, hairline e acento lateral. |
| Layout | `page-gutter`, `max-width-wide`, `max-width-panel`, `hero-max`, `login-card`, `map-panel-height` | Containers, larguras de tela e altura fixa do mapa da criação. |
| Sombra | `shadow-switcher` | Sombra reservada para navegação flutuante ou painéis futuros. |

### Nome vivo

O bundle de origem chama a borda secundária de `line-2`; no código vivo o token é `line-muted` / `--line-muted`. Use `line-muted`.

## Cores

Nunca escreva hex direto em componente; use token CSS. As únicas exceções são os literais conscientes catalogados abaixo. Selection usa `accent` sobre `bg-root`; texto sobre fundo `accent` usa `on-accent`.

Evite páginas dominadas por uma única variação de azul petróleo. O fundo é escuro, mas a composição deve respirar com creme, linhas, superfícies, accent terracota e estados semânticos.

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
| Hero | `74px` máximo, com `clamp` nas telas públicas e painéis. |
| H1 painel | `56px` máximo. |
| H2 seção | `34-42px`. |
| Título de card | `18-22px`. |
| Corpo | `14-17px`. |
| Rótulo mono | `9-13px`. |

## Voz e copy

- Idioma: pt-BR.
- Tom: coletivo, direto e informal.
- Vocabulário de forma: embarque, tripulação, caderno de bordo, translado.
- Vocabulário de domínio: use `CONTEXT.md` para Viagem, Parada, Trajeto, Rota, Trecho, Pesquisa, Preferida e Comprada.
- Evite voto/eleição/escolhida de grupo: a decisão é **por-pessoa** (CONTEXT inv. 4 · [ADR-0006](../adr/0006-apostas-de-dominio.md)).
- Dinheiro e pontos só aparecem na Pesquisa de translado/Rotas, nunca no Painel (CONTEXT inv. 5).
- Não traduza nomes de marca nem copy técnica de terminal. A marca é `travelmanager` (display `travel·manager`); nunca `traveltogether`.

## Movimento

O redesign atual é majoritariamente estático e responsivo. Se uma tela introduzir animação, ela deve ser discreta, co-localizada no CSS Module da peça e desligada com `prefers-reduced-motion: reduce`.

Regras:

- Defina o comportamento no arquivo do componente.
- Inclua `@media (prefers-reduced-motion: reduce)` junto do componente.
- Com CSS Modules, co-localize `@keyframes` no mesmo módulo em que a classe usa `animation-name`.
- Não use animação como único feedback de estado.

## Literais conscientes

Valores que espelham tokens e exigem sincronia manual:

- `docs/design/tokens.json` (fonte viva de tokens).
- `apps/web/app/globals.css` (espelho CSS; deve continuar igual ao JSON).
- `apps/web/lib/design/tokens.ts` (catálogo TS/testes; idem).

Valores locais de geometria (`gap`, `padding`, `fontSize`, `clamp`) podem ficar no componente enquanto forem específicos. Se aparecerem em várias fronteiras, promova para token.
