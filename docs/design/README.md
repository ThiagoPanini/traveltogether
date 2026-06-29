# Noturno — sistema visual do travelmanager

`Noturno` é a direção visual do travelmanager: uma pele quente de aviação analógica. O fundo é petróleo profundo — azuis quase pretos, nunca cinza puro — sobre o qual flutuam cremes e off-whites quentes; o accent terracota (`#df6a4d`) carrega marca, CTA, estado ativo e destaque. A tipografia trabalha em três registros: **Saira Condensed** condensada em caixa-alta para títulos, números e botões; **Public Sans** para o corpo; **Spline Sans Mono** espaçada e em caixa-alta para rótulos, metadados e códigos de aeroporto.

A metáfora não é decoração: cartão de embarque, tripulação, código IATA, mapa de voo e caderno de bordo são o vocabulário visual porque o produto é sobre **translado** — combinar paradas, comparar caminhos e decidir passagens. Um tema genérico de SaaS não carregaria essa carga semântica; `Noturno` faz a forma falar a mesma língua do domínio.

## Fonte atual

O redesenho navegável aceito para a aplicação vive em `.claude/design/redesign-travelmanager` e foi implementado nas telas atuais de `apps/web`. A partir da implementação, a verdade operacional é o código versionado, descrito em `as-built.md`; o protótipo continua sendo a referência de intenção quando houver dúvida visual sobre essas telas.

- **`as-built.md`** — o que existe em `apps/web` hoje: Landing, Login, Onboarding, Painel de bordo, Nova viagem, Painel da viagem e Pesquisa de translado.
- **`blueprint.md`** — o que ainda falta transformar em produto persistido ou em superfície real, principalmente Rotas/Preferida/Comprada no servidor e cascas futuras.
- **`design-spec.md`** — tokens, tipografia, voz, movimento e regras de forma.

Para tokens, leia `tokens.json` (fonte viva) e seu espelho em `../../apps/web/app/globals.css`. Para intenção e invariantes de domínio, leia `../../CONTEXT.md` e `../adr/`.

## Ordem de leitura

1. `design-spec.md` — tokens, tipografia, voz e regras de forma.
2. `as-built.md` — antes de tocar qualquer superfície já implementada.
3. `blueprint.md` — antes de transformar uma casca ou modelo local em produto persistido.
4. `../../CONTEXT.md` — sempre que a tela cruzar dados de domínio (Viagem, Parada, Trajeto, Rota, Trecho, Pesquisa, Preferida, Comprada).

## Regra de edição

- Use token, não literal, para cor, raio, borda, tipografia, sombra e largura nomeada. Literais conscientes são catalogados em `design-spec.md`.
- Se uma divergência entre documento e protótipo redesenhado aparecer em uma tela coberta pelo redesenho, atualize o documento e o código em favor do protótipo.
- Movimento novo documenta `prefers-reduced-motion` junto do componente; CSS Module com animação co-localiza `@keyframes` no mesmo módulo.
- Quando uma peça sair de `blueprint.md` para implementado, mova-a para `as-built.md` no mesmo PR.
