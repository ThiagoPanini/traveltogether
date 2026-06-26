# 0001 — Critério e fronteira da v1

**Status:** Aceito · **emendado por [ADR-0009](0009-translado-multimodal.md)** (o "lugar profundo" deixa de ser só-aéreo e passa a translado multi-modal) **e [ADR-0010](0010-mapa-esquematico-vetorial.md)** (geografia estilizada vetorial entra na criação; mapa real segue fora)

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
- A escolha das 3 cascas segue acoplamento ao núcleo (ver [`docs/design/README.md`](../design/README.md) e a discussão de Orçamento como degrau pós-MVP).

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md).
