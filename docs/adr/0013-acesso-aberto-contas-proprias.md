# ADR 0013 — Acesso aberto: contas próprias (Google + e-mail com código), allowlist aposentada

- **Status:** Accepted — **supersedes [ADR-0003](0003-modelo-de-acesso-mvp.md)**
- **Data:** 2026-06-13
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [docs/CONTEXT.md](../CONTEXT.md) (boundary `identity`, `Usuário`, invariante 16), [ADR-0003](0003-modelo-de-acesso-mvp.md)

## Contexto

O ADR-0003 desenhou o MVP como **beta fechado**: gate de honra por e-mail contra uma **allowlist global** em env var, sem verificação. Aquela decisão já previa o upgrade ("magic link ou Google OAuth = troca de provider do Auth.js, sem tocar em sessão/autorização") e isolou o "como verificamos você" atrás de uma costura no boundary `identity`. Chegou a hora desse upgrade: o produto deve virar uma **plataforma aberta** onde qualquer pessoa organiza qualquer viagem em grupo.

## Decisão

- **Acesso à plataforma é aberto.** Qualquer pessoa cria a própria conta. **A allowlist é aposentada** como gate global.
- **Autenticação real, dois caminhos:** (1) **Google OAuth**; (2) **e-mail com código** — a pessoa informa o e-mail e recebe um **código de acesso** (OTP) num e-mail transacional **com a marca traveltogether**. Sem senha — não guardamos credenciais.
- **`Membership` é o único controle de acesso a uma `Viagem`.** Sem membership, a `Viagem` é invisível. A separação plataforma × viagem que o ADR-0003 manteve "no papel" agora é a regra real.
- **Convite por e-mail** reaproveita o canal transacional: adicionar alguém é por e-mail; se existe `Usuário`, vincula (confirmando nome+avatar); se não, cria `PendingMembership` e dispara convite. A mecânica JIT de resolução de membership pendente (ADR-0003) é preservada.
- **Perfil:** o `Usuário` ganha `nome de exibição` e `avatar` (Google entrega; no e-mail são coletados/gerados).

## Justificativa

- O ADR-0003 foi explícito em ser uma deviation temporária "**apenas** enquanto beta fechado", com o risco nomeado (qualquer um que saiba um e-mail entra como o dono). Abrir a plataforma **resolve esse risco** ao exigir autenticação real.
- A reversibilidade desenhada no ADR-0003 se paga aqui: troca-se o provider do Auth.js (credentials e-mail-only → Google + OTP) **sem reescrever** sessão nem autorização.
- E-mail com código (em vez de senha) evita guardar credenciais e reusa o mesmo canal transacional do convite.

## Consequências

- **Nova capacidade de plataforma:** e-mail transacional com template da marca (Resend/SMTP no boundary `platform`). Único gatilho de e-mail por enquanto além do código de login: **convite para Viagem** (o resto fica no feed de Atividade in-app).
- **`AUTH_ALLOWLIST` deixa de gatekeepar**; a env var pode ser removida após a migração. O par `AUTH_SECRET` idêntico web↔api continua valendo.
- **Descoberta de usuário é por e-mail + rede** (pessoas com quem já se divide Viagem), sem diretório público nem handle — escolha de privacidade para o mundo aberto.
- O papel **`Membro`**, dormente no MVP, **ativa**: convidado entra como `Membro` por padrão (Organizador promove).

## Opções rejeitadas

- **Manter allowlist + só trocar auth (Google gated):** continuaria beta fechado; contraria o objetivo de plataforma aberta.
- **E-mail + senha clássico:** exigiria guardar/hashear credenciais e fluxo de reset; o código por e-mail entrega "autenticação real" sem esse custo.
- **Diretório global por nome / handle único:** exporia todo usuário à busca de estranhos; preterido por privacidade. Descoberta fica por e-mail + rede.
