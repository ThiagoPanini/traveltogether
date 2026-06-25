# 0005 — Arquitetura do backend: hexagonal pragmática, feature-first, layout híbrido

**Status:** Aceito

## Contexto

A Fase 2 trouxe o **primeiro código de backend com lógica real** (modelos de identidade, sessão opaca, rotas de auth — #189). Antes que a #190+ multiplique features (OTP, Google, onboarding, hardening, linking) e cada uma deposite mais código, era a hora de fixar um **padrão sustentável** — senão cada fatia inventa o seu, e o débito arquitetural compõe.

Existem skills genéricas (`hexagonal-architecture`, `python-project-structure`, `python-code-style`, `python-testing-patterns`), mas são multi-linguagem e verbosas. Engatilhá-las a cada tarefa de backend **lota o contexto**; não engatilhá-las perde o padrão. A saída: **destilar as decisões aqui e no `CLAUDE.md`** — o padrão rege sem custo de contexto, e as skills não são mais acionadas no dia-a-dia.

## Decisão

**Hexagonal pragmática (Ports & Adapters), organizada feature-first por bounded context, com layout híbrido.**

- **Pureza pragmática.** Use-cases dependem de **Ports** (`typing.Protocol`). O **modelo ORM SQLAlchemy é a entidade** (não há entidade de domínio pura separada); Pydantic só na borda HTTP; `Depends` do FastAPI é o composition root. Trocamos o triplo-mapeamento purista por menos cerimônia, aceitando conscientemente o acoplamento da entidade ao ORM.
- **Feature-first.** Cada bounded context do [`CONTEXT.md`](../../CONTEXT.md) (`identity/`, depois `trips/`, `fares/`, `membership/`) é um pacote. Infra cross-contexto vive em `shared/`.
- **Layout híbrido.** Três pastas-costura por contexto — `domain/`, `application/`, `adapters/` — **flat dentro** (sem `adapters/inbound/outbound/...` até haver 2+ do mesmo lado). As costuras que sustentam carga ficam visíveis; sem ruído de pasta-com-um-arquivo.
- **Idioma.** Use-case = `@dataclass(frozen=True, slots=True)` com `__call__`; Ports recebidos como campos. Wiring centralizado em `adapters/dependencies.py` (`provide_*`), um composition root por contexto.
- **Fronteira transacional.** `repo.save()` = `add` + `flush` (ataca a escrita, aflora erro de constraint); **commit/rollback só no `get_db`** (request = unit-of-work). Use-case nunca commita. Sem classe `UnitOfWork` dedicada (YAGNI).
- **Tradução de erro.** Categorias semânticas em `shared/errors.py` (`NotFound`, `Conflict`, `Invalid`, `Unauthorized`, `RateLimited` — **sem número HTTP**); um handler central mapeia categoria → status; o outbound traduz `IntegrityError` → erro de domínio; o inbound pode falar `HTTPException`. `code` estável no body é contrato com o web BFF.
- **Testes GWT.** Blocos `# given: / # when: / # then:`, classe-por-subject. Use-case testado com **fakes dos Ports** (sem DB); split por costura (domínio puro → use-case com fake → adapter SQLite → rota TestClient); marker `integration` só para Postgres. `Clock` Port + `FixedClock` no lugar de freezegun.
- **Estilo.** Google-style docstrings (em pt-BR) em tudo; `__all__` só no seam do contexto; ruff + pyright continuam a fonte-da-verdade do estilo.

## Substrato de persistência

**Persistência em SQLAlchemy 2.0 (`DeclarativeBase` + `Mapped`/`mapped_column`); contrato da API em Pydantic v2 — separados.** O `CLAUDE.md` declarava "SQLModel", mas o código real já usava SQLAlchemy 2.0 puro e não havia modelo nenhum; cravamos isto e reconciliamos o doc. `target_metadata` passa a ser ligado em `alembic/env.py` (era `None`); modelos novos exigem registro lá antes do autogenerate.

- **SQLModel** (casava com o doc) — rejeitado. A promessa "uma classe é tabela **e** schema" vaza justamente numa API de identidade, que **precisa** esconder campos sensíveis (`token_hash`, `code_hash`, `is_active`) e ter variantes `Create`/`Read`/`Update` — você escreve as classes extras de qualquer jeito, **acoplando** persistência ao contrato. Soma a isso arestas de tipagem com **pyright** (que está no gate) e o domínio rico que vem (Paradas/Trechos ordenados, `Pesquisa` cobrindo n Trechos, dinheiro **e/ou** pontos como value objects), que usa mapeamentos avançados first-class no SQLAlchemy, furando a abstração.
- O custo é mais boilerplate (modelo ORM + schema Pydantic por entidade), aceito conscientemente: compra **desacoplamento** persistência↔transporte e **proteção** contra vazar campo sensível no contrato. A ponte ORM→schema é trivial (`model_validate(obj, from_attributes=True)`). Coerente com a aposta hexagonal acima, em que o **modelo ORM é a entidade** e Pydantic vive só na borda.

## Opções consideradas

- **Hexagonal purista** (entidade de domínio pura + ORM adapter + DTO Pydantic, mapeamento triplo) — rejeitado: em FastAPI/SQLAlchemy o triplo-mapeamento vira boilerplate que ninguém mantém; a pureza luta contra o framework. **Service layer leve** (sem Ports) — rejeitado: perde testabilidade por fake e a inversão de dependência.
- **Layout layer-first** (`domain/`, `application/` no topo, contextos misturados) — rejeitado: vira sopa quando crescer. **Nested completo** (`adapters/outbound/sqlalchemy/...` desde já) — rejeitado: 7 pastas e 9 `__init__.py` para hospedar use-cases de 6–12 linhas; sinal/ruído despenca.
- **Persistência implícita** (sem `save()` no Port, confiando no dirty-tracking do SQLAlchemy) — rejeitado: o Port mentiria (mutações persistem invisíveis), vazaria para qualquer adapter não-SQLAlchemy, e o teste de unidade não distinguiria "mutei em memória" de "persisti" — crítico para escritas de segurança (`revoked_at` no logout).
- **`abc.ABC` para Ports** — rejeitado: forçaria o adapter a importar o Port (referência para cima); `Protocol` estrutural mantém a seta de dependência pura.
- **`HTTPException` inline nos use-cases** (status quo da #189) — rejeitado: acopla lógica de aplicação a HTTP e impede um use-case de ser dirigido por CLI/worker; testes de unidade afirmariam status HTTP no lugar de comportamento.
- **Acionar as skills a cada tarefa de backend** — rejeitado: o medo de lotar contexto é real e legítimo. "Aplicar o padrão" ≠ "invocar a skill": o padrão rege por estar no `CLAUDE.md` (sempre carregado), não por a skill ser lida toda vez. **Hook que auto-carrega a skill** — rejeitado: o pior para o bloat; o `CLAUDE.md` já está sempre no contexto.

## Consequências

- **`CLAUDE.md` passa a ser auto-suficiente** para backend (seção `## Padrões de backend`): nenhuma skill é engatilhada no dia-a-dia. As skills viram referência sob demanda; o raciocínio fica no ADR + na nota rica.
- A **#189 será refatorada para este padrão em PR próprio** (strangler, testes de caracterização primeiro, gate verde, zero mudança de comportamento) **antes da #190** — para a #190 nascer no molde novo. Trabalho habilitador, sem issue no milestone.
- **Toda feature futura** aterrissa no mesmo molde: novo contexto = nova pasta com as três costuras; o blast-radius fica contido no pacote.
- O acoplamento entidade↔ORM é o preço aceito da pragmática: se um dia trocar de ORM, a entidade vaza. Avaliado e aceito frente à longevidade real do projeto.
- A migração de `Base` para `shared/` e dos modelos para `identity/domain/` exige reatar `alembic/env.py` (import dos modelos para registrarem em `target_metadata`).

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md); topologia de auth em [0004](0004-topologia-de-autenticacao.md).
