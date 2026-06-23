# Procedência e deltas

## Resumo

O Tema B Noturno nasceu no bundle congelado de Claude Design em
`.claude/design/design-system-dark-mode/`. Esse bundle é a origem creditada,
não a fonte-da-verdade operacional. Para o que já existe em produção, o código
versionado é a verdade. Para o que ainda não existe, a spec futura vem do bundle
e é marcada como `⏳ projetado, não construído`.

## Origem creditada

| Arquivo do bundle | Uso nesta auditoria |
|---|---|
| `README.md` | Regra de handoff: ler `design-tokens.dc.html`, seguir referências e não renderizar sem pedido. |
| `project/DESIGN.md` | Spec textual: produto, linguagem visual, tokens, componentes, telas e estado. |
| `project/tokens.json` | Tokens originais do Tema B Noturno. |
| `project/design-tokens.dc.html` | Showcase navegável de tokens, componentes e inventário. |
| `project/Tema-B-Moderno-Escuro.dc.html` | Protótipo com quatro telas: Landing, Login, Painel e Rotas. |
| `project/support.js` | Runtime gerado dos Design Components; lido como parte da origem, sem contrato visual próprio. |

O diretório `.claude/design` permanece gitignored por `.gitignore`.

## Fontes vivas

| Fonte viva | Estrato | Papel |
|---|---|---|
| `docs/design/tokens.json` | Implementado + reserva | Fonte viva dos tokens nomeados. |
| `apps/web/app/globals.css` | Implementado | Espelho CSS aplicado ao app. |
| `apps/web/lib/design/tokens.ts` | Implementado | Catálogo TS dos tokens e escala. |
| `apps/web/app/layout.tsx` | Implementado | Injeta Saira Condensed, Public Sans e Spline Sans Mono via `next/font`. |
| `apps/web/app/page.tsx` | Implementado | Home pública atual. |
| `apps/web/components/*` | Implementado | Fronteiras de componente construídas. |
| `apps/web/lib/landing/content.ts` | Implementado | Copy viva da landing. |
| `CONTEXT.md` + `docs/adr/` | Intenção | Invariantes de domínio que filtram a copy futura. |

## Mapa implementado x projetado

| Item | Estrato | Fronteira / spec |
|---|---|---|
| Landing/home pública | **Implementado (as-built)** | `apps/web/app/page.tsx` |
| `Wordmark` | **Implementado (as-built)** | `apps/web/components/wordmark.tsx` |
| `StepCards` | **Implementado (as-built)** | `apps/web/components/step-cards.tsx` |
| `BoardingPassRibbon` | **Implementado (as-built)** | `apps/web/components/boarding-pass-ribbon.tsx` |
| CTAs primário/fantasma | **Implementado localmente** | `apps/web/app/page.tsx` (`primaryCta`, `ghostCta`) |
| Página `/tokens` | **Implementado (suporte)** | `apps/web/app/tokens/page.tsx` |
| Login + OTP | **⏳ Projetado, não construído** | Bundle `Tema-B-Moderno-Escuro.dc.html` |
| Painel da Viagem | **⏳ Projetado, não construído** | Bundle + ADR-0008 para copy/domínio |
| Rotas | **⏳ Projetado, não construído** | Bundle + `CONTEXT.md` para Trajeto/Rota/Trecho/Pesquisa |
| Bottom switcher | **⏳ Projetado, não construído** | Bundle |
| Status pill, progress strip, timeline leg, decision card, crew row, em breve card | **⏳ Projetado, não construído** | Bundle + ADR-0004/0008 |
| Route option card, flight map, ticket panel | **⏳ Projetado, não construído** | Bundle + ADR-0002/0003/0005 |

## Deltas bundle -> as-built

| Delta | Estrato | Classificação | Contrato vivo |
|---|---|---|---|
| `TravelTogether` / `traveltogether` virou `travelmanager` / `travel·manager`. | Implementado | Evolução deliberada | ADR-0010 prevalece; bundle preserva histórico. |
| A home construída é uma landing pública, não o fluxo completo Landing -> Login -> Painel -> Rotas. | Implementado | Faseamento deliberado | CLAUDE.md e roadmap dizem que só Fase 0+1 está implementada. |
| Headline da landing virou três linhas de ação: `Cadastrem`, `Desenhem`, `Pesquisem`. | Implementado | Evolução deliberada | Copy viva mora em `apps/web/lib/landing/content.ts`. |
| Step cards usam grid `auto-fit` em vez de três colunas fixas. | Implementado | Evolução deliberada | Preserva a anatomia do bundle e melhora responsividade. |
| Boarding-pass ribbon mostra ida e volta `GRU -> JFK -> MIA -> MCO -> GRU`; bundle showcase menor tinha quatro paradas e protótipo tinha ida e volta. | Implementado | Evolução deliberada | O contrato as-built é round-trip. |
| Entalhe do ribbon usa `--bg-root`; bundle prescrevia `bg-canvas`. | Implementado | Evolução por contexto | A home atual não tem wrapper `bg-canvas`; entalhe precisa casar com o fundo real. |
| `line-2` do bundle virou token vivo `line-muted` / `--line-muted`. | Implementado | Evolução deliberada | Use o nome vivo; cite `line-2` só como procedência. |
| CTAs são anchors locais, não componente compartilhado. | Implementado | Faseamento | Contrato de botão existe em `components/buttons.md`; extração só quando houver reuso real. |
| Bottom switcher fixo não existe na home. | Implementado | Faseamento | Só entra quando houver navegação de app autenticado/telas da Viagem. |

## Conflitos forma x intenção

Estes conflitos já estão previstos por ADRs e devem ser resolvidos ao construir
as superfícies projetadas:

| Conflito do bundle | Intenção viva | Ação futura |
|---|---|---|
| `votos`, `votou`, `falta votar`, `escolhida`. | Decisão é por-pessoa: Preferida -> Comprada, sem eleição de grupo. | Reescrever para `já preferem`, `Preferida`, `Comprada`, estado pessoal visível. |
| Casca `Tarefas`. | V1 usa cascas Roteiro, Orçamento, Ingressos. | Trocar `Tarefas` por `Orçamento`. |
| "Linha do tempo trecho a trecho" para aquilo que é Trajeto. | Trajeto é o salto derivado; Trecho é cada pulo de uma Rota. | Nomear a UI conforme `CONTEXT.md` antes de implementar. |
| "Rota com escala" para `GRU -> BOG -> JFK` como dois voos. | Escala é campo de Pesquisa; dois pulos são dois Trechos/compras. | Escrever como rota via Bogotá ou Trechos separados, conforme modelo. |
| IATA em Parada. | Parada é cidade; IATA vive em Trecho/Pesquisa. | IATA só em componentes de translado/pesquisa, não como atributo da Parada. |
| Valores de milhas/dinheiro em qualquer lugar fora de Rotas/Pesquisa. | Dinheiro e pontos só na Pesquisa de translado, nunca no Painel. | Bloquear preço no Painel e em shells. |

## Higiene de tokens

### Tokens usados hoje na home

`--bg-root`, `--accent`, `--on-accent`, `--surface`, `--line`,
`--line-dashed`, `--line-strong`, `--text-bright`, `--text-body`,
`--text-muted`, `--text-faint`, `--text-faintest`, `--radius-circle`,
`--radius-lg`, `--radius-btn`, `--border-hairline`, `--border-outline`,
`--page-gutter`, `--max-width-wide`, `--hero-max`, `--font-display`,
`--font-body`, `--font-mono`.

### Tokens de reserva

Reserva não é fiado: estes tokens existem porque o bundle/produto projetado
precisa deles, mas ainda não aparecem na home construída.

`--bg-canvas`, `--bg-inset`, `--surface-bar`, `--fill-subtle`,
`--fill-accent`, `--line-muted`, `--line-faint`, `--text-mono`,
`--accent-alert`, `--success`, `--warning`, `--success-border`,
`--warning-border`, `--accent-border`, `--radius-pill`, `--radius-md`,
`--radius-card`, `--radius-sm`, `--radius-bar`, `--border-accent-edge`,
`--max-width-panel`, `--login-card`, `--shadow-switcher`.

## Literais conscientes

| Literal | Onde | Token-espelho / regra |
|---|---|---|
| Hex e rgba dentro de `docs/design/tokens.json` | Fonte viva de tokens | Valor canônico; mudar exige sincronizar CSS e catálogo TS. |
| Hex e rgba em `apps/web/app/globals.css` | Espelho CSS | Deve continuar igual a `tokens.json`. |
| Hex em `apps/web/lib/design/tokens.ts` | Catálogo TS/testes | Deve continuar igual a `tokens.json` e `globals.css`. |
| `clamp(40px, 8vw, 74px)` e `clamp(28px, 5vw, 42px)` | Home | Literal responsivo consciente; teto espelha escala hero/H2. |
| Medidas locais pequenas (`gap`, `padding`, `fontSize`) nos componentes | Componentes implementados | Permitidas quando são geometria local; se virarem padrão repetido, promovem token. |

## Log de execução

- 2026-06-23: Fase 0 executada em pt-BR.
- Bundle lido integralmente; `support.js` identificado como runtime gerado.
- Código da home, tokens, testes, ADRs, roadmap e CI inventariados.
- `git check-ignore` confirmou `.claude/design` como gitignored.
- Worktree estava limpa em `main`; branch criada: `docs/design-contract`.
- `docs/design/DESIGN.md` removido para não competir com o contrato vivo.
- `docs/design/tokens.json` formatado com Biome depois da atualização de
  metadados.
- Verificações:
  - `node_modules/.bin/biome check docs/design/tokens.json` -> ok.
  - `node_modules/.bin/biome check apps/web` -> ok.
  - `pnpm --filter @travelmanager/web typecheck` via `rtk` mostrou falso
    negativo do wrapper; saída crua com `rtk proxy pnpm --filter
    @travelmanager/web typecheck` -> `tsc --noEmit`, código 0.
  - `pnpm --filter @travelmanager/web test` -> 3 arquivos, 11 testes, todos
    passando.
  - `pnpm --filter @travelmanager/web build` -> Next build ok, rotas `/` e
    `/tokens` prerenderizadas.
