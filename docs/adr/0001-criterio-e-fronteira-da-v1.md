# 0001 — Critério e fronteira da v1

**Status:** Aceito

## Contexto

Reinício do projeto do zero. Precisávamos de um critério afiado para decidir o que entra na v1, sem cair em "cobrir tudo raso" (vira demo sem alma) nem em "só o motor, sem casca" (sem adoção). Princípio que o Thiago cravou: *"se a fundação não for navegável e bonita, então a adoção não irá existir."*

## Decisão

A v1 é **profunda num único lugar — a pesquisa de translado aéreo — e casca honesta e polida no resto.**

- **Critério de inclusão:** serve ao uso real (compartilhar e decidir o translado, à la *EUA Trip*) **e** toda superfície que aparece é caprichada.
- **"Em breve" só DENTRO de uma Viagem:** Roteiro, Orçamento, Ingressos. Nunca no menu global.
- **Menu global 100% funcional, zero "em breve" no topo.**
- **Ausentes de vez na v1** (nem placeholder): Tarefas, Hospedagem, Mapa real, Documentos, comentários/chat.

## Opções consideradas

- **Cobrir todas as features raso** — rejeitado: dilui o esforço, nada fica bom, cheira a vaporware.
- **Só o translado, sem casca navegável** — rejeitado: navegabilidade e beleza são precondição de adoção, não acabamento.

## Consequências

- A barra dentro da viagem mostra **Painel + 3 cascas** (Roteiro · Orçamento · Ingressos), que contam o roadmap honesto: *decidir o translado → acertar contas → planejar os dias*.
- O app não promete no topo o que não entrega.
- A escolha das 3 cascas segue acoplamento ao núcleo (ver [0008](0008-sistema-visual-tema-b-noturno.md) e a discussão de Orçamento como degrau pós-MVP).

## Nota — "em breve" durante o build-out (2026-06-23)

A regra acima mira o **produto v1 acabado**: nada de menu/grade global prometendo features **não-v1** (Tarefas, Hospedagem, Mapa…). Ela **não** proíbe sinalizar, durante o faseamento, uma feature **v1 já comprometida** que ainda não foi construída.

Caso concreto (Fase 2): com login **aberto**, o usuário aterrissa numa **home empty-state** antes de *Criar Viagem* existir (Fase 4). É honesto a home dizer **uma linha** — "criar viagem está chegando" — porque é feature v1 em obras, não vaporware. O sinal é **temporário** e some quando a feature aterrissa. O que continua proibido é virar isso num **menu global de "em breve"** (o componente `em-breve-card` já carrega essa invariante: só dentro de uma Viagem). Topologia do login em [0011](0011-topologia-de-autenticacao.md).

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md).
