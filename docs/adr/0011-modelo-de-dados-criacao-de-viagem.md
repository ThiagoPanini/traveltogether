# 0011 — Modelo de dados e transação da criação de viagem

**Status:** Aceito

## Contexto

Ao destrinchar a jornada de **criação de viagem** (um wizard de 6 passos: destino → paradas → translados → identidade → tripulação → resumo), precisávamos decidir o que a fatia **persiste** — o suficiente pra fechar o ciclo **criar → convidar → aceitar → ver o esqueleto**, sem gravar dado que a **exploração** (Pesquisa multi-modal, fatia futura) tenha que migrar depois. A tensão é dupla: gravar de menos custa migration/re-trabalho quando a exploração chegar; gravar de mais constrói entidades de exploração numa fatia que ainda não pesquisa nem compara nada.

Três decisões anteriores já balizam o terreno e **não** se repetem aqui: a unit-of-work por-request ([ADR-0005](0005-arquitetura-hexagonal-pragmatica.md)), o translado desejado como **intenção faseada** ([ADR-0009](0009-translado-multimodal.md)), e o convite-com-aceite, cego e com papel ([ADR-0002](0002-papeis-camadas-e-convite.md)). Este ADR fecha **como tudo isso vira tabela e transação**.

## Decisão

- **Quatro tabelas, intenção-não-exploração.** A criação grava `Trip`, `Stop`, `Membership` (Participação) e `Invitation` (Convite) — e **nada** de `Leg`/`Route`/`Segment`/`FareQuote`. O Trajeto segue **derivado** da ordem das Paradas (CONTEXT) e o translado é **hint denormalizado**, não um Trecho: `desired_transfer` no `Stop` (proposta do salto **compartilhado** parada→parada que chega nele) e `entry_transfer` no `Membership` (proposta **pessoal** da ponta casa→1ª parada, por-pessoa — inv. 6). Grava a intenção agora, constrói a exploração depois (just-in-time, [ADR-0003](0003-faseamento-e-fatiamento.md)).
- **Atômico no confirmar, sem status `draft` no servidor.** Um único POST cria Trip + Stops + a Membership do criador (papel Organizador) + os Convites pendentes numa só unit-of-work ([ADR-0005](0005-arquitetura-hexagonal-pragmatica.md); o use-case não commita). O rascunho do wizard vive em **localStorage** no cliente — o banco só conhece viagens reais.
- **Aceite in-app por lista, não por token de e-mail.** O convidado autenticado vê `invitations WHERE email = me AND status = 'pending'` e aceita; o aceite cria a Membership com o papel que o Convite carrega ([ADR-0002](0002-papeis-camadas-e-convite.md)) e grava `accepted_at`/`membership_id`. O **envio do e-mail de convite é efeito colateral fora da unit-of-work** (best-effort, retentável) — a viagem não dá rollback se o e-mail falha. No tracer-bullet o ciclo fecha **sem enviar e-mail** (a notificação por e-mail é fast-follow).
- **Visibilidade pela Participação.** A Viagem aparece pra pessoa via `memberships WHERE user_id = me` — é a Participação que libera as camadas de escrita (inv. 9).
- **Só-ida na criação.** O esqueleto modela casa→1ª parada (por-pessoa) + paradas→paradas (compartilhado). A **volta** (destino→casa) é por-pessoa e **emerge na exploração** — tipicamente a meia-volta de uma Pesquisa ida-e-volta (inv. 2). Não se pré-declara volta.
- **Craft pragmática, seguindo o `identity/`.** PK `uuid.uuid4` (não enumera em URL); enums (`role`, `status`, `transfer_kind`) como `String` validado na borda — sem DB-enum nem CHECK, como o identity já faz; timestamps tz-aware com default no banco. **FK cross-contexto** `memberships.user_id → users.id` com relationship **one-directional** (sem back-ref em `User`): a seta de dependência fica `trips → identity` e o identity nunca importa trips. **Índice parcial** `unique(trip_id, email) WHERE status = 'pending'` permite **re-convidar** após revogar/recusar (guarda o histórico) sem deixar dois convites vivos.

## Opções consideradas

- **Status `draft` persistido no servidor** — rejeitado: cria estado-zumbi (viagens meio-criadas a varrer) e duplica o que o localStorage já resolve no cliente. O confirmar atômico mantém o banco só com viagens reais.
- **Construir `Leg`/`Route`/`Segment` já na criação** — rejeitado: over-engineering de uma fatia que não pesquisa nem compara; o Trajeto é derivado por definição e o translado é hint. Gravaria tabelas de exploração vazias.
- **Aceite por token em link de e-mail** — rejeitado pro tracer-bullet: acopla o fechamento do ciclo à entrega de e-mail (Resend, deliverability, secret de terceiro) e a um fluxo de token. O aceite in-app por lista fecha o ciclo sem essa dependência; não fecha a porta pro token, só não bloqueia a fatia nele.
- **Sem FK cross-contexto (referência só por id, à la DDD distribuído)** — rejeitado: é monólito, um banco, um `Base.metadata` — a integridade referencial vale mais que a pureza distribuída. O relationship one-directional preserva a seta de dependência sem abrir mão do FK.
- **`transfer_kind` como DB-enum** — rejeitado: cada item novo na lista (ADR-0009) viraria migration de enum; `String` validado na borda é o padrão já vigente no identity.

## Consequências

- A fatia nasce **forward-compatible**: a exploração lê `desired_transfer`/`entry_transfer` como semente e constrói Trechos/Rotas **sem migrar** o que a criação gravou.
- Novo contexto **`trips/`** (feature-first, [ADR-0005](0005-arquitetura-hexagonal-pragmatica.md)) com as costuras `domain/ application/ adapters/`; `Membership` e `Invitation` moram nele (split de um `collaboration/` fica pra quando crescer). `alembic/env.py` passa a importar `travelmanager.trips.domain.models`.
- O **e-mail-fora-da-UoW** vira padrão a repetir: efeito colateral não-transacional sai da unit-of-work.
- `Trip.created_by` guarda o fato **imutável** "quem criou", distinto do conjunto **mutável** de Organizadores (papéis são reversíveis — [ADR-0002](0002-papeis-camadas-e-convite.md)).
- Reforça o **convite cego** ([ADR-0002](0002-papeis-camadas-e-convite.md)): `invitations` só guarda e-mail + papel + status, nenhum dado de perfil — o bloco rico (nome, avatar de iniciais, cidade) só aparece após o aceite, via join.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md).
