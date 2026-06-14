# 004 — Google OAuth: provisionamento de secrets (🔴 HITL)

**Data:** 2026-06-14  
**Issue:** #56 (feat(identity): login com Google)  
**Status:** Aguardando operador

---

## O que o agente entregou

- `GoogleProvider` configurado em `apps/web/auth.ts` (condicional: só ativa se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estiverem presentes)
- Botão "Continuar com Google" em `apps/web/app/login/login-form.tsx`
- JWT de API inclui `display_name` e `avatar_url` do perfil Google
- JIT de `Usuário` na API popula nome e avatar na primeira autenticação
- `.env.example` documenta as variáveis

## O que o operador precisa fazer

### 1. Criar credenciais OAuth no Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Selecione (ou crie) o projeto `traveltogether`
3. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth 2.0**
4. Tipo: **Aplicativo da web**
5. Origens JavaScript autorizadas:
   - `https://traveltogether.paninit.com` (produção)
   - `http://localhost:3000` (dev local)
6. URIs de redirecionamento autorizados:
   - `https://traveltogether.paninit.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
7. Copiar **Client ID** e **Client Secret**

### 2. Adicionar secrets ao Coolify

```bash
# Via Coolify UI: app traveltogether-web → Environment Variables
GOOGLE_CLIENT_ID=<valor>
GOOGLE_CLIENT_SECRET=<valor>
```

Ou via `gh secret` se CI/CD estiver usando GitHub Actions para deploy.

### 3. Redeploy

Após salvar as env vars, redeploy do serviço `traveltogether-web` no Coolify.

### 4. Verificar

- Acessar `/login` → botão "Continuar com Google" visível
- Clicar → redireciona para consent screen Google
- Após autorizar → redireciona para `/trips` com sessão ativa

---

**Risco:** sem os secrets, o botão Google **não aparece** (provider condicional). O app não quebra.
