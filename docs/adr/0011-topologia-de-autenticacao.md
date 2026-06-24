# 0011 — Topologia de autenticação: API autoridade de identidade, web cliente OAuth/BFF

**Status:** Aceito

## Contexto

A Fase 2 traz o login. O **método** já estava decidido (e-mail com **OTP** ou **Google**); faltava a **topologia**: onde a autenticação vive, **como a API confia em quem chama**, e como a sessão nasce e morre.

Uma restrição externa cravou parte da resposta. `panlabs.tech` é guarda-chuva de **vários** projetos (travelmanager é um subdomínio entre outros). Uma API pública seria `api.panlabs.tech` (ambíguo — de qual projeto?) ou `api.travelmanager.panlabs.tech` (subdomínio de **2 níveis**, que o **Universal SSL grátis do Cloudflare não cobre** — foi o que quebrou no domínio antigo). Ambas ruins → a API **fica interna** (já internalizada na rede `coolify` desde a faxina de 2026-06-23, sem rota pública). Como o callback do OAuth precisa de URL pública, **ele mora no web** (único host público).

## Decisão

**A API é a autoridade de identidade; o web (Next.js + Auth.js v5) é cliente OAuth + BFF. A API nunca é pública.**

- **A API admite contra prova criptográfica**, nunca contra "asserção" do BFF:
  - **Google:** o web faz a dança (Auth.js) e repassa o `id_token` pra API interna, que **verifica via JWKS** (`aud` = `GOOGLE_CLIENT_ID`, `iss`, `exp`, `email_verified`).
  - **OTP:** a API **gera e valida** o código de 6 dígitos que ela própria emitiu.
  - Consequência de segurança: **web comprometido não forja identidade** (não tem como produzir um `id_token` assinado pelo Google nem um código OTP válido).
- **A API cunha o próprio token de sessão** — token **opaco** (aleatório), guardado como `HMAC-SHA256(token, pepper)` na tabela `sessions`, validado por lookup, **revogável** por-dispositivo e global. O opaco trafega **dentro do cookie httpOnly do Auth.js** e é repassado como `Bearer` pelo BFF. Logout limpa o cookie **e** revoga a sessão; `is_active` no `User` é kill-switch.
- **E-mail é a chave natural da identidade.** OTP e Google resolvem pro **mesmo** `Usuário`; o vínculo de provedor externo é registrado em `auth_identities` e só acontece **com e-mail verificado** (anti account-takeover). Permite que o **Convite por e-mail** ([0007](0007-papeis-camadas-e-convite.md)) caia na conta certa depois.
- **Acesso aberto na v1** (sem allowlist); o endpoint de pedir código é **anti-enumeração** (resposta idêntica exista ou não a conta).
- **Segredos por app:** web → `AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`SECRET`, `INTERNAL_API_URL`; api → peppers de sessão/OTP, `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID` (só pra verificar `aud`). Nenhum segredo simétrico de auth compartilhado entre os dois.

## Opções consideradas

- **`AUTH_SECRET` compartilhado — a API decodifica o cookie do Auth.js** — rejeitado: o cookie do Auth.js v5 é **JWE** (criptografado, chave via HKDF); decodificar em Python = reimplementar a derivação, frágil e acoplado à versão; segredo simétrico no app mais exposto.
- **O BFF cunha o token pra API** — rejeitado: o **web** continuaria emissor de identidade (web comprometido forja usuário) e a decisão de admissão ficaria longe de onde os dados de usuário vivem.
- **API pública** (`api.panlabs.tech` ou `api.travelmanager.panlabs.tech`) — rejeitado: ambíguo no guarda-chuva compartilhado / fora do Universal SSL grátis.
- **Sessão JWT stateless** (sem tabela) — considerado, rejeitado: a revogação imediata (por-dispositivo e "sair de todos") vale o custo de um lookup por request.

## Consequências

- A API ganha o ciclo de OTP (`request`/`verify`), envio de e-mail (Resend) e verificação de JWKS do Google; o redirect do OAuth mora no web (`…/api/auth/callback/google`).
- **Toda fase futura herda isto de graça:** papéis por-Viagem, posse do plano pessoal e aceite de Convite ([0007](0007-papeis-camadas-e-convite.md), invariantes 4/9/10) resolvem autorização via `get_current_session` **na API**, onde os dados vivem.
- A `cidade de origem` do `Perfil` ([0006](0006-origem-no-perfil.md)) é capturada no onboarding pós-login.
- Caminho de upgrade limpo: allowlist/Convite e tabela de sessões já existem como pontos de extensão — entram sem mexer na topologia.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md); camada de dados em [0012](0012-camada-de-dados-sqlalchemy.md).
