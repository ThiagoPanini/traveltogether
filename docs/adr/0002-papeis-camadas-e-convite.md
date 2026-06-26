# 0002 — Papéis, camadas de escrita e convite com aceite

**Status:** Aceito

## Contexto

Quem pode mexer em quê, e como alguém entra numa Viagem? Precisávamos separar o esqueleto (que não pode virar bagunça) da exploração (que tem que ser livre) e do plano pessoal (que é só do dono).

## Decisão

**Três camadas de escrita** — backbone (só Organizador), exploração (qualquer Membro), plano pessoal (só o dono); detalhe na invariante 9 do [`CONTEXT.md`](../../CONTEXT.md).

- O **criador** da Viagem é o **primeiro Organizador**: modera (apaga qualquer Rota/Trecho/Pesquisa) e pode promover outros.
- **Convite exige aceite explícito** — **ninguém entra sem aceitar** (consentimento, invariante 10). Sem adição instantânea. Se o convidado não tem conta, o convite espera o cadastro.
- O **Convite carrega o papel** que vigora no aceite — **Membro por default**, podendo já ser **Organizador** (o criador atribui ao convidar). Papéis são **reversíveis** depois (promover/rebaixar), então definir no convite é conveniência, não trava.

## Canal (resolvido)

O canal é **e-mail nominal com aceite in-app**. O Organizador convida por **e-mail** — que é a **chave** do Convite e por isso funciona mesmo sem conta (o convite espera o cadastro e casa pelo e-mail no login) — e o convidado **aceita in-app**. O **link compartilhável de entrada fica fora da v1** (possível futuro). Pesou **rastreabilidade e consentimento nominal** acima da fricção-zero do link; o convite **cego** (não vaza nome/cidade de quem ainda não aceitou) respeita a invariante 10 e evita enumeração.

## Opções consideradas

- **Rota como backbone** (só Organizador cria rota) — rejeitado: trava a exploração, que precisa ser livre.
- **Adição instantânea de membro** — rejeitado: sem consentimento.

## Consequências

- Precisa de um **fluxo de aceite**.
- A moderação dá ao Organizador poder de limpar exploração alheia, sem poder tocar no plano pessoal de ninguém.

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md) (invariantes 9–10).
