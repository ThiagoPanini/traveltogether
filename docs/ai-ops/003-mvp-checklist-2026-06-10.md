# AI-Ops 003 — Checklist de producao do MVP

- **Data:** 2026-06-10
- **Agente:** Claude Sonnet 4.6 (feat/issue-33-derive-legs)
- **ADR relacionado:** [ADR-0006](../adr/0006-autonomia-de-ops-afk-total.md)
- **Reversibilidade:** 🟡 — documentacao; nenhuma operacao executada aqui

## Contexto

Este documento consolida as checagens necessarias para validar o MVP apos o merge das issues #30-#41 (walking skeleton → polish final).

## Migrations pendentes no banco de producao

Apos o deploy das imagens com as issues #31-#38, rodar no container da API:

```bash
uv run alembic upgrade head
```

Tabelas/colunas adicionadas neste ciclo:

| Migration | Tabela/Coluna | Issue |
|---|---|---|
| `g7h8i9j0k1l2_add_airport_code_and_dates` | `trips.airport_code`, `trips.start_date`, `trips.end_date` | #31 |
| `h8i9j0k1l2m3_add_stop_cover_image` | `stops.cover_image_key`, `stops.cover_image_url` | #35 |
| `i9j0k1l2m3n4_add_stop_airport_code` | `stops.airport_code` | #32 |
| `j0k1l2m3n4o5_itinerary_items` | `itinerary_items` (tabela nova) | #38 |

> O Coolify pode ser configurado para rodar `alembic upgrade head` como pre-deploy hook.
> Alternativa: SSH na VPS e executar `docker exec <api-container> uv run alembic upgrade head`.

## Env vars criticas

| Var | App | Descricao |
|---|---|---|
| `AUTH_SECRET` | web **e** api | Deve ser identico nos dois apps; qualquer divergencia resulta em 401 em todas as chamadas autenticadas |
| `DATABASE_URL` | api | Postgres com SSL; rotacionar senha provisoria |
| `TRAVELTOGETHER_API_URL` | web | URL interna ou publica da API (sem trailing slash) |
| `AUTH_ALLOWLIST` | web | CSV de e-mails liberados para login |
| `R2_ENDPOINT_URL` | api | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | api | Nome do bucket de capas |
| `R2_ACCESS_KEY_ID` | api | Access key com permissao de escrita no bucket |
| `R2_SECRET_ACCESS_KEY` | api | Secret da access key |
| `R2_PUBLIC_BASE_URL` | api | Base URL publica usada nas `cover_image_url` retornadas pela API |

## Configuracao do R2

1. Criar bucket `traveltogether-covers` no Cloudflare R2
2. Criar token de API com permissao `Object Read & Write` restrita ao bucket
3. Habilitar dominio publico no bucket (ou usar `r2.dev` provisoriamente)
4. Preencher as env vars `R2_*` no Coolify
5. Testar upload de capa: criar viagem, fazer upload, verificar que `cover_image_url` retorna URL publica

## Smoke checks pos-deploy

```bash
# 1. Health da API
curl https://api.traveltogether.thiagopanini.dev/health
# Esperado: {"status":"ok"}

# 2. Login na web (manual)
# Acessar https://traveltogether.thiagopanini.dev/login
# Inserir e-mail da allowlist → verificar redirect para /trips

# 3. Criar viagem (manual)
# POST /trips via UI → verificar cartao na listagem

# 4. Alembic head
# docker exec <api-container> uv run alembic current
# Deve mostrar o revision mais recente com (head)

# 5. Migrations aplicadas
# docker exec <api-container> uv run alembic history --verbose | head -20
```

## Checklist de fluxo manual

- [ ] Criar Viagem com origem e datas
- [ ] Adicionar Parada com codigo IATA e datas de chegada/saida
- [ ] Fazer upload de capa na Viagem e na Parada
- [ ] Verificar Trajetos derivados automaticamente
- [ ] Acessar pagina de Pesquisa de Passagem de um Trajeto
- [ ] Registrar Pesquisa (passagem)
- [ ] Votar (upvote) na pesquisa
- [ ] Marcar Pesquisa como Escolhida
- [ ] Adicionar Item de Roteiro em uma Parada
- [ ] Convidar membro (e-mail na allowlist)
- [ ] Verificar que membro ve a viagem mas nao consegue editar

## Passos manuais pendentes (operador)

Ver [001-coolify-setup](001-coolify-setup-2026-06-09.md) e [002-dns-secrets](002-dns-secrets-2026-06-09.md) para pendencias de rotacao de segredos e configuracao final do dominio.
