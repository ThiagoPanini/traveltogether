# Blueprint — Noturno projetado

> **⏳ PROJETADO — não construído.** Blueprint para as Fases 2–6. Reconcilie cada peça com o domínio (`CONTEXT.md`) **quando** for construí-la, não antes — política just-in-time do [ADR-0003](../adr/0003-faseamento-e-fatiamento.md). O que já existe está em `as-built.md`.

Este documento é a destilação versionada do protótipo de origem (congelado e gitignored em `.claude/design/`). Ele preserva a linguagem visual e a anatomia das peças projetadas, **já reconciliadas com o domínio do travelmanager** — onde o protótipo desenha "votos/escolhida/eleição", aqui está corrigido para a linguagem por-pessoa. Marca = `travelmanager` (nunca `traveltogether`).

## Reconciliação com o domínio (ler antes de construir)

O protótipo de origem fala uma língua que **conflita** com os invariantes do produto. Ao construir qualquer peça abaixo, aplique estas correções — qualquer termo de eleição ou preço fora de Rotas é bug:

| No protótipo de origem | No travelmanager | Por quê |
|---|---|---|
| `votos`, `votou`, `falta votar`, `eleição` | `já preferem`, estado pessoal de Preferida/Comprada | A decisão é **por-pessoa**, sem voto de grupo — CONTEXT inv. 4 · [ADR-0006](../adr/0006-apostas-de-dominio.md). |
| `escolhida` (rota do grupo) | `Preferida de você` / `Preferida de Nome`, ou `selecionada` para estado de UI | Não existe rota escolhida pelo grupo; só Preferida pessoal. |
| Milhas/dinheiro em qualquer tela | só na Pesquisa de translado / Rotas / Ticket | Dinheiro e pontos **nunca** no Painel — CONTEXT inv. 5. |
| "mais barato" cruzando unidades | comparação visual dentro da mesma unidade | Não há conversão moeda↔moeda nem pontos↔dinheiro — CONTEXT inv. 5 · ADR-0006. |
| "linha do tempo trecho a trecho" | Trajeto = salto derivado; Trecho = cada pulo de uma Rota | Não chamar Trajeto de Trecho. |
| IATA em Parada | IATA só em Trecho/Pesquisa | Parada é cidade, sem aeroporto. |
| casca `Tarefas` | cascas V1: Roteiro, Orçamento, Ingressos | "Tarefas" não existe na V1. |

## Linguagem visual

Modo noturno **quente** (azuis petróleo profundos + cremes, não cinza puro), estética retrô-analógica de aviação: cartão de embarque, tripulação, códigos IATA, mapa de voo. Display condensado em caixa-alta contrastando com mono espaçado para metadados. Accent terracota único para marca, CTA, ativo e destaque. Voz pt-BR informal, coletiva e direta; sem jargão financeiro fora das Rotas. (Paleta, escala e tokens completos em `design-spec.md` e `tokens.json`.)

## Componentes projetados

Cada peça abaixo usa apenas tokens (`design-spec.md`). Estados nunca dependem só de cor; foco sempre visível; `span onClick` do protótipo vira controle semântico (`a` para navegação, `button` para comando).

### Painel da Viagem

Container `max-width-panel`. Header com tabs/chips, resumo da viagem, contador de dias, progress strip e grid `1.5fr / 1fr`: coluna principal = timeline de Trajetos com decisões pessoais; rail = tripulação + cards "em breve". **Sem milhas/dinheiro** (inv. 5). Cascas V1: Roteiro, Orçamento, Ingressos.

**Recorte v1 honesto (Painel sobre o esqueleto — resolvido em grill 26/06).** O Painel é construído sobre o `TripBackboneRead` (`GET /trips/{id}`), **sem mudança de backend**, e mora em `/app/viagens/[id]` (enriquecendo a vista crua atual). Como a exploração (Rota/Trecho/Pesquisa/Preferida) ainda não existe ([ADR-0011](../adr/0011-modelo-de-dados-criacao-de-viagem.md)), as peças que dependem dela viram **estados-semente honestos**, não dados falsos:

- **Timeline de Trajetos (coluna principal):** derivada em helper TS puro a partir do `TripBackboneRead` — *sua ida* (casa→1ª parada, `entry_transfer`, por-pessoa) + Trajetos compartilhados (`stops[i].desired_transfer`) + *sua volta* (semente muted "emerge na pesquisa", por-pessoa; a volta não é modelada — só-ida). Cada linha mantém o card com left-accent, mas preenchido com o **translado proposto**, não votos. Status pill = 2 estados: *proposto: [tipo]* (accent) ou *em discussão* (warning); ponta = *sua ida* / *sua volta*. CTA "pesquisa de translado · em breve" desabilitado (Rotas ainda não existe). Zero voto/preço/opção.
- **Progress strip:** mede *translados propostos* — "X de Y trajetos compartilhados com translado proposto · Z%" + contador "N em discussão" (warning). Forward-compat: quando a Pesquisa/Preferida chegar, a mesma barra passa a contar *decididos* (a intenção original do protótipo) sem relayout.
- **Herói:** eyebrow só com a **partida** ("parte 14 set 2026") + contador "dias p/ embarque" (de `departure_date`, null-safe → "datas a definir"). **Sem data-fim** (não modelada). Subtítulo = paradas em ordem · "N viajantes" (`crew.members.length`).
- **Tripulação (rail):** membros aceitos com papel (*organiza* / *membro*); subgrupo muted "Aguardando aceite" com os Convites pendentes, **só pro Organizador** (convite cego, [ADR-0002](../adr/0002-papeis-camadas-e-convite.md)). Sem *votou* / *falta votar*.
- **Chrome (fiel ao protótipo, por escolha do dono):** tabs do topo = Painel ativo + Roteiro/Orçamento/Ingressos "em breve" (desabilitadas); os cards "em breve" do rail repetem essas cascas (redundância aceita por fidelidade); bottom switcher **mantido**, reconciliado pra nav de vista de app — Painel ativo + Rotas "em breve" (Landing/Login saem, não são vistas autenticadas). Marca `travelmanager`.

### Timeline leg

Grid `58px / 20px / 1fr` (data mono · dot de status · conteúdo). Conteúdo: título Saira, status pill, subcódigo mono e decision card opcional embutido. Implementação distingue Trajeto (salto derivado) de Trecho (pulo/compra); IATA só quando o item fala de Trecho/Pesquisa. Pode ser `ol`/`li`; o dot é decorativo se a pill comunica o estado. Sem preço.

### Decision card

Card `surface` com left-border `border-accent-edge` (accent ou warning). Mostra prompt, lista real de Pesquisas/Preferidas visíveis e CTA textual para Rotas. Vocabulário por-pessoa: `2 de 4 já preferem` (nunca `2 votos`), `Preferida de você`/`Preferida de Nome` (nunca `escolhida`), estado pessoal de Preferida/Comprada (nunca `votou`/`falta votar`). O Painel pode **agregar** preferências, mas não decide por ninguém. Sem preço.

### Crew row

Linha flex: avatar inicial (anel `line-strong`, radius `circle`) + nome + status mono. Status usa papéis e estados reais (`organiza` para o papel Organizador; `preferiu`/`comprou`/`sem preferida` para decisão pessoal), nunca `votou`/`falta votar`. Avatar decorativo se o nome está visível; cor nunca é único indicador. Convite só vira membro após aceite.

### Status pill

Pílula `radius-pill`, mono uppercase, com borda semântica. Estados projetados: em decisão/preferências abertas = `accent`; definido/comprado = `success`; em aberto/pendente = `warning`; a registrar = `muted`. O texto basta sem cor; "definido" só quando o dado existe no modelo. Não representa decisão de grupo.

### Progress strip

Rótulo + % mono + trilha de 8px (`radius-bar`, preenchimento `accent`), com contador textual opcional em `warning`. Mostra avanço da Viagem (quantos Trajetos/Pesquisas/decisões pessoais têm estado suficiente) — **nunca** dinheiro, pontos, "economia" ou ranking de melhor opção. `role="progressbar"` só com valor/máximo claros. Não animar largura por padrão; se animar, reduced-motion.

### Route option card

Card selecionável na tela Rotas, para uma Rota candidata de um Trajeto. Ativo = borda `accent` + fundo `fill-accent` + fg `accent`; inativo = `surface` + `line-muted`. Use `selecionada` para estado de UI ou `preferida` para decisão pessoal real — nunca `escolhida` (sugeriria decisão de grupo). `button` ou radio group se a escolha altera o painel na mesma tela. **Sem preço no card** — preço pertence à Pesquisa/ticket. "Com escala" só para Pesquisa/bilhete com escala; dois pulos descrevem-se como dois Trechos ou rota via cidade.

### Flight map

Painel `bg-inset` com grade pontilhada (dois `linear-gradient`), dots IATA posicionados em `%` e paths SVG tracejados (`stroke-dasharray`). Visual informativo e **abstrato** — não promete geografia real e precisa de resumo textual próximo (não depender só do SVG). IATA pertence a Trecho/Pesquisa. Se animar path, reduced-motion renderiza path estático.

### Ticket panel

**Único lugar permitido para dinheiro/pontos** (com Rotas/Pesquisa). Panel `surface` com header, grade de duas colunas para pontos/dinheiro como dimensões **separadas**, e ações pessoais Preferida (toggle) → Comprada (status após Preferida), com `button` reais. Pode haver dinheiro, pontos ou ambos, mas **nunca** conversão nem "mais barato" cruzando unidades; pontos de programas diferentes não se somam (inv. 5). Ida-e-volta é **uma** Pesquisa cobrindo um ou mais Trechos — não duplicação de preço.

### Bottom switcher

Barra fixa centralizada (`position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:50; shadow-switcher`), item ativo `accent/on-accent`. Use `nav` com `aria-label`; ativo com `aria-current="page"`. **Não** entra na landing pública atual só porque existe no protótipo — só quando houver mais de uma vista navegável real no app autenticado.

### Tabs / chips

Para navegação de seção, `nav` com links; para tabs de conteúdo, `tablist`/`tab`/`tabpanel`; chip informativo pode ser `span`. Ativo = `accent` sólido + `on-accent`; inativo = transparente, borda `line-muted`, texto `text-faint`; "em breve" = pílula tracejada/muted, sem fingir interatividade. Estado ativo anunciado (`aria-current`/`aria-selected`); item indisponível não recebe foco.

### "Em breve" card

Card com borda tracejada (`line-dashed`), ícone mono decorativo, título, nota e pill "em breve". Informativo — não parece clicável. Aparece **dentro** de uma Viagem (cascas V1: Roteiro, Orçamento, Ingressos), nunca no menu global. Ícone `aria-hidden`; o texto comunica a indisponibilidade.

## Fluxo de telas

**Landing → Login → Onboarding → Painel de bordo → Painel da Viagem → Rotas.**

| Tela | Container | Conteúdo |
|---|---|---|
| **Landing** | `max-width-wide` | Já implementada como landing pública — ver `as-built.md`. |
| **Login** | `login-card` central, full-height | Tela de login (OTP + Google) já implementada, com reenvio sob cooldown de 30s (#194) — ver `as-built.md`. |
| **Onboarding** | `login-card` central, full-height | Perfil mínimo (nome + cidade de origem + país) pós-1ª auth, já implementado — ver `as-built.md`. |
| **Painel de bordo** | menu lateral + canvas fluido | Home do usuário (`/app`) já implementada com radar esquemático, métricas reais, Convites, Participações e empty-state guiado — ver `as-built.md`. **Sem milhas/dinheiro.** |
| **Painel da Viagem** | `max-width-panel` | Home de uma Viagem (`/app/viagens/[id]`) já implementada com tabs/chips, resumo, progress strip de translados propostos, timeline de Trajetos, Tripulação e cascas "em breve" — ver `as-built.md`. **Sem milhas/dinheiro.** |
| **Rotas** | `max-width-wide`, grid `1.2fr / 1fr` | Paradas & Trajetos derivados + route option cards (esquerda); painel sticky com flight map + ticket panel (direita). Único lugar com dinheiro/pontos. |

Navegação entre telas do app autenticado pelo bottom switcher (quando existir).

## Layout projetado — referência

- Containers: `--page-gutter` (40px), `--max-width-wide` (1040px), `--max-width-panel` (1000px, Painel), `--hero-max` (720px), `--login-card` (400px).
- Z-index: bottom switcher `z-index: 50`; painel sticky de Rotas `top: 24px` sem criar contexto global; flight map mantém SVG/dots dentro do `bg-inset`.
- Breakpoints: preferir CSS intrínseco (`clamp`, `auto-fit`, `minmax`, `flex-wrap`, containers máximos). Só nomear breakpoint quando um layout real exigir decisão que esses padrões não expressem.
