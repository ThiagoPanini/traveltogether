# 0006 — Apostas de domínio

**Status:** Aceito

## Contexto

Duas decisões do núcleo definem **o que o app é** quando o grupo compara passagens — e, por contraste, o que ele se recusa a ser. Ambas resistem à mesma tentação de produto: deixar o software **decidir pelas pessoas**.

1. **Como o grupo "decide"?** A tentação é votar e cravar uma rota "escolhida" pelo grupo. Mas no translado aéreo cada um parte de um lugar (multi-origem) e paga com a sua grana **ou as suas milhas** (pessoais, intransferíveis).
2. **Como comparar cotações em unidades diferentes?** Reais, dólares, pontos/milhas de programas distintos. A tentação é converter tudo para uma moeda-base (ou atribuir um "valor da milha") para apontar "a mais barata".

## Decisão

**O app alinha, não vende.** Ele expõe a informação e torna as escolhas alheias visíveis, mas a decisão e o juízo de valor são sempre do dono.

- **Decidir é individual; compartilhar é coletivo.** Cada Usuário marca, por Trecho aéreo, sua **Preferida** e depois a **Comprada** (`Preferida → Comprada`); a prova social vem de essas decisões pessoais ficarem visíveis. **Não há voto nem rota eleita pelo grupo.**
- **Não há conversão entre unidades.** Cada cotação vive na unidade nativa; a comparação é **visual**, dentro da mesma unidade. O app **não** computa "a mais barata" cruzando unidades, e dinheiro e pontos só aparecem lado a lado **na Pesquisa de translado** — nunca no Painel. "Preço só na Pesquisa" é regra de **domínio** e de **UI**.

## Opções consideradas

- **Votação / eleição de grupo** — rejeitado. O app **alinha, não vende**: não cabe a ele escolher pelos outros, e origens/milhas pessoais quebram a premissa de uma escolha única. A "rota adotada" é, no máximo, **derivada por-pessoa** das Preferidas — não entidade persistida; o Painel pode agregar como visão ("2 de 4 já preferem a direta"), mas a contagem **não decide** por ninguém.
- **Moeda-base / "valor da milha"** — rejeitado. Inventa uma verdade que não existe (o valor da milha é pessoal e volátil) e empurra uma decisão que é do dono. Pontos de programas distintos não se somam nem viram dinheiro.

## Consequências

- A UI trata dinheiro e pontos como **dimensões separadas** e nunca exibe um vencedor cruzando unidades.
- Não existe entidade "rota escolhida"; agregações de preferência são leitura, não comando.
- Qualquer copy/feature que sugira voto, eleição, "a mais barata" global ou conversão de unidade viola estas apostas e é bug.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md) (invariantes 4 e 5).
