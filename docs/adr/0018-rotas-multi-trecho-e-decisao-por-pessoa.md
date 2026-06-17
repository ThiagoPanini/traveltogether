# ADR 0018 — Rotas multi-trecho e decisão de passagem por-pessoa

- **Status:** Accepted *(a cardinalidade `Pesquisa`↔`Trecho` — aqui "uma `Pesquisa` por `Trecho`" — foi ampliada pelo [ADR-0019](0019-pesquisa-multi-trecho-e-modo-de-transporte.md): uma `Pesquisa` ida-e-volta cobre vários `Trecho`s, e o `Trecho` ganhou `modo` aéreo/terrestre. O resto permanece.)*
- **Data:** 2026-06-16
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [docs/CONTEXT.md](../CONTEXT.md) (termos `Trajeto`, `Rota`, `Trecho`, `Pesquisa de Passagem`, `Preferida`, `Comprada`; invariantes 3, 8–14, 22–25; boundaries `trips`/`fares`/`budget`). **Supersede** [ADR-0004](0004-modelo-de-itinerario-e-ancoragem-da-pesquisa.md) (ancoramento da Pesquisa) e [ADR-0009](0009-aeroporto-de-referencia-na-origem-e-paradas.md) (Aeroporto de Referência); **emenda** [ADR-0010](0010-trajetos-derivados-das-paradas.md), o orçamento do [ADR-0016](0016-orcamento-sem-conversao-de-cambio.md) e os tipos de notificação do [ADR-0017](0017-notificacoes-persistidas-sem-barramento.md) (remove `decision`).

## Contexto

Dois fatos reais do grupo-beta quebram o modelo do MVP:

1. **A forma de vencer um `Trajeto` pode ser uma cadeia de bilhetes separados.** Para "chegar em NY" (`SP→NY`), em vez do voo direto caríssimo, o grupo compra `GRU→MIA` (internacional barato) **+** `MIA→JFK` (doméstico) — **dois bilhetes distintos**, não uma escala num PNR só. O custo do caminho é a **soma**. O ADR-0004 só permitia uma `Pesquisa` por `Trajeto` (direto), e a "Decisão aberta" de multi-trecho cobria o **inverso** (uma `Pesquisa` cobrindo vários `Trajeto`s — ida-e-volta). Nenhum dos dois resolvia este caso.
2. **Nem todos viajam pelo mesmo voo.** Alguém usa pontos noutra companhia e vai por outro caminho. A convergência coletiva (`Escolhida` única por `Trajeto`) é uma ficção: a decisão é, na prática, **de cada pessoa**.

O `Aeroporto de Referência` (ADR-0009) agravava o problema: desenhar um código por nó (GRU em "São Paulo") **mente** quando as pessoas divergem de aeroporto/caminho.

## Decisão

- **Modelo de 4 níveis** entre o itinerário e a tarifa:
  `Trajeto` (objetivo cidade→cidade, **derivado** das `Parada`s) → `Rota` (caminho candidato **autorado**, ordered) → `Trecho` (perna de voo aeroporto→aeroporto; **nova unidade de comparação**) → `Pesquisa de Passagem` (tarifa, reancorada de `Trajeto` para `Trecho`).
- **Decisão por-pessoa, sem eleição coletiva.** Cada `Usuário` marca no máximo uma `Pesquisa` como `Preferida` por `Trecho` (a passagem que *ele* vai usar) e informa `Comprada`. A `Escolhida` de grupo é **aposentada**. A `Rota` que a pessoa adota é **derivada** das suas `Preferida`s (não é entidade persistida).
- **Aeroportos saem dos nós-cidade.** `Origem`/`Parada` são cidades; todo código de aeroporto vive no `Trecho`/`Pesquisa`. A `RouteLine` passa a ter dois registros: **esqueleto de cidade** (compartilhado) e **rota real por-pessoa** (com split-flap dos `Trecho`s reais). O `Aeroporto de Referência` é removido do domínio.
- **Gate de escrita por camada** (reescreve a invariante 13): backbone (`Parada`s/datas/`Origem`/`Item de Roteiro`) = `Organizador`; exploração (`Rota`/`Trecho`/`Pesquisa`) = qualquer `Membro`; plano pessoal (`Preferida`/`Comprada`) = só o dono. Moderação de `Pesquisa` segue o `Comentário`: autor edita/apaga a sua, `Organizador` apaga qualquer uma.
- **`Trajeto` continua derivado** das `Parada`s (ADR-0010 sobrevive); a editabilidade vive nas `Rota`s. "Fechamento" da viagem é **derivado** (todas as `Preferida`s de uma pessoa viram `Comprada`s); prune = descartar `Rota` sem nenhuma `Preferida`.

## Justificativa

- **Escala (parada técnica num bilhete) ≠ Trecho (bilhete separado):** o campo `escalas` da `Pesquisa` resolve a primeira; o segundo exige estrutura. O `Trecho` herda o papel de comparação que era do `Trajeto` (várias `Pesquisa`s + `Upvote`), só que um nível abaixo.
- **Por-pessoa é a verdade do grupo:** modela como eles já viajam (pontos, companhias, aeroportos diferentes) e dá um `Orçamento` por-pessoa honesto, sem fingir um voo único.
- **Grafo limitado, não livre:** uma `Rota` nasce e morre nos dois extremos de um `Trajeto` (invariante 22). Sair de GRU ou VCP é só outra `Rota` — topologia previsível, UI montável, prune trivial. Evita o editor de grafo arbitrário (rejeitado).

## Consequências

- **Migração aditiva** (dados de beta, perda aceitável): cada `Leg` vira um `Trajeto` com **uma** `Rota` "direta" de **um** `Trecho`; as `FareQuote`s existentes reancoram nesse `Trecho`. O `is_chosen` de grupo é descartado (não há equivalente coletivo).
- **`fares`** ganha `Preferida`/`Comprada` (por `Usuário`×`Trecho`); `FareQuote.leg_id` → `segment_id`. **`trips`** ganha `Route`/`Segment`. Registrar em `alembic/env.py` e espelhar em `packages/types` no mesmo PR.
- **Hops idênticos em `Rota`s distintas não se compartilham:** pelo invariante 22, dois caminhos que cruzam o mesmo aeroporto de conexão (ex.: duas `Rota`s via Miami) têm `Trecho`s `GRU→MIA` **separados** — a pesquisa de tarifa não é reaproveitada entre eles. Consequência aceita (cada `Rota` é autocontida e o prune é trivial); a justificativa "o `Trecho` evita duplicar a `Rota`" vale *dentro* de uma `Rota`, não *entre* `Rota`s.
- **Remoção de `Rota`/`Trecho`** segue a disciplina de moderação (invariante 25): autor remove a própria enquanto vazia de conteúdo de terceiros; o prune destrutivo (incl. `Rota` sem `Preferida`) é de `Organizador`.
- **Orçamento (ADR-0016)** passa a somar as passagens **`Preferida`s/`Comprada`s por pessoa** (não mais a `Escolhida` de grupo); o resto do ADR-0016 (sem câmbio, subtotais por moeda) permanece.
- **Notificações:** o tipo `decision` (atrelado à `Escolhida` de grupo) é removido; sobram `invite`/`task`/`mention` (ADR-0017).
- **DESIGN.md:** o board de passagens deixa de ter o *stamp* de `Escolhida` de grupo; ganha marcação pessoal `Preferida`/`Comprada` e comparação no nível do `Trecho`; o split-flap migra do nó-cidade para o `Trecho`.

## Opções rejeitadas

- **Grafo de rotas livre (nós-aeroporto compartilháveis, topologia arbitrária):** poder demais, peso de modelo/UI e "labirinto" que o próprio dono não quer manter. Recusado em favor de `Rota`s limitadas por `Trajeto`.
- **Manter a eleição de grupo (`Escolhida` única):** contradiz o split real de pessoas (pontos/companhias) e força um orçamento ficcional.
- **`Rota` = plano concreto (lista de `Pesquisa`s, sem `Trecho`):** não acomoda `Pesquisa`s concorrentes por hop (duas tarifas `GRU→MIA` de pessoas diferentes) sem duplicar a `Rota`. O `Trecho` como nível próprio evita isso.
- **Uma `Pesquisa` cobrindo vários `Trajeto`s desde já (ida-e-volta):** é o problema **inverso**; permanece "Decisão aberta" no CONTEXT.md, disparável depois com migração aditiva.
