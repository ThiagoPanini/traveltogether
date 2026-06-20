# 0005 — Sem conversão entre dinheiro e pontos

**Status:** Aceito

## Contexto

Cotações vêm em unidades diferentes: reais, dólares, ou **pontos/milhas** de programas distintos. A tentação é converter tudo para uma moeda-base (ou atribuir um "valor da milha") para dizer qual é "a mais barata".

## Decisão

**Não há conversão entre unidades.**

- Cada cotação fica na **unidade nativa** (R$, US$, ou pontos + programa).
- Comparação é **visual**, dentro da mesma unidade. O app **não computa** "a mais barata" cruzando unidades.
- Pontos de programas distintos não se somam nem viram dinheiro.
- **Dinheiro e pontos aparecem lado a lado, separados, só na Pesquisa de translado — nunca no Painel.**

## Opções consideradas

- **Moeda-base / "valor da milha"** — rejeitado: inventa uma verdade que não existe (o valor da milha é pessoal e volátil) e empurra uma decisão que é do dono (ver [0004](0004-decisao-por-pessoa.md)).

## Consequências

- A UI trata dinheiro e pontos como **dimensões separadas**.
- "Preço só vive na Pesquisa" é regra de **domínio** e de **UI** (princípio inquebrável do pack visual — ver [0008](0008-sistema-visual-tema-b-noturno.md)).

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md) (invariante 5).
