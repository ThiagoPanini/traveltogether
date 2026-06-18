# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Documentação e código deste repositório são em **pt-BR** (prosa, comentários, copy de UI, mensagens de commit). Este arquivo segue a mesma convenção.

## O que é

Hub fechado para organização de viagens em grupo. Beta fechado para um grupo de amigos, com horizonte de virar SaaS aberto. Monorepo Next.js + FastAPI + Postgres que **espelha deliberadamente a stack do epistemix** (ADR-0001).

## Antes de qualquer trabalho substantivo

Leia, nesta ordem, o conhecimento durável que **não** está derivável do código:

1. **`docs/CONTEXT.md`** — glossário canônico de domínio + **invariantes** (regras que sempre valem; código que as viola é bug). A linguagem do produto vive aqui.
2. **`docs/adr/`** — decisões arquiteturais (por quê, não só o quê). As mais carregadas de contexto: 0003 (modelo de acesso), 0004 (itinerário), 0006 (autonomia de ops).
3. **`DESIGN.md`** — direção visual provisória (dark-first, acento cyan, mono nos dados de viagem).

### Convenção de nomes (não negociável)

Termo canônico do glossário é **pt-BR**; identificadores de **código são em inglês**. O mapa está no glossário do CONTEXT.md:

`Viagem`→`Trip` · `Parada`→`Stop` · `Trajeto`→`Leg` · `Pesquisa de Passagem`→`FareQuote` · `Upvote`→`Vote` · `Escolhida`→`chosen` · `Organizador`→`Organizer` · `Membro`→`Member`.

A seção "Termos ambíguos a evitar" do CONTEXT.md lista palavras proibidas (ex.: nunca "voo", "proposta", "etapa", "like"). Respeite-a em código, copy e commits.

## Arquitetura

```
apps/api/   FastAPI · SQLModel · Alembic · uv · ruff · pyright · pytest
apps/web/   Next.js 15 (App Router) · Tailwind 4 · Auth.js · Vitest
packages/types/  Tipos TS compartilhados (espelham as DTOs Public da API)
```

**Hexagonal pragmática por boundary** (ADR-0001/0004), granularidade proporcional à complexidade. Os boundaries da API são pastas em `apps/api/src/traveltogether/`:

- `identity` — `Usuário`, gate de acesso, JWT, criação JIT de usuário.
- `trips` — `Viagem`, `Parada`, `Trajeto`, `Membership`/papéis, gestão de membros.
- `fares` — `Pesquisa de Passagem`, `Upvote`, `Escolhida`. Referencia `Trajeto` por `LegId`.
- `shared` — value objects e tipos base.
- `platform` — adapters de DB, observabilidade, auth/email.

Princípio (CONTEXT.md): boundaries comunicam por **interface explícita** (funções de service), nunca import de modelos cross-boundary; na prática um boundary pode chamar o *service* de outro (ex.: `fares` usa `trips.service.get_trip_membership` para autorização).

### Padrão de cada boundary na API

Três arquivos por boundary, com fronteira nítida:

- **`models.py`** — `SQLModel`. Tabelas (`class X(SQLModel, table=True)`, `__tablename__` explícito, PK `uuid4`) **e** as DTOs `XPublic`/`XCreate`/`XUpdate` no mesmo arquivo.
- **`service.py`** — lógica de domínio pura. Recebe `Session` como primeiro argumento; **zero dependências de FastAPI**. É o que se testa com SQLite em memória.
- **`router.py`** — HTTP only: `APIRouter`, `Depends`, tradução para `HTTPException`, autorização. Não contém regra de domínio.

Modelos novos precisam ser importados em `alembic/env.py` para entrar na `SQLModel.metadata`.

### Autenticação — duas camadas de JWT que compartilham `AUTH_SECRET`

Este é o ponto mais sutil do sistema (ADR-0003 — gate por e-mail sem verificação real):

1. **Web (Auth.js):** `/login` → `CredentialsProvider` e-mail-only → `authorizeEmailForAccess` checa `AUTH_ALLOWLIST` (CSV) → sessão JWT do Auth.js.
2. **Token de API:** no callback `jwt`, `createApiAccessToken` (jose, HS256, `sub`/`email`) assina um **segundo** JWT com o **mesmo `AUTH_SECRET`**, exposto como `session.apiAccessToken`.
3. **Chamadas à API:** os clientes em `apps/web/lib/api/*` mandam esse token como `Bearer`.
4. **API (`identity/deps.get_current_user`):** `verify_token` (pyjwt, HS256, mesmo `AUTH_SECRET`) valida, e **cria o `Usuário` JIT** no primeiro acesso, resolvendo memberships pendentes.

Consequência: **`AUTH_SECRET` precisa ser idêntico em web e api**, senão toda chamada autenticada falha com 401. Allowlist e segredo mudam via env var → exige redeploy (ADR-0002/0003).

### `packages/types` — sincronizado à mão

Apesar do "gerados via OpenAPI" no README, **não há codegen**: `packages/types/src/index.ts` é mantido manualmente espelhando as DTOs `*Public`/`*Create`/`*Update` da API. Ao mudar uma DTO na API, atualize este arquivo no mesmo PR ou o `typecheck` do web não pega a divergência.

## Comandos

Setup: `pnpm install` (raiz, Node) e `cd apps/api && uv sync` (Python). Postgres: `docker-compose up postgres -d`. Tudo de uma vez: `docker-compose up`.

### API (rodar de dentro de `apps/api/`)

```bash
uv run uvicorn traveltogether.main:app --reload   # servir (porta 8000)
uv run ruff format .                               # formatar
uv run ruff check .                                # lint
uv run pyright                                     # tipos (strict)
uv run pytest -m "not integration"                 # testes unitários (SQLite em memória) — o que o gate roda
uv run pytest -m integration                       # testes que exigem Postgres real
uv run pytest tests/fares/test_service.py::test_create_fare_quote   # um único teste
uv run alembic upgrade head                        # aplicar migrations
uv run alembic revision --autogenerate -m "msg"    # nova migration
```

### Web / raiz

```bash
pnpm dev:web                                  # next dev
pnpm build:web
pnpm --filter @traveltogether/web typecheck   # tsc --noEmit
pnpm --filter @traveltogether/web test        # vitest run
pnpm --filter @traveltogether/web test -- lib/api/trips.test.ts   # um arquivo
pnpm lint                                     # biome check . (raiz)
pnpm format                                   # biome format --write .
```

### Testes da API — padrão

Unitários montam um engine SQLite `create_engine("sqlite://", poolclass=StaticPool)` com fixtures por arquivo; testam `service.py` direto ou o `router.py` via `TestClient` com `app.dependency_overrides`. O marker `integration` (ver `pyproject.toml`) marca testes que precisam de Postgres real e fica **fora do gate pre-push e do CI**.

## Fluxo de trabalho

- **Planejamento via GitHub Issues** estilo Matt Pocock (ADR-0005): cada vertical slice é uma issue grabável. Labels são **prefixados por eixo** (facilita o filtro do agente): `status:` (`ready-for-agent` AFK · `hitl` para nas bordas · `blocked`), `type:` (`feat`/`fix`/`docs`/`chore`/`test`/`refactor`, espelha Conventional Commits), `area:` (`web`/`api`/`infra`/`ci`), `boundary:` (`identity`/`trips`/`fares`/`shared`/`platform`/`collaboration`/`budget`/`notifications`) e `phase:` (`1`/`2`).
- **Commits:** Conventional Commits, validados por commitlint (commit-msg hook).
- **Hooks (lefthook):** pre-commit roda gitleaks; pre-push roda o gate completo (ruff format/check, pyright, pytest "not integration", biome, typecheck web).
- **CI (`.github/workflows/pr-checks.yml`):** mesmo gate (web · api · security/gitleaks); ao ficar verde, **abre PR para `main` automaticamente** em branches `feat/**`, `fix/**`, `chore/**`, `docs/**`, `refactor/**`, `test/**`, `worktree/**`. **Merge continua humano.** A `main` é **branch protegida**: exige PR + os 3 checks (`web`/`api`/`security`) verdes para merge, sem force-push/delete; `enforce_admins` off → o owner faz bypass quando precisar.
- **Ops AFK (ADR-0006, só neste projeto):** o agente executa via MCP até as bordas 🔴 (DNS no Cloudflare, secrets de produção no Coolify/`gh secret`), registrando em `docs/ai-ops/`. Secrets gerados são **provisórios** — o operador rotaciona pós-setup.

## Variáveis de ambiente

`DATABASE_URL` (Postgres), `TRAVELTOGETHER_API_URL` (web → api), `AUTH_SECRET` (**igual nos dois apps**), `AUTH_ALLOWLIST` (CSV de e-mails liberados). Ver `.env.example`.

## Agent skills

Configuração que os skills de engenharia (estilo Matt Pocock, ADR-0005) assumem. Editável direto em `docs/agents/*.md`; re-rodar o `/setup-matt-pocock-skills` só é preciso para trocar de issue tracker ou recomeçar do zero.

### Issue tracker

Issues e PRDs vivem no **GitHub Issues** (via `gh`); PRs externos **não** são superfície de triagem. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Os cinco papéis canônicos de triagem mapeiam para a convenção de eixo `status:` do repo (reusa `status:ready-for-agent` e `status:hitl`). Ver `docs/agents/triage-labels.md`.

### Domain docs

Repo **single-context**: glossário em `docs/CONTEXT.md` + decisões em `docs/adr/`. Ver `docs/agents/domain.md`.
