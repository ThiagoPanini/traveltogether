# 0004 — Decisão por-pessoa (Preferida → Comprada), sem eleição de grupo

**Status:** Aceito

## Contexto

Quando o grupo compara rotas/cotações, como se "decide"? A tentação é votar e ter uma rota "escolhida" pelo grupo. Mas no translado aéreo cada um parte de um lugar (multi-origem), paga com a sua grana **ou as suas milhas** (pessoais, intransferíveis) e compra a sua passagem.

## Decisão

**Compartilhar é coletivo; decidir é individual.**

- Cada Usuário marca, por Trecho aéreo, no máximo uma **Preferida**, e depois **Comprada** (fluxo `Preferida → Comprada`).
- **Não há voto nem eleição de grupo.** Não existe rota "escolhida" pelo grupo.
- **Prova social = decisões pessoais visíveis** — você vê a minha Preferida/Comprada, eu vejo a sua.

## Opções consideradas

- **Votação / eleição de grupo** — rejeitado. O app **alinha, não vende**; não cabe a ele escolher pelos outros, e origens/milhas pessoais quebram a premissa de uma escolha única. (O **protótipo de design** trazia "2 votos", "votou/falta votar" e rota "escolhida" — ver [0008](0008-sistema-visual-tema-b-noturno.md): será **reescrito** para linguagem por-pessoa.)

## Consequências

- **Rota adotada** é **derivada por-pessoa** das Preferidas — não é entidade persistida.
- O Painel pode **agregar** preferências como visão ("2 de 4 já preferem a direta"), mas a contagem **não decide** por ninguém.
- O Painel do protótipo precisa de reescrita de copy: `votos → já preferem`, status da tripulação → estado de decisão de cada um, `escolhida → preferida de fulano`.

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md) (invariante 4).
