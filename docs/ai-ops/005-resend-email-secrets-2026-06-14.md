# 005 — Resend: provisionamento de API key e-mail (🔴 HITL)

**Data:** 2026-06-14  
**Issue:** #57 (feat(identity): login por e-mail com código OTP)  
**Status:** Aguardando operador

---

## O que o agente entregou

- `email_service.py` no boundary `platform` com template Atlas (papel/floresta/laranja, código em mono)
- `send_otp_email(email, code)` — envia código OTP via Resend; loga em dev se `RESEND_API_KEY` ausente
- `send_invite_email(email, trip_name, ...)` — template de convite para Viagem (reusado em #65)
- `OtpCode` model + `otp_service.py` — geração, validação, rate limit (3/15min), expiração (10min)
- Endpoints `POST /identity/otp/request` e `POST /identity/otp/verify`
- UI split-flap mono em `apps/web/app/login/otp-form.tsx`
- `.env.example` documenta `RESEND_API_KEY`

## O que o operador precisa fazer

### 1. Criar conta e verificar domínio no Resend

1. Acesse [resend.com](https://resend.com) e crie conta
2. Vá em **Domains → Add Domain**
3. Adicione `traveltogether.paninit.com`
4. Configure os DNS records no Cloudflare (TXT + MX para DMARC):
   - Os records são exibidos na UI do Resend após adicionar o domínio
5. Aguarde verificação (geralmente <5 min com Cloudflare)

### 2. Gerar API key

1. Resend → **API Keys → Create API Key**
2. Nome: `traveltogether-production`
3. Permissão: **Full Access** (ou Sending Access)
4. Copiar a key

### 3. Adicionar secret ao Coolify

```bash
# Via Coolify UI: app traveltogether-api → Environment Variables
RESEND_API_KEY=<valor>
```

### 4. Redeploy

Após salvar, redeploy do serviço `traveltogether-api`.

### 5. Verificar

- Acessar `/login`
- Selecionar "E-mail com código"
- Inserir e-mail válido → deve receber e-mail com código em <30s
- Inserir código → deve entrar na plataforma

---

**Risco:** sem `RESEND_API_KEY`, o e-mail não é enviado — o código é logado em INFO. O app não quebra, mas o fluxo OTP fica inutilizável em produção.
