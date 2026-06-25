# Fluxo de desenvolvimento

O regime default deste repo — **não precisa ser reafirmado a cada sessão**. Resume a doutrina de autonomia ([ADR-0007](../adr/0007-autonomia-total-do-agente.md)) e o pipeline grill → issues → tdd.

## Autonomia (resumo)

O agente opera com **autonomia total sobre tudo que é escopo do projeto** — implementa, faz deploy/redeploy, mexe em env, gera segredo que a máquina gera, roda migration, cria/dropa recurso próprio no Coolify e **mergeia PR verde**. Faz sozinho, sem reafirmar autonomia a cada vez.

**Pare e chame o operador em exatamente 4 casos:** (1) te trancaria pra fora (acesso/root/painel/firewall, ou rotacionar o token do próprio MCP); (2) recriaria o substrato (destruir/recriar a VM); (3) exige segredo de terceiro que você não tem como ser (`GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, client_secret de OAuth, API key paga); (4) tocaria outro projeto no Coolify compartilhado. **Na dúvida sobre cair num dos quatro, pare; fora deles, faça.** Premissa e gatilhos de reabertura no [ADR-0007](../adr/0007-autonomia-total-do-agente.md).

## O fluxo

1. **`/grill-with-docs`** (ou `/grill-me`) — alinhe o plano e atualize `CONTEXT.md`/ADRs onde a decisão cristaliza.
2. **`/to-issues`** — fatie o plano em issues tracer-bullet ([ADR-0003](../adr/0003-faseamento-e-fatiamento.md)). Raramente **`/to-prd`** para features grandes, que depois são fatiadas.
3. **`/tdd`** — implemente RED→GREEN→refactor.

## Modo de implementação autônoma

Disparado por **"implementa as issues"** (ou equivalente). O agente está livre para, **sem pedir confirmação**:

1. **Coletar** as issues abertas elegíveis: `status:ready-for-agent`, do milestone da fase corrente, sem `status:blocked`.
2. **Um git worktree por issue** (branch `worktree/**` — a esteira `pr-checks` dispara nessas branches).
3. **`/tdd`** RED→GREEN→refactor; commits em Conventional Commits (subject minúsculo).
4. **Push** → o `pr-checks` roda os gates e, no verde, **abre o PR** automaticamente (job `open-pr`).
5. **Mergear no verde** — o gate verde é a aprovação; não há merge humano.
6. **Encadear** até as issues acabarem, **parando só se o operador pedir** (ex.: para compactar contexto).

A cadência de *fase* permanece de planejamento ([ADR-0003](../adr/0003-faseamento-e-fatiamento.md)): *qual* fase fatiar a seguir é decisão do operador; *dentro* das issues fatiadas, a execução é autônoma.

## Onde as coisas vivem

- Issues e PRDs: GitHub Issues — [`issue-tracker.md`](issue-tracker.md).
- Labels de triagem (incl. `status:ready-for-agent` / `status:hitl`): [`triage-labels.md`](triage-labels.md).
- Glossário + invariantes de domínio: [`../../CONTEXT.md`](../../CONTEXT.md) — como consumir em [`domain.md`](domain.md).
- Portões de CI, comandos e padrões: [`../../CLAUDE.md`](../../CLAUDE.md).
