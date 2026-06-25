# 0003 — Faseamento outside-in e fatiamento tracer-bullet

**Status:** Aceito

## Contexto

A reconstrução é do zero (reset clean-room). Era preciso decidir **como** materializar a fundação documental (`CONTEXT.md` + ADRs [0001](0001-criterio-e-fronteira-da-v1.md)–[0006](0006-apostas-de-dominio.md) + design Noturno) em software — sem construir tudo de uma vez e sem perder o controle da rota.

## Decisão

**Construir em fases, outside-in, uma fase por vez, com fatias tracer-bullet.**

- **Outside-in:** o visível primeiro (landing → login → painel → criar viagem → paradas/rotas → pesquisa). Navegabilidade e beleza são precondição de adoção ([0001](0001-criterio-e-fronteira-da-v1.md)).
- **Fatia = tracer-bullet vertical** (atravessa schema→API→UI→testes), demoável sozinha. Preferir muitas fatias finas. Cada fatia = uma issue com `phase:N` + milestone da fase.
- **Cadência:** o humano libera o fatiamento da **próxima** fase só depois da atual **entregar**; **dentro** da fase, o agente executa autônomo via `/tdd` (RED→GREEN→refactor), abrindo e mergeando PRs.
- **AFK vs HITL:** a fronteira do que o agente faz sozinho é de **capacidade/acesso, não de reversibilidade** — definida no [0007](0007-autonomia-total-do-agente.md) (os 4 casos). AFK é a norma; HITL = cair num dos 4 casos (segredo de terceiro, lock-out/acesso, recriar substrato, tocar outro projeto). DNS, deploy e segredo auto-gerável são AFK.
- **Mapa/status vivo** em **GitHub milestones + label `phase:N`** (o quê/status); este ADR é o porquê.

## Opções consideradas

- **One-shot / big-bang** — rejeitado: sem pontos de validação, rota difícil de corrigir.
- **PRD único antes de fatiar** (`/to-prd`) — rejeitado: ~redundante com `CONTEXT.md` + ADRs + `docs/design/`; atrasa software rodando.
- **Fatiar as fases todas de uma vez** — rejeitado: o planejamento também é incremental; fatiar *just-in-time* dobra o aprendizado da fase anterior pra dentro da próxima.

## Consequências

- O backlog cresce por fase, não de uma vez; o mapa/status vive em GitHub milestones + label `phase:N`, atualizado a cada fase.
- Um agente novo descobre o plano por `CLAUDE.md` → milestones, e segue estas regras pra fatiar a próxima fase.
- A Fase 0+1 (fundação + landing) foi a primeira fatiada — issues #172–#176.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md); fronteira de autonomia em [0007](0007-autonomia-total-do-agente.md).
