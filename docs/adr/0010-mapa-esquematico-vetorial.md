# 0010 — Mapa esquemático vetorial na criação (geografia estilizada, sem tiles)

**Status:** Aceito · **implementado** (PR do mapa, fecha #226) · **emenda 2 — port fiel do controller (jornada aprimorada)** · emenda o [ADR-0001](0001-criterio-e-fronteira-da-v1.md)

## Contexto

O [ADR-0001](0001-criterio-e-fronteira-da-v1.md) pôs o **mapa real** entre os ausentes-de-vez da v1 (nem placeholder), e o sistema Noturno nasceu **geografia-zero** — o "flight map" é grid pontilhado abstrato. Ao desenhar a **criação de viagem**, o passo de **destino** pede um momento geográfico: escolher o país e ver o mapa **dar zoom no país, contornar a fronteira** e **marcar a cidade**. Um mapa real (tiles slippy — Mapbox/Google/Leaflet+OSM) resolveria, mas é justamente o que o 0001 vetou, pelos motivos certos: trai a pele Noturno (cara de Google genérico), pesa, sugere precisão/rotas/POIs que o app não tem e **exige token de terceiro** (secret + custo recorrente). O ponto: a necessidade (zoom + contorno + marcador, em nível de cidade) **não precisa de tiles**.

## Decisão

A criação usa um **mapa esquemático vetorial** — não um mapa real:

- **Polígonos de país via GeoJSON estático** (ativo no bundle, sob demanda na etapa), na paleta Noturno: fundo escuro, países muted, **borda do país selecionado em terracota tracejada**, com **animação de zoom até a bounding-box** do país. Default (nada escolhido) = **globo inteiro**.
- **Cidade = marcador** no `lat/long` (que o combobox de cidade via GeoNames já fornece), com pulse sutil e label-pill. Cidade não tem polígono — o marcador é o "mesmo efeito" honesto.
- **Sem tiles, sem API externa de mapa, sem secret.** Zero ruas/POIs/roteamento — **não é "mapa real"** no sentido do 0001.
- A **régua de polimento do 0001 continua valendo** (*tudo que aparece é caprichado*): um mapa meia-boca seria **pior que nenhum**, então a regra é **"faz bem-feito ou adia"**. Por isso o mapa é o **elemento mais cortável** da fatia — o combobox país→cidade se sustenta sozinho; o mapa é o luxo que entra quando dá pra fazer no padrão Noturno.

## Opções consideradas

- **Mapa real (tiles slippy)** — rejeitado: reintroduz o que o 0001 vetou (secret/custo, peso, cara genérica, falsa precisão de rotas/POIs).
- **Nenhum mapa (status quo geografia-zero)** — rejeitado: aderente ao 0001, mas entrega menos que a visão de sucesso do destino; o momento geográfico é parte do "navegável e bonito".
- **Mapa esquemático vetorial** — aceito: dá o zoom+contorno+marcador sem tile/secret/custo e cabe na pele Noturno.

## Consequências

- **Emenda o [ADR-0001](0001-criterio-e-fronteira-da-v1.md):** geografia **estilizada** passa a ser admitida (na criação); **"mapa real" segue fora de vez**. O critério do 0001 (um lugar profundo + cascas honestas, tudo caprichado) fica intacto — só se admite uma forma de geografia antes lida como banida.
- Reusa o `lat/long` do GeoNames já capturado no combobox (#215/#220) — sem nova dependência de dados.
- O **mesmo componente pode ancorar o grafo de paradas** (passos 2–4) — paradas como marcadores, trajetos como arcos — e, no futuro, a exibição da viagem. (A forma do grafo é decisão à parte.)
- Ativo GeoJSON no bundle (simplificado, lazy na etapa) — peso aceitável; cortável junto com o mapa se a fatia pesar.

Prototipado e validado pelo dono (passo 01 · destino). Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md); critério da v1 em [ADR-0001](0001-criterio-e-fronteira-da-v1.md).

## Emenda — implementação (PR do mapa, fecha #226)

O mapa saiu do papel no overhaul visual da criação. O **mecanismo** ficou em **jsVectorMap** (1.7, world map vetorial pronto), e não em GeoJSON desenhado à mão — mas a decisão acima é honrada à risca: polígonos de país vetoriais, **sem tiles, sem API externa, sem secret, sem custo**, na paleta Noturno (terra `--line-muted`, mar `--bg-canvas`, marcadores `--accent`). Notas da realização:

- **Costura library-agnostic `<RouteMap>`** (`focus` país/coords/escala · `nodes` · `edges` · `fallback`). A UI fala nesse contrato; jsVectorMap fica isolado atrás dele e pode ser trocado (Fase 5: endpoint `/geo`) sem tocar os passos.
- **Carregamento client-only**: a lib + o mapa-mundi + o CSS entram por `import()` dinâmico **dentro do effect**, só quando o container tem layout (`clientWidth > 0`) — em SSR e em jsdom isso é 0, então nada da lib é baixado ali. Vira **lazy chunk** (~34 KB lib + ~100 KB world), buscado só quando há cidade com coords. Falha de carga → fallback.
- **Fallback honesto = a rota vertical** (origem → paradas → destino, com ícone de modo por salto). É o que aparece sem coords, em SSR/jsdom, ou se a lib falhar — nunca uma moldura de mapa vazia.
- **Coords são client-only (reforça o [ADR-0011](0011-modelo-de-dados-criacao-de-viagem.md)):** os 23 recortes `lib/geo/data/*.json` foram regerados do GeoNames `cities15000` com `lat`/`lng`/`population` (script versionado `apps/web/scripts/build-cities.mjs`, top-80 por população/país). `lat`/`lng` entram no `StopDraft` mas **nunca** em `draftToPayload` — teste de contrato garante.
- **Foco**: uma cidade plotada → zoom na coordenada (escala ~5); várias → mundo inteiro (mostra todos os marcadores). A **origem vem do Perfil como texto, sem coords** → não é plotada (nada de coordenada falsa); aparece só no fallback.
- **Adiado de propósito** (cabe no "faz bem-feito ou adia"): realce **tracejado-terracota da fronteira** do país selecionado e **pulse** do marcador. O foco-zoom + marcadores + arcos de rota entregam o momento geográfico no padrão Noturno; o realce de região fica para um polimento futuro.

## Emenda 2 — port fiel do controller (aprimoramento da jornada)

A exploração assídua da versão implementada expôs que a impl **driftou da decisão original** ("globo no default", acima): a Emenda 1 fez o **fallback vertical virar o estado-vazio** (apareceu o "grafo vertical" ao entrar no passo 1) e **adiou contorno + pulse**. O dono fechou que a coreografia **país → zoom → contornar fronteira → cidade → pino** é **inegociável** e é o contrato do protótipo (`.claude/design/travelmanager-jornada-de-criacao-de-viagem`). Os adiamentos saem do papel e o modelo da costura muda:

- **Globo no default, sempre.** O mapa monta desde a entrada do passo 1 (mundo inteiro), realinhando com a decisão original. A rota vertical deixa de ser o estado-vazio e vira **só** o fallback honesto (SSR/jsdom/falha de carga).
- **Contorno e pino saem do adiamento.** Fronteira do país selecionado em **tracejado-terracota marching-ants** (`outlineCountry` via classe CSS) e **pinos HTML sobrepostos** (tag da cidade + cabeça com gradiente + haste), posicionados por `coordsToPoint` + sync RAF durante o zoom — substituem o marcador nativo `r:5`.
- **Modelo: instância persistente + foco imperativo animado** (`focusCountry`/`focusCity`), no lugar do *rebuild-on-signature* (que destruía/recriava o mapa a cada mudança e era incompatível com animação de foco). **A costura `<RouteMap>` mantém o contrato** (`focus`/`nodes`/`edges`/`fallback`) — só as tripas viram o controller já provado do protótipo (`Criar Viagem.dc.html`, ~166-262). A troca pro `/geo` da Fase 5 segue de pé.
- **Altura fixa por token.** O painel do mapa recebe altura fixa calibrada pra que, no passo 1 com o card de destino preenchido, o rodapé do mapa bata com o do card; **a mesma altura vale no passo 2** (não estica como no protótipo — decisão do dono; a lista de paradas pode ultrapassar o mapa pra baixo, sem exigir alinhamento).
- **Origem por geocodificação best-effort.** Como a origem é texto livre do Perfil (sem coords — inv. 6), pra plotar o pino verde de origem (passo 2+) faço lookup de `origin_city` no dataset GeoNames, estreitado pelo país do Perfil. Casou → pino; não casou → origem fora do mapa. **Lookup client-side, nunca persiste, nunca no payload** — reforça inv. 6 e o [ADR-0011](0011-modelo-de-dados-criacao-de-viagem.md).

A régua "faz bem-feito ou adia" do [ADR-0001](0001-criterio-e-fronteira-da-v1.md) segue intacta — aqui é o "faz bem-feito" **chegando**: o adiado de propósito virou feito, no padrão Noturno.
