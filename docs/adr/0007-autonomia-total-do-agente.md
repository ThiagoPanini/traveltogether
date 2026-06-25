# 0007 — Autonomia total do agente no escopo do projeto

**Status:** Aceito

## Contexto

A autonomia do agente já era a prática de fato — os prompts de execução diziam, em todas as letras, "abra o PR → espere o verde → **faça o merge**, sem pedir confirmação". Mas essa norma vivia **fragmentada e em parte não-versionada**: a única âncora durável era o [0003](0003-faseamento-e-fatiamento.md) (cadência + dicotomia AFK/HITL); o resto morava nos `prompts/` (gitignored, reescritos a cada sessão). O operador reafirmava a autonomia toda vez — custo recorrente que este ADR existe para zerar.

O eixo herdado também ficou **cego ao que o agente alcança hoje**. "HITL = depende de borda (secret/DNS/produção)" foi escrito quando deploy e DNS eram operações de humano. Hoje o agente tem Coolify MCP, Cloudflare MCP e Hostinger MCP: deploya, mexe no DNS do projeto e gera segredo simétrico que a própria máquina produz. Tratar isso como "borda humana" trava trabalho que o agente faz sozinho com segurança. O que importa não é *se a operação é reversível*, mas *se a máquina consegue executá-la e se ela é só deste projeto*.

## Decisão

**O agente opera com autonomia total sobre tudo que é escopo do projeto** — implementar, fazer deploy/redeploy, mexer em env, gerar segredo que a máquina consegue gerar, rodar migration, criar/dropar recurso próprio no Coolify e **mergear PR verde**. Isso é a norma; faz sozinho, sem reafirmar autonomia a cada vez.

**Pare e chame o operador em exatamente 4 casos** — quando a operação:

1. **Te trancaria pra fora** — senha de root/painel, credencial de acesso do operador, qualquer regra de firewall, ou rotacionar o token de infra que o próprio MCP usa.
2. **Recriaria o substrato** — destruir/recriar a VM (ver [0008](0008-substrato-compartilhado-e-deploy.md)).
3. **Exige um segredo de terceiro** que você não tem como ser — `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, client_secret de OAuth, API key paga de console.
4. **Tocaria outro projeto** no Coolify compartilhado — disciplina de alvo: confirme que o recurso é deste projeto antes de qualquer operação mutante (o substrato é compartilhado — [0008](0008-substrato-compartilhado-e-deploy.md)).

**Na dúvida sobre cair num dos quatro, pare. Fora deles, faça.**

A fronteira é de **capacidade/acesso, não de reversibilidade** — substitui o eixo AFK/HITL-por-borda do [0003](0003-faseamento-e-fatiamento.md). Concretamente recalibra o que sai de "humano": **DNS** (Cloudflare MCP), **deploy/produção** e **segredo auto-gerável** (`SESSION_PEPPER`, `AUTH_SECRET` via `openssl rand`) passam a ser autônomos; só os 4 casos acima ficam com o operador. A label `status:hitl` é redefinida por isso (ver [`../agents/triage-labels.md`](../agents/triage-labels.md)).

## Premissa

Esta fronteira vale **porque o portfólio é experimental, solo e de baixo risco**, com dados reproduzíveis: sem usuários reais nem SLA na v1, Postgres recriável, segredos rotacionáveis. O blast-radius compartilhado da VPS é aceito nesse contexto ([0008](0008-substrato-compartilhado-e-deploy.md)).

## Gatilhos de reabertura

A fronteira **se reaperta** — e este ADR volta à mesa — se qualquer um acontecer: usuários reais / SLA; multi-tenant; VPS ou ambiente dedicado por projeto; ou o operador deixar de ser o único dev. Não são regras atuais, são gatilhos de revisão.

## Relação com a cadência de fase

Autonomia **operacional** (este ADR) é ortogonal à **cadência de planejamento** do [0003](0003-faseamento-e-fatiamento.md): *qual* fase/feature fatiar a seguir continua sendo decisão do operador, disparada por ele. Dentro das issues já fatiadas, a execução é autônoma de ponta a ponta, incluindo o merge.

## Opções consideradas

- **Eixo de reversibilidade / risco** (semáforo 🟢🟡🔴, "operação destrutiva exige aprovação") — rejeitado: a pergunta certa não é "dá pra desfazer?" e sim "a máquina consegue e é só deste projeto?". Reversibilidade barra trabalho seguro (deploy é reversível na prática, mas seria "produção") e libera trabalho perigoso (dropar o recurso errado é irreversível, mas "cabe" no projeto). Capacidade/acesso mira o que realmente importa.
- **Manter o merge humano** (status quo das strings do `pr-checks`) — rejeitado: contradiz a prática real (os prompts já mandavam mergear) e gargala o agente num passo que o gate verde já cobre.
- **Deixar a doutrina só nos `prompts/`** — rejeitado: não-versionada, perde-se entre sessões, e força o operador a reafirmar autonomia a cada execução — exatamente o custo que se quer eliminar.

## Consequências

- A label `status:hitl` deixa de significar "secret/DNS/produção" e passa a significar "um dos 4 casos" ([`../agents/triage-labels.md`](../agents/triage-labels.md)); `status:ready-for-agent` (AFK) vira a norma esmagadora.
- O `pr-checks` para de afirmar "merge continua humano" — o merge é autônomo no verde.
- O agente encadeia issues `status:ready-for-agent` abertas (sem `status:blocked`) até acabarem, parando só se o operador pedir — o fluxo está em [`../agents/workflow.md`](../agents/workflow.md).
- O [0003](0003-faseamento-e-fatiamento.md) tem o seu bullet AFK/HITL remetido a este ADR; a cadência de fase segue intacta.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md); substrato e deploy em [0008](0008-substrato-compartilhado-e-deploy.md); fluxo operacional em [`../agents/workflow.md`](../agents/workflow.md).
