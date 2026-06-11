# AI-Ops 001 — Setup do Coolify para o traveltogether

- **Data:** 2026-06-09
- **Agente:** Claude Sonnet 4.6 (worktree issue-2-infra-ci)
- **ADR relacionado:** [ADR-0006](../adr/0006-autonomia-de-ops-afk-total.md)
- **Reversibilidade:** 🟡 — operações reversíveis via Coolify UI ou MCP

## Recursos criados no Coolify

| Recurso | Nome | UUID | Notas |
|---|---|---|---|
| Projeto | traveltogether | `e6rlo71ssyvdl76mpuwa7q00` | Servidor: panini-vps |
| Banco | traveltogether-db | `xl1eqn1fwntar7syfr4tp7rf` | Postgres 17, volume gerenciado pelo Coolify |
| App | traveltogether-api | `wn3lue477vpavm5xzda7lmas` | Imagem: `ghcr.io/thiagopanini/traveltogether-api:latest` |
| App | traveltogether-web | `knxgf5yw8gipu5r37iir3836` | Imagem: `ghcr.io/thiagopanini/traveltogether-web:latest` |

## URLs provisórias (sslip.io)

- API: `http://wn3lue477vpavm5xzda7lmas.2.24.125.180.sslip.io`
- Web: `http://knxgf5yw8gipu5r37iir3836.2.24.125.180.sslip.io`

Substituídas pelo domínio final em `docs/ai-ops/002-dns-setup.md` (issue #3).

## Env vars configuradas

**traveltogether-api:**
- `DATABASE_URL` — URL interna do Postgres 17 (provisional, rotacionar)
- `SENTRY_DSN` — vazio, preencher após criar projeto no Sentry
- `R2_ENDPOINT_URL` — endpoint S3-compatible do Cloudflare R2, ex.: `https://<account-id>.r2.cloudflarestorage.com`
- `R2_BUCKET` — bucket das imagens de capa, ex.: `traveltogether-covers`
- `R2_ACCESS_KEY_ID` — access key com permissão de escrita no bucket de capas
- `R2_SECRET_ACCESS_KEY` — secret key da access key do R2
- `R2_PUBLIC_BASE_URL` — base pública/CDN usada para servir os objetos persistidos
- `COVER_IMAGE_MAX_BYTES` — opcional; limite de upload de capa em bytes (default: `5242880`)

**traveltogether-web:**
- `TRAVELTOGETHER_API_URL` — URL sslip.io da API (provisional, atualizar após DNS)
- `NEXT_PUBLIC_SENTRY_DSN` — vazio, preencher após criar projeto no Sentry

## GitHub Actions secrets configurados

Secrets setados no repositório `ThiagoPanini/traveltogether`:

| Secret | Descrição |
|---|---|
| `COOLIFY_URL` | URL do Coolify: `https://vps.thiagopanini.dev` |
| `COOLIFY_TOKEN` | Token de acesso ao Coolify API (provisional — rotacionar) |
| `COOLIFY_API_UUID` | UUID do app `traveltogether-api` |
| `COOLIFY_WEB_UUID` | UUID do app `traveltogether-web` |
| `SMOKE_TEST_URL` | URL da API para smoke test (sslip.io provisional) |

## Passos manuais pendentes (operador)

1. **Tornar pacotes GHCR públicos** — GitHub → Packages → `traveltogether-api` e `traveltogether-web` → Make public. Necessário para o Coolify puxar as imagens sem credenciais. Alternativa: configurar credenciais de registry no Coolify.
2. **Rotacionar `COOLIFY_TOKEN`** — gerar novo token no Coolify UI, atualizar o secret no GitHub e no `.mcp.json` local.
3. **Rotacionar `DATABASE_URL`** — definir senha forte no Coolify para o banco e atualizar o env var do API.
4. **Backup para R2** — habilitar backup diário no Coolify UI para `traveltogether-db` (Settings → Backups → S3/R2).
5. **Sentry** — criar projeto no Sentry, copiar DSNs para os env vars `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN`.

## Como verificar

```bash
# Checar health da API (após primeiro deploy)
curl http://wn3lue477vpavm5xzda7lmas.2.24.125.180.sslip.io/health

# Trigger manual de redeploy
curl -X POST \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://vps.thiagopanini.dev/api/v1/deploy?uuid=wn3lue477vpavm5xzda7lmas&force=true"
```
