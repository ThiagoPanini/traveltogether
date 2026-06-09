# traveltogether

Hub fechado para organização de viagens em grupo.

## Dev local

```bash
# Instalar dependências
pnpm install        # Node (web)
cd apps/api && uv sync  # Python (api)

# Subir Postgres
docker-compose up postgres -d

# Rodar api e web em paralelo
pnpm dev:web &
cd apps/api && uv run uvicorn traveltogether.main:app --reload
```

Ou subir tudo com Docker:

```bash
docker-compose up
```

## Qualidade de código

```bash
# API
cd apps/api
uv run ruff format .          # formatar
uv run ruff check .           # lint
uv run pyright                # tipos
uv run pytest                 # testes (sem DB)
uv run pytest -m integration  # testes com Postgres real

# Web
pnpm lint                     # biome check
pnpm --filter @traveltogether/web typecheck
pnpm --filter @traveltogether/web test
```

## Estrutura

```
apps/
  api/   FastAPI · SQLAlchemy/SQLModel · Alembic · uv
  web/   Next.js 15 App Router · Tailwind 4 · shadcn/ui · Vitest
packages/
  types/ Tipos compartilhados (gerados via OpenAPI)
```

Documentação de domínio e decisões arquiteturais em `docs/`.
