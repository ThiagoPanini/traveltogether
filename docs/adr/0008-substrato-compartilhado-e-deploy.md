# 0008 — Substrato compartilhado (panlabs.tech) e topologia de deploy

**Status:** Aceito

## Contexto

O travelmanager roda como **subdomínio de `panlabs.tech`** numa VPS única (Hostinger + Coolify), **compartilhando recursos** com outras soluções do operador hospedadas nos mesmos moldes (`panlabs`, `ethitorial`, …). Essa escolha de substrato sempre existiu, mas vivia **implícita**: o [0004](0004-topologia-de-autenticacao.md) a cita de passagem (para justificar a API interna) e o resto estava só na memória da faxina de 2026-06-23. Faltava um ADR que **possuísse** a decisão e descrevesse o **deploy as-built**.

## Decisão

**Substrato compartilhado, com blast-radius compartilhado aceito — porque o portfólio é experimental, solo e de baixo risco ([0007](0007-autonomia-total-do-agente.md)).** Os nomes vivem em três camadas:

- **(a) Guarda-chuva público** — `panlabs.tech` → `travelmanager.panlabs.tech`. É o único host público; a API nunca é pública ([0004](0004-topologia-de-autenticacao.md)).
- **(b) Infra do operador** — painel Coolify em `vps.panlabs.tech`; imagens em `ghcr.io/thiagopanini/<projeto>-<app>` (aqui: `travelmanager-web` e `travelmanager-api`).
- **(c) Isolamento por projeto** — cada projeto tem o seu **Coolify Project + zona DNS + banco Postgres** próprios. O compartilhamento é de *substrato* (VM, painel, registry), não de *dados*.

### Topologia de deploy (as-built)

Portão 3, em `push` para `main` (`.github/workflows/deploy.yml`):

1. **build-push** (matriz web/api) → publica `ghcr.io/thiagopanini/travelmanager-{web,api}` (tags `latest` + `sha`).
2. **deploy (coolify)** → dispara redeploy via webhook (`curl -X POST "$COOLIFY_URL/api/v1/deploy?uuid=…&force=true"`), guardado por `COOLIFY_TOKEN` (sem o secret, build/push rodam e o deploy é pulado sem falhar).
3. **smoke test** → exige `200` + corpo com "travel" em `https://travelmanager.panlabs.tech`.

**Deferido:** a aplicação de migrations (Alembic) **não** está no pipeline — o `CMD` do container é só `uvicorn`, sem `alembic upgrade` no start nem passo de CI. Por ora é aplicada fora do deploy; entra no pipeline quando virar gargalo.

## Blast-radius e disciplina de alvo

Compartilhar VM e painel significa que uma operação errada **pode, em tese, atingir um vizinho** (`panlabs`, `ethitorial`). A salvaguarda é a **disciplina de alvo** — caso 4 da fronteira do [0007](0007-autonomia-total-do-agente.md): antes de qualquer operação mutante no Coolify, confirme que o recurso é **deste** projeto. Recriar o substrato (a própria VM) é o caso 2 e fica com o operador.

## Gatilhos de reabertura

Se algum projeto do portfólio ganhar **usuários reais / SLA**, ou precisar de **VPS / ambiente dedicado**, o substrato deixa de ser compartilhável sem custo — re-decida aqui (espelha os gatilhos do [0007](0007-autonomia-total-do-agente.md)).

## Opções consideradas

- **VPS / Coolify dedicado por projeto** — rejeitado por ora: custo e cerimônia que não se pagam para um portfólio experimental e solo; o isolamento por *projeto* (camada c) já contém os dados.
- **API pública** (`api.panlabs.tech` / `api.travelmanager.panlabs.tech`) — rejeitado: ambíguo no guarda-chuva compartilhado e fora do Universal SSL grátis do Cloudflare (subdomínio de 2 níveis) — detalhe em [0004](0004-topologia-de-autenticacao.md).

## Consequências

- O [0004](0004-topologia-de-autenticacao.md) herda este substrato (a API interna na rede `coolify` é consequência da camada (a)).
- O deploy é **autônomo** ([0007](0007-autonomia-total-do-agente.md)): o agente faz redeploy e cria/dropa recurso próprio no Coolify sem pedir, respeitando a disciplina de alvo.
- Os portões de CI (`pr-checks`) ficam descritos no [`CLAUDE.md`](../../CLAUDE.md) (não viram ADR — são CI padrão).

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md); topologia de auth e API interna em [0004](0004-topologia-de-autenticacao.md); fronteira de autonomia em [0007](0007-autonomia-total-do-agente.md).
