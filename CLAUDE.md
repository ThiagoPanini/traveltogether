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
- **Prompts:** quando o dono pedir "um prompt", salve em `prompts/` (nunca no scratchpad), nome `YYYYMMDDHHMMSS_slug-kebab-ptBR.md` — timestamp via `date +%Y%m%d%H%M%S`, slug curto em pt-BR. Diretório é local (gitignored).

## Agent skills

- **Design system:** para prototipar ou estender UI, leia
  `docs/design/README.md` primeiro. Use o estrato `as-built` para superfícies já
  implementadas e o estrato `⏳ projetado` como spec futura; não abra o bundle
  `.claude/design` como fonte rotineira.
- **Backend:** o padrão hexagonal/Python está destilado em `## Padrões de backend`; **não**
  engatilhe as skills `hexagonal-architecture`/`python-*` rotineiramente — são referência sob
  demanda (gatilhos e raciocínio no [ADR-0013](docs/adr/0013-arquitetura-hexagonal-pragmatica.md)).

## Arquitetura

- `apps/api/` — FastAPI · SQLAlchemy 2.0 + Pydantic v2 · Alembic · uv · ruff · pyright · pytest. Modelos novos precisam entrar em `alembic/env.py`.
- `apps/web/` — Next.js 15 (App Router) · Vitest.

## Padrões de backend (hexagonal pragmática — ADR-0013)

Ao tocar `apps/api/`, siga isto. As skills `hexagonal-architecture` / `python-*` ficam **destiladas aqui** — não as engatilhe no dia-a-dia; porquê completo no [ADR-0013](docs/adr/0013-arquitetura-hexagonal-pragmatica.md) e na [nota de grilling](docs/notes/2026-06-24-grill-hexagonal-backend.md).

- **Layout:** contexto **feature-first** (`identity/`, depois `trips/`, `fares/`…) com 3 costuras `domain/ application/ adapters/`, **flat dentro** (subpasta só com 2+ adapters do mesmo lado). Infra cross-contexto em `shared/` (`db`, `clock`, `errors`).
- **Idioma:** Ports = `typing.Protocol`. Use-case = `@dataclass(frozen=True, slots=True)` com `__call__`, Ports como campos. Wiring = `provide_*` em `adapters/dependencies.py` (um composition root por contexto; rotas só `Depends(provide_…)`).
- **Entidade:** o modelo ORM SQLAlchemy **é** a entidade; Pydantic só na borda (DTOs em `adapters/schemas.py`). Regra pura sem linha de banco vai em `domain/rules.py` (ou método na entidade).
- **Persistência:** `repo.save()` = `add` + `flush` (aflora erro de constraint); **commit/rollback só no `get_db`** (request = unit-of-work). Use-case **nunca** commita.
- **Erros:** categorias semânticas em `shared/errors.py` (`NotFound`/`Conflict`/`Invalid`/`Unauthorized`/`RateLimited` — **sem número HTTP**); um handler central mapeia categoria→status. Outbound traduz `IntegrityError`→erro de domínio; domain/app nunca citam HTTP; o inbound pode. Body `{"code","detail"}` — `code` estável é contrato com o web.
- **Testes:** GWT — blocos `# given: / # when: / # then:`, classe-por-subject, nome `test_<cenário>_<esperado>`. Use-case com **fakes dos Ports** (sem DB); split por costura; `integration` só para Postgres. `Clock` Port + `FixedClock` no lugar de freezegun.
- **Estilo:** docstrings **Google-style em pt-BR** em tudo; `__all__` só no seam do contexto; ruff + pyright são a fonte do estilo.
- **Refactor pendente:** a #189 ainda está no layout antigo (flat `models.py`/`sessions.py`/`auth.py`); migra para este padrão em PR próprio antes da #190.

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
