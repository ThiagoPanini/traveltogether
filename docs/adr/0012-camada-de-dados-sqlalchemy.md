# 0012 — Camada de dados: SQLAlchemy 2.0 + Pydantic v2 (não SQLModel)

**Status:** Aceito

## Contexto

A Fase 2 traz os **primeiros modelos de domínio** (User, Perfil, sessões, OTP, identidades). O `CLAUDE.md` declarava a stack da API como "**SQLModel**", mas o código real (`apps/api/.../db.py`, `pyproject.toml`) já usava **SQLAlchemy 2.0 puro** e **não havia modelo nenhum** — o doc nunca foi testado contra código. Era o momento de cravar para valer e reconciliar.

## Decisão

**Persistência em SQLAlchemy 2.0 (`DeclarativeBase` + `Mapped`/`mapped_column`), contrato da API em Pydantic v2 — separados.** O `CLAUDE.md` foi reconciliado para refletir isso. `target_metadata` passa a ser ligado em `alembic/env.py` (era `None`).

## Opções consideradas

- **SQLModel** (casava com o doc) — rejeitado. A promessa "uma classe é tabela **e** schema" vaza justamente aqui: (1) uma API de identidade **precisa** esconder campos sensíveis (`token_hash`, `code_hash`, `is_active`) e ter variantes `Create`/`Read`/`Update` — então você escreve as classes extras de qualquer jeito, **acoplando** persistência ao contrato; (2) arestas de tipagem com **pyright** (que está no gate); (3) o domínio rico que vem (Paradas/Trechos **ordenados**, `Pesquisa` cobrindo n Trechos, dinheiro **e/ou** pontos como value objects) usa mapeamentos avançados first-class no SQLAlchemy, furando a abstração do SQLModel.

## Consequências

- Mais boilerplate (modelo ORM + schema Pydantic por entidade) — custo aceito conscientemente: compra **desacoplamento** persistência↔transporte e **proteção** contra vazar campo sensível no contrato.
- A ponte ORM→schema é trivial (`model_validate(obj, from_attributes=True)`).
- Modelos novos continuam exigindo registro em `alembic/env.py` antes do autogenerate.

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md); topologia que estreia estes modelos em [0011](0011-topologia-de-autenticacao.md).
