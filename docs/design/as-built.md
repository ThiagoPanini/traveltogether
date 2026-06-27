# As-built — o que existe em apps/web hoje

Este documento descreve **só** o que está implementado em `apps/web` neste momento (Fase 0+1: landing pública; Fase 2 em curso: tela de login OTP). Para superfícies já construídas, o código versionado é a verdade; isto é o mapa honesto dele. O que ainda não existe vive em `blueprint.md`.

## A home

Fronteira: `apps/web/app/page.tsx`. É uma **landing pública** — não o fluxo completo Landing → Login → Painel → Rotas (isso é blueprint). A página tem três blocos:

1. **Topo** (container `max-width-wide`, `page-gutter`): header com `Wordmark` pulsante + link "Entrar" (rota `/entrar`); herói com eyebrow mono + estrela `pulse`, headline em segmentos (palavras de destaque em `accent`) e subtítulo; seção "como funciona" com `StepCards`. Cada peça entra via `<Reveal>`.
2. **Camadas** (`ScrollLayers`): o modelo de domínio revelado abaixo da dobra.
3. **Rodapé** (container `max-width-wide`): `Wordmark` reduzido + caption mono, separado por `border-top` `line`.

Copy viva em `apps/web/lib/landing/content.ts`. **Não há** `BoardingPassRibbon` — o componente foi removido; qualquer doc que o cite como as-built está errado.

## Reveal

`apps/web/components/reveal.tsx` + `reveal.module.css`. Componente client que revela conteúdo ao entrar na viewport via `IntersectionObserver` (fade + translateY). Renderiza qualquer elemento (`as` prop) e aceita `delay`, `duration` e `distance`, repassados como custom properties para escalonar revelações irmãs. Threshold `0.12`, `rootMargin` `0px 0px -8% 0px`. Degrada com segurança: sem `IntersectionObserver` ou sob `prefers-reduced-motion: reduce`, marca `visible` de imediato — o conteúdo nunca fica preso em opacity 0. A transição é declarada no CSS Module (não inline) para que reduced-motion a desligue.

## ScrollLayers

`apps/web/components/scroll-layers.tsx`. É a maior peça da home: orquestra cinco camadas de domínio reveladas por scroll, na ordem **Paradas → Trajeto → Rotas → decisão → marca**, cada uma separada por hairline `line` no respiro de 128px. Conteúdo/copy vêm de `lib/landing/content.ts` e respeitam os invariantes de `CONTEXT.md`:

- **Paradas** (`01 · O esqueleto`): cidades em sequência com `→`; a última é o destino, em `accent`. Sem aeroporto — Parada é cidade.
- **Trajeto** (`02 · O que ligar`): o salto derivado entre duas paradas, com a nota explícita "não tem preço".
- **Rotas** (`03 · As opções`): cards de rota candidata; **aqui** surgem os códigos IATA (`GRU`, `JFK`, `MIA`). Rota direta = 1 compra; via Miami = 2 trechos / 2 bilhetes.
- **Decisão** (`04 · A decisão`): card com left-border `accent` e linha por pessoa da tripulação, cada uma com sua status pill (preferiu / prefere / comprou / sem preferida). É decisão **por-pessoa**, sem voto de grupo (CONTEXT inv. 4); a footnote diz que a contagem mostra tendência, não decide.
- **Marca** (`05 · A marca`): fecho com estrela `pulse`, título, wordmark estático próprio (proporção do protótipo) e CTA primário "Criar uma conta" (rota `/entrar`).

Status pills usam sempre cor **e** borda real (`pill()` por tom: success / warning / accent / muted) — nunca cor sozinha.

## Login (/entrar)

`apps/web/app/entrar/page.tsx` (server) + `sign-in-form.tsx` (client) + `entrar.module.css`. `login-card` central full-height (`surface` sobre `bg-root`, borda `line`): wordmark, título "Entrar" e o formulário de login em duas etapas (bala-traçante da Fase 2, #190; Google em #191). **Passo 1** — campo de e-mail (`type=email`, `autocomplete=email`), botão "Continuar", divisor "ou" (hairline `line` dos dois lados) e o botão do Google. O botão do Google é cabeado por `googleEnabled` (a página passa `isGoogleEnabled()`, server-side): com credencial configurada, "Continuar com Google" dispara `signIn("google", { callbackUrl: "/onboarding" })`; sem credencial, degrada para "Google indisponível" `disabled` (espelha o `deploy.yml` que se auto-pula sem token — a tela nunca quebra). **Passo 2** — `OtpInput`, contador de expiração e os botões "Embarcar →" (submit, desabilitado até 6 dígitos), "Reenviar código" (com **cooldown de 30s**: nasce travado como "Reenviar em m:ss" e só re-pede o código quando o contador zera — espelha o teto anti-spam do servidor, #194) e "Trocar e-mail" (volta ao passo 1). O formulário é o único cliente: passo 1 chama o proxy `/api/otp/request`; passo 2 entrega ao provedor `otp` do Auth.js (`signIn("otp", …)`); ambos cunham a sessão na API interna (ADR-0004; Google troca o `id_token` por sessão no callback `signIn`); no sucesso, usuário novo (sem perfil) vai ao `/onboarding` antes da área logada e quem já tem perfil cai direto no `/app` (#192).

## Onboarding (/onboarding)

`apps/web/app/onboarding/page.tsx` (server) + `onboarding-form.tsx` (client) + `onboarding.module.css`. Mesmo `login-card` central do `/entrar` (`surface`, borda `line`): wordmark, título "Quase lá" e o formulário do **Perfil mínimo** (nome de exibição + cidade de origem + país; CONTEXT inv. 6, #192). A página é um gate que usa a **API como autoridade** (não o JWT, que fica obsoleto após onboardar): sem sessão → `/entrar`; `GET /auth/me` com `needs_onboarding` falso → `/app` (não repete a tela para quem volta, inclusive Google retornante); do contrário renderiza o formulário, com o **nome pré-preenchido** do que o provedor deu (Google) ou de um perfil parcial. O formulário: `Nome` (`type=text`, prefill), `Cidade de origem` (`type=text` livre — o mapa cidade→aeroporto é Fase 5, ADR-0006), `País` (`select` da lista curada em `lib/countries.ts`, com placeholder "Selecione o país") e o botão "Concluir" (submit, desabilitado até os três preenchidos). No envio, posta ao proxy `/api/profile` (BFF autenticado → `POST /auth/profile`); no sucesso, **renova a sessão do Auth.js** (`update({ needsOnboarding: false })` — o JWT carimbado no login fica obsoleto após onboardar e o middleware o leria como "ainda falta onboarding"), `router.refresh()` e navega para `/app`; falha mostra erro (`role=alert`) sem sair da tela.

## Home logada (/app)

`apps/web/app/app/page.tsx` (server) + `actions.ts` (Server Action) + `app.module.css`. É a primeira tela **dentro** da área autenticada e, por ora, um **empty-state honesto** (#193): header com `Wordmark` + botão "Sair", e um miolo centrado com a saudação `Olá, {nome}` (nome da sessão; cai para "viajante" se a conta não tem nome) e **uma única linha** — "Criar viagem está chegando.". **Não há** grade global de "em breve": a nota do [ADR-0001](../adr/0001-criterio-e-fronteira-da-v1.md) reserva o `em-breve-card` para dentro de uma Viagem; a shell rica *Minhas Viagens* (timeline, tripulação, cascas) é Fase 3 (`blueprint.md`). "Sair" dispara a Server Action `logout`: revoga a sessão na API (`POST /auth/logout`, com o `Bearer` ainda vivo) **e depois** limpa o cookie do Auth.js (`signOut({ redirectTo: "/entrar" })`) — a ordem importa, revoga no banco antes de encerrar a sessão local.

## Proteção de rota (middleware)

`apps/web/middleware.ts` + `lib/auth/route-guard.ts`. O `matcher` restringe o middleware a `/app/*` — `/`, `/tokens`, `/entrar` e `/onboarding` seguem públicas sem passar por ele (o gate do próprio `/onboarding` é server-side, via API). A decisão pura mora em `guardRoute` (testável sem o runtime do Auth.js): sem sessão → `/entrar`; com sessão mas `needsOnboarding` → `/onboarding`; do contrário, passa. O wrapper `auth` do Auth.js injeta a sessão (lida do JWT no cookie httpOnly) em `req.auth`; o middleware traduz o destino em `NextResponse.redirect`. Por isso o onboarding renova o JWT no sucesso (ver acima): sem renovar, o just-onboarded bateria no middleware com o token velho e voltaria ao `/onboarding`.

## OtpInput

`apps/web/components/otp-input.tsx` + `otp-input.module.css`. Componente client **controlado** (`value`/`onChange`) que coleta o código de embarque de 6 dígitos. `fieldset` rotulado ("Código de embarque", `legend` mono) com seis células `maxlength=1` em grid; cada célula é `input` com `inputmode="numeric"` + `autocomplete="one-time-code"` (casa com o autofill de OTP do sistema), dígito Saira em `accent` sobre `fill-subtle`, borda `line-dashed` que vira sólida `accent` no foco. Digitar avança o foco para a próxima célula; apagar retorna à anterior. Só dígitos entram (não-numéricos são ignorados). O **contador de expiração** mora no formulário (`sign-in-form.tsx`), não no componente: texto "Expira em M:SS" que vira `accent-alert` abaixo de 60s — **nunca** comunica expiração só por cor, o tempo é sempre texto. Tokens: `--fill-subtle`, `--line-dashed`, `--radius-btn`, `--font-display`, `--accent`, `--text-faint`, `--accent-alert`.

## pulse

`apps/web/components/pulse.module.css`. `@keyframes pulse` contínuo de `4.5s` (opacidade `0.55→1`, escala `1→1.12`). Usado na estrela `✦` do `Wordmark` (quando `pulse` prop é true), na estrela do eyebrow do herói e na estrela grande da camada de marca. O elemento é sempre decorativo (`aria-hidden`). Sob `prefers-reduced-motion: reduce`, `animation: none` no próprio módulo — a estrela fica estática.

## StepCards

`apps/web/components/step-cards.tsx`. `ol` sem marcador, com `li` por passo, em grid responsivo `repeat(auto-fit, minmax(240px, 1fr))`, borda externa `line` e divisórias verticais. Cada item: número grande em `accent`, glifo mono decorativo (`aria-hidden`), título `h3` Saira uppercase e corpo. Três passos, copy em `content.ts` (Crie uma conta · Cadastre uma viagem · Organize).

## Wordmark

`apps/web/components/wordmark.tsx`. `span` inline-flex com anel decorativo (`✦`, `aria-hidden`) + texto `travel·manager` em Saira uppercase. Tamanho por prop `size`; o anel deriva de `size * 1.5`. Com `pulse` prop, a estrela recebe a animação `pulse`. Identificador de código é `travelmanager`; o ponto-do-meio é só display de marca.

## Página /tokens

`apps/web/app/tokens/page.tsx` + `apps/web/lib/design/tokens.ts`. Kitchen sink de suporte de design (não fluxo de usuário): renderiza a paleta (`colorTokens`) e a escala tipográfica (`typeScale`) dos tokens vivos. Tem testes (`page.test.tsx`, `tokens.test.ts`). Deve refletir os tokens vivos, não o bundle de origem; divergência entre `tokens.json`, `globals.css` e `tokens.ts` é bug de sincronização.

## Backbone de estilo

`apps/web/app/globals.css` declara todos os tokens em `:root` (espelho de `tokens.json`), um reset enxuto, e os defaults de tipografia: `body` em Public Sans `15px`, `h1–h6` em Saira uppercase, `.mono`/`code` em Spline Sans Mono uppercase, links em `accent`, selection `accent` sobre `bg-root`. `apps/web/app/layout.tsx` injeta as três famílias por `next/font` e define `html lang="pt-BR"`.

## Mapa da criação de viagem

`apps/web/app/app/viagens/nova/route-map.tsx` mantém uma instância client-only de jsVectorMap nos passos 1–2. O estado inicial mostra o globo; a escolha do país anima o zoom e aplica contorno terracota tracejado; a escolha da cidade anima novo foco e posiciona pinos HTML pela projeção `coordsToPoint`. No passo 2, a origem textual do Perfil é procurada de forma best-effort no recorte GeoNames do país e só entra no mapa quando há casamento exato normalizado; essa coordenada não é persistida. O painel tem altura fixa por `--map-panel-height`, e SSR, jsdom ou falha de carregamento mantêm a rota vertical como fallback.

No passo 2, os cards da trilha vertical exibem ponto por papel, cidade em Saira uppercase, país em mono e papel à direita. O destino do passo 1 continua no seletor gated país→cidade; novas Paradas usam `GlobalCityPicker`, que consulta o índice build-time `_all.json`, mostra `Cidade · País` e infere país/coordenadas da escolha. Texto livre continua permitido e produz Parada sem país/coordenadas, que permanece visível na trilha e vira fantasma no mapa.

## Trilha de translados da criação

`apps/web/app/app/viagens/nova/transfer-trail.tsx` apresenta o passo 3 como faixa horizontal de origem → Paradas → destino. Cada nó combina kicker de papel, ponto semântico, cidade em Saira e país em mono; os anéis clicáveis de 44px ficam entre nós, tracejados quando indefinidos e sólidos em terracota quando há proposta. A faixa usa overflow horizontal para itinerários longos. O modal oferece os tipos concretos e “Em discussão” na mesma grade, texto livre com “Aplicar” inline e fechamento visual apenas pelo X do cabeçalho; o aviso de que translados são propostas, não compras, vive neste passo e não no resumo.

## Identidade, Tripulação e resumo da criação

No passo 4, o input do nome usa Saira uppercase apenas por CSS; o rascunho e o payload preservam exatamente o casing digitado. O passo 5 não repete o resumo da viagem: mostra o criador Organizador, uma linha larga de e-mail + adicionar e os cards dos Convites. Cada Convite nasce Membro e pode virar Organizador no toggle do próprio card; a remoção usa botão circular com contorno sutil. O passo 6 põe nome, descrição opcional e `RouteBand` no topo, seguido dos indicadores Cidades, Trajetos e Pessoas convidadas; abaixo, mantém apenas Tripulação, sem repetir Rota ou Translados.

## Painel da viagem (/app/viagens/[id])

`apps/web/app/app/viagens/[id]/page.tsx` (server) + `panel.module.css`. É a **home de uma viagem** — onde se cai após criar. Lê `GET /trips/{id}` via `apiFetch()` (BFF); 404 → `notFound()` (não vaza existência — ADR-0011). Construído **só sobre o `TripBackboneRead`**, sem mudança de backend, e **honesto**: nada de voto/preço/rota mockados — o que depende da exploração (Rota/Trecho/Pesquisa, ainda inexistentes — ADR-0011) vira estado-semente apontando pra frente. Reconcilia o protótipo com o domínio (`blueprint.md` §Painel): marca `travelmanager`, linguagem por-pessoa, sem dinheiro/milhas (inv. 5), sem IATA (inv. 7), sem voto de grupo (inv. 4).

Anatomia: **header** (`Wordmark` + link "← Minhas viagens" com a seta `aria-hidden` + `nav` de seções com `TabChip` — Painel ativo `aria-current` e Roteiro/Orçamento/Ingressos como cascas "em breve" não-focáveis) · **herói** (eyebrow só com a partida "parte 14 set 2026" ou "datas a definir"; `h1` com o nome; subtítulo = paradas em ordem · "N viajantes"; contagem "dias p/ embarque" null-safe via `departureCountdown`, escondida sem data) · **progress strip** (`ProgressStrip`, mede os translados **compartilhados** propostos — "X de Y · Z%" + contador "N em discussão"; escondida quando não há salto compartilhado) · **grade 1.5fr/1fr**: à esquerda a **linha do tempo de Trajetos**, à direita o **rail** (Tripulação + cascas "em breve") · **bottom switcher** fixo (`nav` "Vistas da viagem": Painel ativo + Rotas "em breve"). Stack em coluna única abaixo de 720px.

A **linha do tempo** (`ol` de `TrajetoRow`) é derivada por helper puro `deriveTrajetos` (`lib/trips/backbone.ts`): **sua ida** (casa→1ª parada, `entry_transfer`, por-pessoa) + os **compartilhados** (parada→parada, `desired_transfer`) + **sua volta-semente** (destino→casa, não modelada — só-ida — sem translado nem data). Cada `TrajetoRow` mostra a rota (cidade → cidade), o kicker por-pessoa (sua ida / translado compartilhado / sua volta), a `StatusPill` de 2+1 estados (`trajetoStatus`: accent "proposto: {tipo}" · warning "em discussão" · muted "emerge na pesquisa" na semente) e um card honesto com a proposta + CTA "pesquisa de translado · em breve" **desabilitado** (Rotas não existe). A volta-semente não tem card nem CTA — emerge na pesquisa.

A **Tripulação** (rail) lista membros aceitos por papel (`CrewRow`: avatar de inicial decorativo com anel `line-strong`, nome, cidade, status mono "organiza"/"membro"); o subgrupo "Aguardando aceite" com os Convites pendentes (avatar cego tracejado, e-mail, "aguardando") só aparece **para o Organizador** (`my_role === "organizer"` — convite cego, ADR-0002, blindado em dobro com o backend). As **cascas "em breve"** (`EmBreveCard`: Roteiro/Orçamento/Ingressos) repetem as tabs do topo (redundância aceita por fidelidade).

Componentes reutilizáveis novos (em `apps/web/components/`, cada um com CSS module + teste Vitest, pensados para reuso na futura tela Rotas): `StatusPill` (tom = texto+cor+borda, nunca só cor), `ProgressStrip` (`role="progressbar"`, sem animar largura), `TabChip` (ativo `aria-current` / "em breve" `aria-disabled` não-focável com sufixo `.sr-only`), `EmBreveCard` (borda tracejada, ícone lucide decorativo), `CrewRow` (variante `blind`), `TrajetoRow`. As derivações puras (tipos-espelho do backbone, datas, avanço, Trajetos) moram em `lib/trips/backbone.ts`, todas testadas sem rede.

## Acessibilidade do que existe

- **Idioma**: `html lang="pt-BR"`.
- **Hierarquia de headings**: um único `h1` (herói); seções em `h2`; cards em `h3`. `StepCards` usa `ol/li`, preservando ordem.
- **Glifos decorativos** (`✦`, `◷`, `✈`, `→`, iniciais de avatar): recebem `aria-hidden`. Os que fazem parte de copy visível permanecem como texto.
- **Foco**: links são `a` reais; comandos do login são `button` (submit/`type=button`); nenhum outline de foco é removido — a célula do `OtpInput` ganha borda `accent` visível ao focar.
- **OTP por mais que cor**: o contador de expiração do login combina texto ("Expira em M:SS") + cor (`accent-alert` < 60s), nunca cor sozinha; cada célula tem `aria-label` ("dígito N") e o grupo, label ("Código de embarque").
- **Status por mais que cor**: as pills da camada de decisão e de rotas combinam texto + cor + borda real, nunca cor sozinha.
- **Reduced motion**: tratado em cada peça com movimento — `reveal.module.css` e `pulse.module.css` desligam transição/animação sob `prefers-reduced-motion: reduce`; `Reveal` também checa `matchMedia` no JS para revelar de imediato. Nenhum reset global de movimento esconde a responsabilidade do componente.
- **/tokens**: usa headings e listas; é página de suporte, não fluxo principal.
