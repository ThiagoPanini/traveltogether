# As-built — o que existe em apps/web hoje

Este documento descreve **só** o que está implementado em `apps/web` neste momento. O redesenho de `.claude/design/redesign-travelmanager` foi trazido para as superfícies atuais: Landing, Login, Onboarding, Painel de bordo, Nova viagem, Painel da viagem e Pesquisa de translado. Para essas superfícies, o código versionado é a verdade; este documento é o mapa honesto dele.

## Landing (/)

Fronteira: `apps/web/app/page.tsx` + `page.module.css`. A landing pública não usa mais a sequência antiga de `ScrollLayers`; ela abre direto com topbar, marca `travel·manager`, CTA para `/entrar`, herói "O translado da viagem, decidido juntos.", CTA primário "Criar viagem" e link de exemplo para uma Viagem.

O painel visual do herói é o `RouteMotif`: uma rota de exemplo São Paulo → Nova York → Miami → Orlando, com origem, paradas e destino final. Abaixo, a página traz três cards do modelo mental do produto — Paradas, Pesquisa de translado e Preferida — e fecha com o card de decisão por-pessoa: a contagem mostra tendência, mas não decide por ninguém.

## Login (/entrar)

Fronteira: `apps/web/app/entrar/page.tsx`, `sign-in-form.tsx` e `entrar.module.css`. A tela é um card central do redesign com progresso em duas etapas: **E-mail** e **Código**.

No passo de e-mail, o usuário pede um código OTP pelo proxy `/api/otp/request`. A opção Google aparece somente quando `googleEnabled` vem verdadeiro do server; sem credencial configurada, a tela simplesmente não mostra o botão. No passo de código, `OtpInput` coleta 6 dígitos, exibe TTL visual e textual, aplica cooldown de reenvio de 30s e chama `signIn("otp")`; usuário novo segue para `/onboarding`, usuário com perfil segue para `/app`.

## Onboarding (/onboarding)

Fronteira: `apps/web/app/onboarding/page.tsx`, `onboarding-form.tsx` e `onboarding.module.css`. O onboarding agora é uma etapa única de origem-base: nome de exibição, cidade de origem e país. A página server continua sendo gate: sem sessão redireciona para `/entrar`, usuário já onboardado vai para `/app`, usuário novo vê o formulário.

O formulário salva em `/api/profile`, renova a sessão com `update({ needsOnboarding: false })`, faz `router.refresh()` e navega para `/app`. O preview lateral mostra como a origem do Perfil aparecerá nas viagens; origem pertence ao Perfil, não à Viagem.

## Shell autenticado (/app/**)

Fronteira: `apps/web/app/app/layout.tsx`, `app-shell.tsx` e `app-shell.module.css`. Toda a área autenticada agora passa por um shell compartilhado: sidebar no desktop, barra inferior compacta no mobile, topbar de contexto, perfil, logout, contadores de Viagens/Convites e CTA único de **Nova viagem**. A sidebar é colapsável (expandida = ícone + rótulo; compacta = só ícone), persiste em `localStorage` e usa lucide-react para ícones consistentes com estados de foco/hover do Noturno.

## Painel de bordo (/app)

Fronteira: `apps/web/app/app/page.tsx`, `pending-invitations.tsx`, `actions.ts` e `app.module.css`. A home autenticada vive dentro do shell compartilhado e mantém hero "Seu mapa está em movimento.", métricas de Viagens ativas, origem-base e papel, grade de Participações e rail de Convites. Os CTAs duplicados saíram do hero/heading; criar Viagem fica no shell e no empty state quando não há nenhuma Viagem.

O conteúdo vem de `GET /auth/me`, `GET /trips` e `GET /invitations`. Os cartões de Viagem mostram índice, papel, nome, destino em destaque, origem do Perfil → destino, quantidade de Paradas e affordance de abertura do Painel da viagem. O empty state mantém a estética de painel de bordo e cria a primeira Viagem sem prometer dados inexistentes.

## Nova viagem (/app/viagens/nova)

Fronteira: `apps/web/app/app/viagens/nova/trip-wizard.tsx` e `wizard.module.css`. O wizard implementa os seis passos do protótipo: **Destino**, **Paradas**, **Translados**, **Nome**, **Tripulação** e **Resumo**. O layout roda dentro do shell autenticado, com header e stepper no desktop, cabeçalho compacto no mobile, rail de rota sempre visível quando há espaço e footer com avanço/volta.

O rascunho continua salvo em `localStorage` até a confirmação. O passo Destino define a última Parada; Paradas adiciona cidades intermediárias; Translados registra propostas por Trajeto; Nome preserva o casing digitado; Tripulação adiciona convites e papel; Resumo confirma o payload via `/api/trips`, limpa o rascunho e navega para o Painel da viagem criada.

## Painel da viagem (/app/viagens/[id])

Fronteira: `apps/web/app/app/viagens/[id]/page.tsx`, `trip-panel.tsx` e `panel.module.css`. O server component é fino: busca `GET /trips/{id}` via BFF, usa `notFound()` quando a API não autoriza ou não encontra, deriva os Trajetos e entrega o painel navegável para o client, já dentro do shell autenticado.

O painel do redesign tem breadcrumb, herói com papel, origem e descrição da Viagem, fita compacta de rota junto do corpo, progresso de Pesquisas por Trajeto integrado ao bloco de Trajetos, aba superior **Trajetos** ativa e aba **Roteiro** em estado visual de _em breve_ (indisponível, com tooltip). A Tripulação fica apenas no rail lateral com nota de bordo, evitando duplicar navegação. A volta-semente não aparece nesta versão visual; a timeline mostra os Trajetos do protótipo atual e evita o bottom switcher antigo.

## Pesquisa de translado

Fronteira: `apps/web/components/fare-research-timeline.tsx`, `fare-research-wizard.tsx`, `fare-research.module.css` e `apps/web/lib/trips/fare-research.ts`. A timeline mostra um card por Trajeto com contador "Trajeto X de Y", rota, escopo e pesquisas locais. Cada pesquisa mostra pessoa, tipo de translado, detalhe de rota/fornecedor, valor em dinheiro ou pontos, e botão para marcar/desmarcar Preferida naquele Trajeto.

O takeover de Pesquisa agora tem dois passos, como o protótipo redesenhado: **Tipo & escopo** e **Valores**. O canhoto-resumo fica visível no desktop e vira `details` colapsável no mobile. Dinheiro e pontos são dimensões separadas, sem conversão ou ranking; pontos são aceitos para qualquer tipo pesquisável quando o usuário informa essa dimensão.

As Pesquisas ainda são protótipo funcional local: `loadFareResearches`/`saveFareResearches` persistem em `localStorage` por Viagem. Isso preserva navegabilidade e design enquanto as entidades reais de Rota/Trecho/Pesquisa ainda não existem no backend.

## Componentes e peças de suporte

`AppShell`, `OtpInput`, `Wordmark`, `TabChip`, `StatusPill`, `ProgressStrip`, `CrewRow`, `EmBreveCard`, `FareResearchTimeline` e `FareResearchWizard` continuam como peças reutilizáveis. Alguns componentes antigos de exploração visual, como `Reveal` e `ScrollLayers`, ainda podem existir no código, mas não compõem a landing redesenhada atual.

`apps/web/app/tokens/page.tsx`, `apps/web/lib/design/tokens.ts`, `docs/design/tokens.json` e `apps/web/app/globals.css` seguem sincronizados como catálogo de tokens. Divergência entre esses arquivos é bug.

## Acessibilidade do que existe

- `html lang="pt-BR"` é definido no layout.
- Navegação usa `a`/`Link`; comandos usam `button`; cards clicáveis reais são links.
- Estados por cor também têm texto, borda ou rótulo: Preferida, pendente, progresso, TTL de OTP e etapas.
- O takeover de Pesquisa usa `role="dialog"`, `aria-modal`, foco inicial e Escape para fechar.
- A navegação mobile mantém acesso a Painel, Viagens, Criar e Convites.
- Dinheiro e pontos aparecem apenas em Pesquisa de translado, nunca como métrica do Painel.
