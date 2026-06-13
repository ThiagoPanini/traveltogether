# ADR 0003 — Modelo de acesso do MVP: gate por e-mail sem verificação

- **Status:** **Superseded by [ADR-0013](0013-acesso-aberto-contas-proprias.md)** (acesso aberto; allowlist aposentada) — vigorou no beta fechado
- **Data:** 2026-06-08
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [docs/CONTEXT.md](../CONTEXT.md) (boundary `identity`, invariante 10)

## Contexto

O MVP serve um **grupo fechado de amigos** organizando uma viagem específica. Os dados são de **baixa sensibilidade** (preços de passagem, itinerário). Velocidade importa. O brief descreve uma tela que pede o e-mail e libera o acesso se ele estiver entre os permitidos.

## Decisão

- **Gate por e-mail SEM verificação:** digita o e-mail → se estiver na allowlist, entra. Sem senha, sem magic link, sem OAuth.
- **Allowlist global em variável de ambiente** (e-mails separados por vírgula), gerida pelo dono no deploy.
- **Sessão JWT** emitida após o gate (cookie httpOnly); a `apps/api` confia no JWT. Implementado via **Auth.js com um provider "credentials" e-mail-only**, para que o plumbing de sessão seja idêntico ao que magic link/OAuth usariam.
- **Criação JIT** do `Usuário` no primeiro acesso. Membership de Viagem pode referenciar um e-mail que ainda não logou (**pendente**) e resolve para `Usuário` no primeiro acesso.

## Justificativa

- Grupo de confiança + dados de baixa sensibilidade + foco em velocidade tornam o custo de auth real injustificado **agora**.
- **Risco nomeado:** qualquer pessoa que saiba o e-mail de um membro entra como ele. Aceito **apenas** enquanto beta fechado.
- **Reversibilidade desenhada:** o "como verificamos você" fica isolado atrás de uma costura no boundary `identity`. Upgrade para magic link ou Google OAuth = **troca de provider do Auth.js**, sem tocar em sessão/autorização. Por isso a decisão não pinta o projeto num canto, apesar de ser uma deviation deliberada do caminho seguro.

## Consequências

- **Não é autenticação real** — é um gate de honra. Documentado para que ninguém leia o código e pense que é descuido.
- Mudar a allowlist exige redeploy/restart (escolha consciente pelo mínimo; ver opções rejeitadas).
- A separação **allowlist global** (quem passa o gate) × **membership** (quem está numa Viagem) é mantida no modelo, mesmo que coincidam no MVP.

## Opções rejeitadas

- **Magic link (Auth.js + Resend):** autenticação real e universal; preterida pela velocidade no MVP fechado, mas é o upgrade-alvo.
- **Google OAuth + allowlist:** real e sem infra de e-mail; preterida por assumir conta Google de todos.
- **Allowlist em tabela no banco / convite-concede-acesso:** mais operável/descentralizado; preterido em favor do env var por simplicidade máxima no beta fechado.
