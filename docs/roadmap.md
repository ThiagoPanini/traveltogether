# Roadmap da reconstrução

Mapa vivo das fases da reconstrução do traveltogether — **fonte-da-verdade do faseamento**. Atualizar o status a cada fase. O *porquê* da estratégia está no [ADR-0009](adr/0009-faseamento-e-fatiamento.md); aqui fica só *o quê* e *onde estamos*.

**Cadência:** uma fase por vez; o humano libera o fatiamento da **próxima** só depois da atual **entregar**. **Dentro** da fase, execução autônoma via `/tdd`. Cada fatia = uma issue com label `phase:N` + milestone da fase.

## Fases

| Fase | Escopo | Status | Issues / Milestone |
|---|---|---|---|
| **0+1** | Fundação técnica + landing no ar | 🚧 fatiada, em execução | #172–#176 · milestone *Fase 0+1 — Fundação* |
| **2** | Login (OTP + Google) + onboarding (nome/origem) | ⬜ a fatiar | — |
| **3** | Shell global (*Minhas Viagens*) + Painel casca | ⬜ a fatiar | — |
| **4** | Criar Viagem (wizard) | ⬜ a fatiar | — |
| **5a** | Paradas (backbone) → Trajetos derivados | ⬜ a fatiar | — |
| **5b** | Rotas / Trechos (exploração) | ⬜ a fatiar | — |
| **6** | Pesquisa de translado + decisão por-pessoa *(o coração)* | ⬜ a fatiar | — |

Convite/aceite ([ADR-0007](adr/0007-papeis-camadas-e-convite.md)) encaixa por volta da 3–4.

Legenda: ✅ entregue · 🚧 em execução · ⬜ a fatiar.

## Notas de fatiamento (provisório, valem até a fase ser fatiada em issues)

- **Fase 3** — "home/painel" são **dois** lugares: shell global *Minhas Viagens* (lacuna de design, [ADR-0008](adr/0008-sistema-visual-tema-b-noturno.md)) ≠ Painel **da Viagem** (nasce casca → enriquece com #4–6).
- **Fase 5** — "paradas e rotas" cruza camadas ([CONTEXT.md](../CONTEXT.md) inv. 1, 9): **Paradas** = backbone (Organizador) → **Trajetos** derivados → **Rotas/Trechos** = exploração (qualquer Membro). Por isso 5a/5b.
- **Fase 6** — depende de Trecho aéreo existir; copy do pack ("votos/escolhida") reescrita para por-pessoa ([ADR-0004](adr/0004-decisao-por-pessoa.md)/[0008](adr/0008-sistema-visual-tema-b-noturno.md)).
