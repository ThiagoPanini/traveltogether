# CLAUDE.md

> Repositório em **pt-BR** (prosa, comentários, copy de UI, commits).

App de organização de viagens em grupo (alma: compartilhar/decidir **Pesquisas de translado**). Monorepo Next.js + FastAPI + Postgres. Implementado hoje: **Fase 0+1** (landing) + início de identidade/auth (#189). Faseamento: GitHub milestones + label `phase:N`.

## Fonte-da-verdade — leia antes de trabalho substantivo

1. **`CONTEXT.md`** — glossário de domínio + invariantes (regras que sempre valem; código que as viola é bug).
2. **`docs/adr/`** ([índice](docs/adr/README.md)) — decisões e seus porquês.
3. **`docs/design/README.md`** — contrato vivo do sistema visual `Noturno`.

## Convenções (não negociáveis)

- Termo de domínio em pt-BR; **identificador de código em inglês** (mapa no glossário do `CONTEXT.md`). Respeite os termos proibidos lá listados.
- **Markdown sem hard-wrap:** uma linha por parágrafo (quebra só *entre* parágrafos) — não corte frases em ~80 colunas; o soft-wrap é do editor. Quebra de linha só onde tem semântica: item de lista, linha de tabela, bloco de código. Vale pra todo `.md`, inclusive o escrito por agente.
- **Conventional Commits**, subject minúsculo (validado por commitlint).
- **Prompts:** quando o dono pedir "um prompt", salve em `prompts/` (nunca no scratchpad), nome `YYYYMMDDHHMMSS_slug-kebab-ptBR.md` — timestamp via `date +%Y%m%d%H%M%S`, slug curto em pt-BR. Diretório é local (gitignored).
- **Skills** moram em `.agents/skills/`, symlinkadas em `.claude/skills/` — fonte única; não duplique nem "dedupe".

## Arquitetura

- `apps/api/` — FastAPI · SQLAlchemy 2.0 + Pydantic v2 · Alembic · uv · ruff · pyright · pytest. Modelos novos precisam entrar em `alembic/env.py`.
- `apps/web/` — Next.js 15 (App Router) · Vitest.

## Padrões de backend (hexagonal pragmática — ADR-0005)

Ao tocar `apps/api/`, siga isto. **Não** engatilhe as skills `hexagonal-architecture` / `python-*` no dia-a-dia — são referência sob demanda; o padrão está destilado aqui.

- **Layout:** contexto **feature-first** (`identity/`, depois `trips/`, `fares/`…) com 3 costuras `domain/ application/ adapters/`, **flat dentro** (subpasta só com 2+ adapters do mesmo lado). Infra cross-contexto em `shared/` (`db`, `clock`, `errors`).
- **Idioma:** Ports = `typing.Protocol`. Use-case = `@dataclass(frozen=True, slots=True)` com `__call__`, Ports como campos. Wiring = `provide_*` em `adapters/dependencies.py` (um composition root por contexto; rotas só `Depends(provide_…)`).
- **Entidade:** o modelo ORM SQLAlchemy **é** a entidade; Pydantic só na borda (DTOs em `adapters/schemas.py`). Regra pura sem linha de banco vai em `domain/rules.py` (ou método na entidade).
- **Persistência:** `repo.save()` = `add` + `flush` (aflora erro de constraint); **commit/rollback só no `get_db`** (request = unit-of-work). Use-case **nunca** commita.
- **Erros:** categorias semânticas em `shared/errors.py` (`NotFound`/`Conflict`/`Invalid`/`Unauthorized`/`RateLimited` — **sem número HTTP**); um handler central mapeia categoria→status. Outbound traduz `IntegrityError`→erro de domínio; domain/app nunca citam HTTP; o inbound pode. Body `{"code","detail"}` — `code` estável é contrato com o web.
- **Testes:** GWT — blocos `# given: / # when: / # then:`, classe-por-subject, nome `test_<cenário>_<esperado>`. Use-case com **fakes dos Ports** (sem DB); split por costura; `integration` só para Postgres. `Clock` Port + `FixedClock` no lugar de freezegun.
- **Estilo:** docstrings **Google-style em pt-BR** em tudo; `__all__` só no seam do contexto; ruff + pyright são a fonte do estilo.

Porquê completo: [ADR-0005](docs/adr/0005-arquitetura-hexagonal-pragmatica.md) + [nota de grilling](docs/notes/2026-06-24-grill-hexagonal-backend.md).

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

Workflow `pr-checks` (web: biome + typecheck + vitest · api: ruff + pyright + pytest · gitleaks). `main` é protegida → merge via PR criado por workflow de CI.
