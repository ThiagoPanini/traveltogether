# ADR 0019 — Pesquisa ida-e-volta (multi-trecho) e `Trecho` com modo de transporte

- **Status:** Accepted
- **Data:** 2026-06-16
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [docs/CONTEXT.md](../CONTEXT.md) (termos `Pesquisa de Passagem`, `Trecho`, `Programa de Fidelidade`, `Preferida`/`Comprada`; invariantes 10, 11, 15, 19, 22, 26; boundaries `trips`/`fares`/`budget`). **Emenda** [ADR-0018](0018-rotas-multi-trecho-e-decisao-por-pessoa.md) (cardinalidade `Pesquisa`↔`Trecho`) e **resolve** a "Decisão aberta" de ida-e-volta do CONTEXT.md.

## Contexto

O [ADR-0018](0018-rotas-multi-trecho-e-decisao-por-pessoa.md) modelou a ida (vários **bilhetes** para um caminho: `GRU→MIA` + `MIA→JFK`). Mas o caso real de uso do grupo-beta — a **EUA Trip** — quebra mais duas suposições do modelo de passagem, ambas necessárias para a viagem ser representável:

1. **Um único bilhete pode cobrir mais de um `Trecho`.** Uma passagem de ida-e-volta `GRU↔MIA` (no exemplo, **135.530 milhas LATAM + R$ 242,21** num só PNR) cobre `GRU→MIA` (ida) **e** `MIA→GRU` (volta). Hoje a `FareQuote` ancora **um** `Trecho` e uma direção só. É o **inverso** do multi-trecho do 0018 (vários bilhetes para um caminho × um bilhete para vários caminhos).
2. **Parte da viagem é por terra.** `Miami→Orlando` e `Orlando→Miami` são de carro alugado, sem tarifa aérea. Hoje `Trecho` é, por definição, "perna de **voo** aeroporto→aeroporto" — não há como representar a perna terrestre. E sem ela a perna **aérea** de volta (`MIA→GRU`) fica órfã: o `Trajeto` de retorno parte de Orlando, não de Miami.

### Exemplo trabalhado (teste de aceitação) — EUA Trip de `panini.multi@gmail.com`

`Origem`: São Paulo (GRU/VCP). `Parada`s: Nova York, Miami, Orlando. Plano do Thiago:

| `Trajeto` (derivado) | `Rota` | `Trecho`s (`modo`) | Preço da passagem |
|---|---|---|---|
| **SP → NY** | "via Miami" | `GRU→MIA` (aéreo) · `MIA→NYC` (aéreo) | ida do bilhete ↓ · doméstico US$ |
| **NY → Miami** | "direto" | `NYC→MIA` (aéreo, só ida) | doméstico US$ |
| **Miami → Orlando** | "de carro" | `MIA→ORL` (**terrestre**) | — (aluguel = `Extra`) |
| **Orlando → SP** | "carro + voo" | `ORL→MIA` (**terrestre**) · `MIA→GRU` (aéreo) | volta do bilhete ↓ |

A passagem de pontos (`135.530 milhas LATAM + R$ 242,21`) é **uma** `Pesquisa` ida-e-volta cobrindo o `Trecho` `GRU→MIA` (de *SP→NY*) **e** o `Trecho` `MIA→GRU` (de *Orlando→SP*) — dois `Trecho`s em dois `Trajeto`s. Marcá-la `Preferida` resolve a `Preferida` dos dois de uma vez, e ela entra no `Orçamento` **uma única vez**.

## Decisão

- **Uma `Pesquisa de Passagem` cobre um ou mais `Trecho`s aéreos.** O caso comum é um (só-ida); um bilhete de ida-e-volta cobre dois (ida + volta), possivelmente em `Trajeto`s distintos. O preço é o do bilhete **inteiro** (par de dinheiro e/ou par de pontos — ver [ADR-0018] e a extensão do invariante 15 para pontos); a `Preferida`/`Comprada` é **uma** e satisfaz **todos** os `Trecho`s cobertos. **Não se divide o preço pela metade** entre ida e volta.
- **`Trecho` ganha um `modo`: `aéreo` ou `terrestre`.** Só o `aéreo` hospeda `Pesquisa`/`Upvote`/`Preferida`. O `terrestre` (carro/ônibus) é conector estrutural sem tarifa; o custo (ex.: aluguel) vira um `Extra` do `Orçamento`, não uma `Pesquisa`. Uma `Rota` pode misturar modos.
- **Ponto de conexão é transferência, não estadia** (refina o invariante 22). A cidade de baldeação pode coincidir com uma `Parada` visitada noutro momento (voltar por Miami no fim) — o que a `Rota` não faz é absorver as `Parada`s que ficam **entre** seus dois extremos na sequência.

## Justificativa

- **O bilhete é a unidade de compra.** Um ida-e-volta é uma compra só, com um preço e um "comprei". Modelar como **uma** `Pesquisa` sobre dois `Trecho`s diz a verdade; dois registros de meia-tarifa seriam ficção (preço não é simétrico, ainda menos em pontos), divergiriam ao editar e dariam uma `Comprada` incoerente.
- **A volta fica coberta por vínculo, não por cópia.** Atende à intuição ("registrei o ida-e-volta, a volta está resolvida") sem duplicar dado nem inventar metade de preço.
- **Honestidade do diagrama.** Sem o `modo` terrestre, a rota mentiria (sumiria o trecho de carro) e a perna aérea de volta não teria onde ancorar. Um flag é a mudança mínima que mantém o invariante 22 e o `Orçamento` corretos.

## Consequências

- **Migração aditiva.** `Trecho` ganha `mode` (default `air`, preenchendo o legado). A relação `Pesquisa`↔`Trecho` deixa de ser FK única (`segment_id` do ADR-0018) e passa a ser **tabela de ligação** (`fare_quote_segments`); cada `FareQuote` legada vira uma linha de ligação para o seu único `Trecho`. Espelhar em `packages/types`; registrar em `alembic/env.py`.
- **Comparação no `Trecho`:** o board de um `Trecho` aéreo passa a poder exibir tanto `Pesquisa`s só-ida quanto uma ida-e-volta (com selo "ida-e-volta" e o preço **total** do bilhete — não comparável célula-a-célula com uma só-ida; cabe ao leitor ponderar).
- **`Orçamento`:** ao somar as `Preferida`s/`Comprada`s por pessoa, uma `Pesquisa` multi-trecho conta **uma vez** (invariante 19), nunca uma vez por `Trecho` — senão o ida-e-volta dobraria.
- **DESIGN.md:** construtor de `Rota` ganha `Trecho`s terrestres (sem board de tarifa); board de `Pesquisa`s ganha o selo ida-e-volta; `RouteLine` distingue perna terrestre de aérea.

## Opções rejeitadas

- **Auto-dividir o ida-e-volta em duas `Pesquisa`s de meia tarifa:** ficção de preço, duplicação que diverge, `Comprada` incoerente (compra-se um bilhete, não duas metades). Recusado.
- **Registrar só na ida, volta como metadado (sem aparecer no board da volta):** um registro só, mas assimétrico — quem olha o `Trecho` de volta não vê a passagem. Recusado.
- **`Trecho` terrestre como entidade separada (`Translado`/`Transfer`):** mais explícito, mas é outro modelo/UI inteiro para um beta; um `modo` no `Trecho` resolve com muito menos. Recusado por peso.
- **Não modelar o terrestre (deixar o `Trajeto` vazio):** quebra o invariante 22 e deixa a perna aérea de volta órfã. Recusado.
