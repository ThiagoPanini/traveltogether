# 0002 — Estrutura do translado

**Status:** Aceito

## Contexto

O coração do produto é organizar como o grupo se desloca entre cidades. O caso real exige distinguir um voo **direto** de uma alternativa **via outra cidade** (ex.: chegar a NY direto `SP→NY` ou via Miami `SP→MIA→NY`, que são dois voos/duas compras). Uma lista plana de voos não modela isso.

## Decisão

Hierarquia:

**Viagem → Parada → Trajeto → Rota → Trecho → Pesquisa**

- **Parada** = cidade de estadia; a **última Parada é o destino** (derivado).
- **Trajeto** = o salto a vencer entre duas Paradas consecutivas (e casa↔ponta). **Derivado** da ordem das Paradas + origem.
- **Rota** = um caminho candidato que realiza um Trajeto: **sequência ordenada de Trechos**. Duas Rotas com as mesmas pontas são alternativas a comparar.
- **Trecho** = cada pulo de uma Rota (compra à parte), com um **Modo**.
- **Multi-pulo vale na v1** — o direto-vs-via-Miami é o que dá razão de existir ao produto.

## Opções consideradas

- **Lista plana de voos sem multi-pulo** — rejeitado: não representa o caso central (rota alternativa que exige 2 voos).

## Consequências

- Precisa de um **construtor de Rota** (montar a sequência de Trechos).
- **Rota e Trecho vivem na camada de exploração** — qualquer Membro cria (ver [0007](0007-papeis-camadas-e-convite.md)).
- **Aeroporto (IATA) vive no Trecho/Pesquisa, nunca na Parada** (a Parada é cidade). "Miami como Parada" (estadia) ≠ "Miami como ponto-médio de uma Rota via-Miami" (o extremo entre dois Trechos).

Detalhe da Pesquisa e do Modo em [0003](0003-pesquisa-multitrecho-e-modo.md). Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md).
