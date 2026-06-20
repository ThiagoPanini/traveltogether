# 0007 — Papéis, camadas de escrita e convite com aceite

**Status:** Aceito (o **canal** do convite ainda em aberto)

## Contexto

Quem pode mexer em quê, e como alguém entra numa Viagem? Precisávamos separar o esqueleto (que não pode virar bagunça) da exploração (que tem que ser livre) e do plano pessoal (que é só do dono).

## Decisão

**Três camadas de escrita:**

| Camada | O quê | Quem |
|---|---|---|
| **Backbone** | Paradas, datas, destino, membros | só **Organizador** |
| **Exploração** | Rota, Trecho, Pesquisa | qualquer **Membro** |
| **Plano pessoal** | Preferida, Comprada | só o **dono** |

- O **criador** da Viagem é o **primeiro Organizador**: modera (apaga qualquer Rota/Trecho/Pesquisa) e pode promover outros.
- **Convite exige aceite explícito** — **ninguém entra sem aceitar** (consentimento). Sem adição instantânea. Se o convidado não tem conta, o convite espera o cadastro.

## Em aberto

O **canal** do convite — **e-mail nominal com aceite in-app** vs **link compartilhável de entrada** — ainda não está cravado. Ambos preservam a invariante do consentimento; a decisão é de fricção vs rastreabilidade. A definir antes de implementar o fluxo.

## Opções consideradas

- **Rota como backbone** (só Organizador cria rota) — rejeitado: trava a exploração, que precisa ser livre.
- **Adição instantânea de membro** — rejeitado: sem consentimento.

## Consequências

- Precisa de um **fluxo de aceite**.
- A moderação dá ao Organizador poder de limpar exploração alheia, sem poder tocar no plano pessoal de ninguém.

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md) (invariantes 9–10).
