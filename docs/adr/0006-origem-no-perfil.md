# 0006 — Origem no Perfil do Usuário (multi-origem)

**Status:** Aceito

## Contexto

De onde o grupo parte? Na *EUA Trip* todos saem de São Paulo, o que tentaria modelar a origem como um campo único da Viagem. Mas grupos reais se juntam de cidades diferentes, e a origem influencia diretamente as rotas que cada um pesquisa.

## Decisão

**A origem (país + cidade) é do Perfil do Usuário, não da Viagem.**

- É o **default editável** da partida das Rotas que o Usuário cria.
- A **Viagem** é só **destino + Paradas + membros** — não tem origem própria.

## Opções consideradas

- **Origem única na Viagem** — rejeitado: overfit ao caso "todos de SP"; não escala para um grupo multi-cidade.

## Consequências

- **Trajetos de ponta** (casa ↔ Parada) **agrupam por origem** de cada pessoa; **Trajetos do meio** (Parada ↔ Parada) são **compartilhados** por todos.
- Onboarding obrigatório captura **nome + país + cidade** (ver [0007](0007-papeis-camadas-e-convite.md)).
- Na *EUA Trip* todos de SP → na prática tudo compartilhado, mas o modelo já escala.

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md) (invariante 6).
