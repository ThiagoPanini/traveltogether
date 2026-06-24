# CLAUDE.md

> Repositório em **pt-BR** (prosa, comentários, copy de UI, commits).

App de organização de viagens em grupo; a alma é compartilhar e decidir **Pesquisas de translado** (passagens). Monorepo Next.js + FastAPI + Postgres, reconstruído por fases após reset clean-room (2026-06-20). Só a **Fase 0+1** (skeleton + landing) está implementada.

## Fonte-da-verdade — leia antes de trabalho substantivo

1. **`CONTEXT.md`** — glossário de domínio + invariantes (regras que sempre valem; código que as viola é bug).
2. **`docs/adr/`** ([índice](docs/adr/README.md)) — decisões e seus porquês · **`docs/roadmap.md`** — faseamento.
3. **`docs/design/README.md`** — contrato vivo do sistema visual `Tema B · Noturno`:
   origem creditada ≠ fonte-da-verdade, dois estratos (`as-built` e `⏳ projetado`)
   e ordem de leitura para agentes.

## Convenções (não negociáveis)

- Termo de domínio em pt-BR; **identificador de código em inglês** (mapa no glossário do `CONTEXT.md`). Respeite os termos proibidos lá listados.
- **Conventional Commits**, subject minúsculo (validado por commitlint).

## Agent skills

- **Design system:** para prototipar ou estender UI, leia
  `docs/design/README.md` primeiro. Use o estrato `as-built` para superfícies já
  implementadas e o estrato `⏳ projetado` como spec futura; não abra o bundle
  `.claude/design` como fonte rotineira.

## Arquitetura

- `apps/api/` — FastAPI · SQLAlchemy 2.0 + Pydantic v2 · Alembic · uv · ruff · pyright · pytest. Modelos novos precisam entrar em `alembic/env.py`.
- `apps/web/` — Next.js 15 (App Router) · Vitest.

## Comandos

```bash
# API (de dentro de apps/api/)
uv run uvicorn travelmanager.main:app --reload    # :8000
uv run ruff check . && uv run pyright && uv run pytest -m "not integration"

# Web (da raiz)
pnpm --filter @travelmanager/web dev              # :3000
pnpm --filter @travelmanager/web typecheck
pnpm --filter @travelmanager/web test
node_modules/.bin/biome check apps/web             # NÃO use `pnpm exec biome` (falso-verde)
```

## Gate

Workflow `pr-checks` (web: biome + typecheck + vitest · api: ruff + pyright + pytest · gitleaks). `main` é protegida → merge via PR humano.
