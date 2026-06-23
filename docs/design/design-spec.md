# Especificação de design

## Princípio

Tema B Noturno é uma pele quente de aviação analógica: petróleo profundo,
cremes, accent terracota, display condensado em caixa alta e metadados mono.
Use esta forma visual sem importar de volta o bundle.

## Tokens

`docs/design/tokens.json` é a fonte viva de tokens nomeados. O app consome o
espelho em `apps/web/app/globals.css`; a página `/tokens` e os testes consomem
`apps/web/lib/design/tokens.ts`.

### Camadas

| Camada | Tokens | Uso |
|---|---|---|
| Fundo | `bg-root`, `bg-canvas`, `bg-inset`, `surface`, `surface-bar`, `fill-subtle`, `fill-accent` | Profundidade, cartões, painéis, inputs e seleção de rota. |
| Linha | `line`, `line-muted`, `line-dashed`, `line-strong`, `line-faint` | Hairlines, divisórias, borda tracejada, contornos e ícones apagados. |
| Texto | `text-bright`, `text-body`, `text-muted`, `text-mono`, `text-faint`, `text-faintest` | Hierarquia de leitura e metadados. |
| Acento/semântica | `accent`, `accent-alert`, `on-accent`, `success`, `warning`, bordas alpha | Marca, CTA, status e alerta de expiração. |
| Forma | `radius-*`, `border-*` | Raios, pílulas, hairline e acento lateral. |
| Layout | `page-gutter`, `max-width-wide`, `max-width-panel`, `hero-max`, `login-card` | Containers e larguras de tela. |
| Sombra | `shadow-switcher` | Switcher inferior projetado. |

### Nome vivo

O bundle chama a borda secundária de `line-2`; no código vivo o token é
`line-muted` / `--line-muted`. Use `line-muted`.

## Cores

Nunca escreva hex direto em componente. Use tokens CSS. Exceções só são literais
conscientes catalogados em `procedencia-e-deltas.md`.

Selection usa `accent` sobre `bg-root`. Texto sobre fundo `accent` usa
`on-accent`.

## Tipografia

As famílias são injetadas por `next/font`:

| Papel | Família | Regra |
|---|---|---|
| Display | Saira Condensed 500/600/700 | Títulos, números grandes, botões, chips, IATA grande; sempre uppercase. |
| Corpo | Public Sans 400/500/600 | Parágrafos, explicações e nomes em corpo normal. |
| Mono | Spline Sans Mono 400/500 | Rótulos, metadados, captions e códigos; uppercase com tracking aberto. |

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
- Vocabulário de domínio: use `CONTEXT.md` para Viagem, Parada, Trajeto,
  Rota, Trecho, Pesquisa, Preferida e Comprada.
- Evite voto/eleição/escolhida de grupo. A decisão é por-pessoa.
- Dinheiro e pontos só aparecem na Pesquisa de translado/Rotas, nunca no Painel.
- Não traduza nomes de marca nem copy técnica de terminal.

## Movimento

Não há animação implementada na home. Para movimento futuro:

- Defina o comportamento no arquivo do componente.
- Inclua `@media (prefers-reduced-motion: reduce)` junto do componente.
- Se usar CSS Modules, co-localize `@keyframes` no mesmo módulo em que a classe
  usa `animation-name`; nomes de keyframe não são globais confiáveis nesse caso.
- Não use animação como único feedback de estado.

## Literais conscientes

Valores que espelham tokens e exigem sincronia manual:

- `docs/design/tokens.json`
- `apps/web/app/globals.css`
- `apps/web/lib/design/tokens.ts`

Valores locais de geometria (`gap`, `padding`, `fontSize`, `clamp`) podem ficar
no componente enquanto forem específicos. Se aparecerem em várias fronteiras,
promova para token ou documente como padrão no componente.

## Tokens de reserva

Tokens definidos sem uso na home são parte do estrato `⏳ projetado` e não dão
licença para inventar nova superfície sem contrato. Antes de usar um token de
reserva, leia o componente projetado que o justifica.
