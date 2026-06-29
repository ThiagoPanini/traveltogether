# travel·manager

Caderno de bordo compartilhado para planejar viagens em grupo: o grupo cadastra a
viagem, desenha as paradas cidade a cidade e pesquisa o translado entre cada parada,
decidindo junto. Linguagem e invariantes de domínio em [`CONTEXT.md`](CONTEXT.md);
decisões em [`docs/adr/`](docs/adr/); sistema visual em [`docs/design/`](docs/design/).

## Monorepo

| App | Stack | Pasta |
|---|---|---|
| Web | Next.js (App Router) | [`apps/web`](apps/web) |
| API | FastAPI | [`apps/api`](apps/api) |

## Desenvolvimento local

Pré-requisitos: Node 24 (`.node-version`), [pnpm](https://pnpm.io) 11, [uv](https://docs.astral.sh/uv/), Docker.

### 1. Copiar variáveis de ambiente

```bash
cp .env.example .env
```

Os valores padrão já funcionam para desenvolvimento local. `AUTH_SECRET` e `SESSION_PEPPER` podem ficar vazios — o app usa fallbacks inseguros mas funcionais.

### 2. Banco de dados

```bash
docker compose up db -d
```

### 3. API (porta 8000) — novo terminal

```bash
cd apps/api
uv run uvicorn travelmanager.main:app --reload
```

### 4. Web (porta 3000) — novo terminal

```bash
pnpm --filter @travelmanager/web dev
```

Abra `http://localhost:3000`. A jornada completa: landing → `/entrar` → onboarding → painel → criar viagem → painel da viagem com pesquisas de translado.

### Tudo via Docker (alternativa)

```bash
docker compose up --build
```

## Qualidade

O gate real é o workflow `pr-checks` (web: biome + typecheck + vitest; api: ruff +
pyright + pytest; gitleaks). Rode localmente antes de subir:

```bash
node_modules/.bin/biome check apps/web
pnpm --filter @travelmanager/web typecheck
pnpm --filter @travelmanager/web test
cd apps/api && uv run ruff check . && uv run pyright && uv run pytest -m "not integration"
```
