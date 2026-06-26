# 0010 — Mapa esquemático vetorial na criação (geografia estilizada, sem tiles)

**Status:** Aceito · emenda o [ADR-0001](0001-criterio-e-fronteira-da-v1.md)

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
