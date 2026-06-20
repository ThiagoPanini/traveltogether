# travel·together

Caderno de bordo compartilhado para planejar viagens em grupo: o grupo cadastra a
viagem, desenha as paradas cidade a cidade e pesquisa o translado entre cada parada,
decidindo junto. Linguagem e invariantes de domínio em [`CONTEXT.md`](CONTEXT.md);
decisões em [`docs/adr/`](docs/adr/); sistema visual em [`docs/design/`](docs/design/).

## Monorepo

| App | Stack | Pasta |
|---|---|---|
| Web | Next.js (App Router) | [`apps/web`](apps/web) |
| API | FastAPI | [`apps/api`](apps/api) |

## Desenvolvimento

Pré-requisitos: Node 24 (`.node-version`), [pnpm](https://pnpm.io) 11, [uv](https://docs.astral.sh/uv/).

```bash
# Web
pnpm install
pnpm --filter @traveltogether/web dev      # http://localhost:3000

# API
cd apps/api
uv sync
uv run uvicorn traveltogether.main:app --reload   # http://localhost:8000/health
```

Ou tudo via Docker:

```bash
docker compose up --build
```

## Qualidade

O gate real é o workflow `pr-checks` (web: biome + typecheck + vitest; api: ruff +
pyright + pytest; gitleaks). Rode localmente antes de subir:

```bash
node_modules/.bin/biome check apps/web
pnpm --filter @traveltogether/web typecheck
pnpm --filter @traveltogether/web test
cd apps/api && uv run ruff check . && uv run pyright && uv run pytest -m "not integration"
```
