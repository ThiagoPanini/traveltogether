# Noturno — sistema visual do travelmanager

`Noturno` é a direção visual do travelmanager: uma pele quente de aviação analógica. O fundo é petróleo profundo — azuis quase pretos, nunca cinza puro — sobre o qual flutuam cremes e off-whites quentes; um único accent terracota (`#df6a4d`) carrega marca, CTA, estado ativo e destaque. A tipografia trabalha em três registros: **Saira Condensed** condensada em caixa-alta para títulos, números e botões; **Public Sans** para o corpo; **Spline Sans Mono** espaçada e em caixa-alta para rótulos, metadados e códigos de aeroporto.

A metáfora não é decoração: cartão de embarque, tripulação, código IATA, mapa de voo e caderno de bordo são o vocabulário visual porque o produto é sobre **translado** — combinar paradas, comparar caminhos e decidir passagens. Um tema genérico de SaaS não carregaria essa carga semântica; `Noturno` faz a forma falar a mesma língua do domínio. O trade-off é assumido: é uma estética com opinião forte (condensada, escura, com glifos), menos neutra que um tema padrão, e exige disciplina de token e de contraste para não virar ruído. Vale a pena porque dá ao produto uma identidade própria e coerente com o que ele faz.

## Origem (não é fonte-da-verdade)

`Noturno` nasceu de um protótipo do Claude Design (criado sob o nome antigo *traveltogether*), hoje **congelado e gitignored** em `.claude/design/`. Esse bundle é a origem creditada, **não** a fonte-da-verdade operacional, e não deve ser aberto como rotina. A verdade vive aqui, em dois estratos:

- **`as-built.md`** — o que existe em `apps/web` **hoje**. Para superfícies já implementadas, o código versionado é a verdade; este documento o descreve.
- **`blueprint.md`** — o **⏳ projetado**, ainda não construído (Fases 2–6). Reconcilie cada peça com o domínio (`CONTEXT.md`) **quando** for construí-la, não antes — política just-in-time do [ADR-0003](../adr/0003-faseamento-e-fatiamento.md).

Para tokens, leia `tokens.json` (fonte viva) e seu espelho em `../../apps/web/app/globals.css`. Para a especificação de forma — paleta, tipografia, escala, voz e movimento — leia `design-spec.md`. Para intenção e invariantes de domínio, leia `../../CONTEXT.md` e `../adr/`.

## Ordem de leitura

1. `design-spec.md` — tokens, tipografia, voz, movimento.
2. `as-built.md` — antes de tocar qualquer superfície já implementada.
3. `blueprint.md` — antes de construir uma superfície nova das Fases 2–6.
4. `../../CONTEXT.md` — sempre que a tela cruzar dados de domínio (Viagem, Parada, Trajeto, Rota, Trecho, Pesquisa, Preferida, Comprada).

## Regra de edição

- Use token, não literal, para cor, raio, borda, tipografia, sombra e largura nomeada. Literais conscientes são catalogados em `design-spec.md`.
- Movimento novo documenta `prefers-reduced-motion` junto do componente; CSS Module com animação co-localiza `@keyframes` no mesmo módulo.
- Quando uma peça sai de `⏳ projetado` para implementado, mova-a de `blueprint.md` para `as-built.md` no mesmo PR.
