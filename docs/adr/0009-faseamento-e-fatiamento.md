# 0009 — Faseamento outside-in e fatiamento tracer-bullet

**Status:** Aceito

## Contexto

A reconstrução é do zero (reset clean-room). Era preciso decidir **como** materializar a fundação documental (`CONTEXT.md` + ADRs [0001](0001-criterio-e-fronteira-da-v1.md)–[0008](0008-sistema-visual-tema-b-noturno.md) + design Tema B) em software — sem construir tudo de uma vez e sem perder o controle da rota.

## Decisão

**Construir em fases, outside-in, uma fase por vez, com fatias tracer-bullet.**

- **Outside-in:** o visível primeiro (landing → login → painel → criar viagem → paradas/rotas → pesquisa). Navegabilidade e beleza são precondição de adoção ([0001](0001-criterio-e-fronteira-da-v1.md)).
- **Fatia = tracer-bullet vertical** (atravessa schema→API→UI→testes), demoável sozinha. Preferir muitas fatias finas. Cada fatia = uma issue com `phase:N` + milestone da fase.
- **Cadência:** o humano libera o fatiamento da **próxima** fase só depois da atual **entregar**; **dentro** da fase, o agente executa autônomo via `/tdd` (RED→GREEN→refactor), abrindo e mergeando PRs.
- **AFK vs HITL:** fatia AFK = mergeável sem humano; HITL = depende de borda (secret/DNS/decisão). Preferir AFK.
- **Roadmap vivo** em [`../roadmap.md`](../roadmap.md) (o quê/status); este ADR é o porquê.

## Opções consideradas

- **One-shot / big-bang** — rejeitado: sem pontos de validação, rota difícil de corrigir.
- **PRD único antes de fatiar** (`/to-prd`) — rejeitado: ~redundante com `CONTEXT.md` + ADRs + `DESIGN.md`; atrasa software rodando.
- **Fatiar as fases todas de uma vez** — rejeitado: o planejamento também é incremental; fatiar *just-in-time* dobra o aprendizado da fase anterior pra dentro da próxima.

## Consequências

- O backlog cresce por fase, não de uma vez; o `roadmap.md` é o único arquivo a atualizar a cada fase.
- Um agente novo descobre o plano por `CLAUDE.md` → `roadmap.md`, e segue estas regras pra fatiar a próxima fase.
- A Fase 0+1 (fundação + landing) foi a primeira fatiada — issues #172–#176.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md).
