# TravelManager — Tema B · Modo Escuro (Noturno)

Spec de design completa do protótipo **`Tema-B-Moderno-Escuro.dc.html`**, escrita para que um agente de IA reconstrua ou estenda a interface com fidelidade. Tokens legíveis por máquina em [`tokens.json`](tokens.json). O protótipo navegável e o showcase vivem no claude.ai/design (ver **Procedência**, ao final).

---

## 1. Produto

TravelManager é um **caderno de bordo compartilhado** para planejar viagens em grupo. O grupo (1) cadastra a viagem, (2) desenha as paradas cidade a cidade e (3) pesquisa o translado entre cada parada, decidindo junto.

**Princípio de produto inquebrável:**
> **Milhas e dinheiro vivem só na pesquisa de translado (tela Rotas) — nunca no Painel.** O Painel mostra decisões e progresso; valores aparecem apenas quando o grupo pesquisa o translado.

Caso de uso de exemplo no protótipo: *EUA Trip*, São Paulo → Nova York → Miami → Orlando → São Paulo, 4 viajantes, 14 set → 02 out 2026.

---

## 2. Linguagem visual

Modo noturno **quente** (azuis petróleo profundos + cremes, não cinza puro). Estética retrô-analógica de aviação: cartão de embarque, tripulação, códigos IATA, mapa de voo. Tipografia condensada em caixa alta contrastando com mono espaçado para metadados.

**Tom de voz:** PT-BR informal, coletivo e direto ("Cadastrem", "Desenhem", "decidam juntos"). Metáfora de aviação como vocabulário (embarque, tripulação, translado, caderno de bordo). Sem jargão financeiro fora das Rotas.

---

## 3. Cores

### Fundos (do mais profundo ao realce)
| Token | Hex | Uso |
|---|---|---|
| `bg-root` | `#0f171e` | raiz da página (html/body) |
| `bg-canvas` | `#14202b` | tela principal do app · **texto sobre accent** |
| `bg-inset` | `#101920` | painel do mapa (recuo) |
| `surface` | `#1a2530` | cartões e superfícies |
| `surface-bar` | `#1e2a35` | barra inferior (switcher) |
| `fill-subtle` | `#243240` | inputs · trilha de progresso · toggle ativo |
| `fill-accent` | `#33231e` | cartão de rota selecionada (tinta quente do accent) |

### Bordas & linhas
| Token | Hex | Uso |
|---|---|---|
| `line` | `#2b3945` | hairline 1px · divisores primários |
| `line-2` | `#33424f` | borda da switcher · cartão inativo |
| `line-dashed` | `#3a4a57` | bordas tracejadas · borda de input |
| `line-strong` | `#4a5a66` | contorno de botão fantasma · anel de avatar |
| `line-faint` | `#5a6570` | ícones/dots apagados |

### Texto
| Token | Hex | Uso |
|---|---|---|
| `text-bright` | `#f4ecda` | títulos mais claros (creme) |
| `text-body` | `#e9e1cf` | corpo primário (off-white quente) |
| `text-muted` | `#9aa7b1` | secundário · parágrafos de apoio |
| `text-mono` | `#8a96a0` | mono apagado |
| `text-faint` | `#7d8a93` | rótulos / captions mono |
| `text-faintest` | `#6b7680` | texto mínimo |

### Acentos & semântica
| Token | Hex | Uso |
|---|---|---|
| `accent` | `#df6a4d` | marca · CTA · ativo · destaque |
| `accent-alert` | `#e8856e` | variante de alerta (ttl < 60s) |
| `on-accent` | `#14202b` | texto/ícone sobre superfície accent |
| `success` | `#4fa58e` | concluído · status "definido" |
| `warning` | `#e0a948` | pendente · status "em aberto" |

**Bordas semânticas (com alpha):** accent `rgba(223,106,77,0.45)` · success `rgba(79,165,142,0.45)` · warning `rgba(224,169,72,0.45)`.

**Selection:** fundo `#df6a4d`, texto `#0f171e`.

---

## 4. Tipografia

Três famílias com papéis fixos (Google Fonts):

- **Saira Condensed** (500/600/700) — display, títulos, números grandes, botões, chips. **SEMPRE caixa alta.** line-height 0.85–0.9, tracking 0.03–0.06em.
- **Public Sans** (400/500/600) — corpo e parágrafos. Caixa normal, line-height 1.45–1.55, 13–17px.
- **Spline Sans Mono** (400/500) — rótulos, metadados, captions, códigos IATA. Caixa alta, tracking 0.06–0.16em, 9–13px.

### Escala
| Papel | Família | Tamanho | Peso |
|---|---|---|---|
| Hero | Saira | 74px | 700 |
| H1 painel | Saira | 56px | 700 |
| H2 seção | Saira | 34–42px | 700 |
| Título de card | Saira | 18–22px | 600 |
| Corpo | Public Sans | 14–17px | 400 |
| Rótulo mono | Spline Sans Mono | 9–13px | 500 |

---

## 5. Espaçamento & forma

**Raios:** `50%` (avatares/dots/logo) · `99px` (pílulas) · `12px` (cards grandes/boarding pass) · `10px`/`9px` (painéis/cards de rota) · `7–8px` (botões/chips/inputs) · `2px` (barra de progresso).

**Bordas:** `1px` hairline · `1.5px` contorno/dot · `3px` acento esquerdo do card de decisão.

**Larguras:** gutter `40px` · landing/rotas máx `1040px` · painel máx `1000px` · hero `720px` · card de login `400px`.

**Sombra:** switcher `0 8px 26px rgba(0,0,0,0.4)`.

---

## 6. Componentes

| Componente | Anatomia |
|---|---|
| **Logo lockup** | Anel ✦ 1.5px accent + wordmark Saira caixa alta, tracking 0.05–0.06em. |
| **Step cards** | Grade 3 colunas; número accent grande + ícone mono + título + corpo. Borda externa 1px, divisórias verticais `line`. |
| **Boarding-pass ribbon** | Faixa `surface`; header com borda tracejada; dois entalhes circulares (cor = `bg-canvas`) posicionados nas laterais (`left/right: -9px`). |
| **OTP input** | 6 células quadradas (aspect-ratio 0.9), fundo `fill-subtle`, dígito Saira 700 em accent. |
| **Botões** | Primário = `accent` bg / `on-accent` texto, raio 7px; Fantasma = 1.5px `line-strong`; Texto = accent com "→". |
| **Abas / chips** | Ativo = accent sólido + `on-accent`; inativo = transparente, borda `line-2`, texto `text-faint`; "em breve" = pílula tracejada. |
| **Status pill** | Pílula 99px, cor + borda alpha por status: em decisão (accent) · definido (success) · em aberto (warning) · a registrar (muted). |
| **Progress strip** | Trilha `fill-subtle` 8px raio 2px + preenchimento accent; rótulo + % mono + contador de decisões em warning. |
| **Timeline leg** | Grade `58px / 20px / 1fr` (data mono · dot de status · conteúdo). Título Saira + status pill + sub-código mono; decision card opcional embutido. |
| **Decision card** | `surface` com left-border 3px (accent ou warning); prompt + opções (dot + nome + meta + voto) + CTA texto. |
| **Crew row** | Avatar inicial (anel 1.5px `line-strong`) + nome + status mono colorido por papel (organiza=accent, votou=mono, falta votar=warning). |
| **"Em breve" card** | Borda tracejada `line-dashed`; ícone mono + título `text-muted` + nota + pílula "em breve". |
| **Route option card** | Selecionável. Ativo = borda accent + bg `fill-accent` + fg accent + tag "escolhida"; inativo = `surface` + `line-2` + tag "trocar". |
| **Flight map** | Painel `bg-inset`; grade pontilhada via dois `linear-gradient`; dots IATA posicionados em %; paths SVG tracejados (`stroke-dasharray`). |
| **Ticket panel** | Header + grade Milhas/Dinheiro (Saira 700) + toggles Prefiro/Comprei. **Único lugar com valores monetários.** |
| **Bottom switcher** | Barra fixa centralizada (`position:fixed; bottom:20px; left:50%`); item ativo = accent sólido; sombra forte. |

---

## 7. Telas & fluxo

Fluxo: **Landing → Login → Painel → Rotas** (navegação livre pela switcher inferior).

| Tela | `screen` | Conteúdo |
|---|---|---|
| **Landing** | `landing` | Passo a passo (3 cards) + boarding-pass ribbon do grupo. CTA "Criar viagem" / "Ver exemplo". |
| **Login** | `login` | Controle de embarque: OTP 6 dígitos, contador de expiração + reenvio, "Continuar com Google". |
| **Painel** | `home` | Linha do tempo trecho a trecho + decisões inline + tripulação + "em breve". **Sem milhas/dinheiro.** |
| **Rotas** | `routes` | Paradas & trajetos, mapa de voo, ticket com milhas/dinheiro. Pesquisa de translado. |

---

## 8. Estado & lógica

Componente React-like (`DCLogic`). Estado inicial:
```js
state = { screen:'landing', route1:'direct', pref:true, bought:false, resend:28, ttl:573 }
```

| Variável | Tipo / valores | Comportamento |
|---|---|---|
| `screen` | `'landing' \| 'login' \| 'home' \| 'routes'` | controla qual `sc-if` renderiza |
| `route1` | `'direct' \| 'alt'` | rota do trecho 1, **compartilhada** entre a decisão do Painel, a seleção em Rotas e o Ticket |
| `pref` | boolean | toggle "Prefiro" no ticket |
| `bought` | boolean | toggle "Comprei" no ticket |
| `resend` | number (28→0s) | `setInterval` 1s; ao chegar a 0 o botão "Reenviar código" ativa |
| `ttl` | number (573→0s) | expiração do código; abaixo de 60s muda para `accent-alert` |

Ticket por rota: `direct` → 135.530 milhas / R$ 242,21 (GRU → JFK direto); `alt` → 98.000 milhas / R$ 680,00 (GRU → BOG → JFK).

---

## 9. Arquivos

Neste repositório vivem apenas a spec e os tokens; o restante é do projeto-fonte no claude.ai/design (ver **Procedência**):

- `tokens.json` — tokens legíveis por máquina. *(neste repo)*
- `DESIGN.md` — este documento. *(neste repo)*
- `Tema-B-Moderno-Escuro.dc.html` — protótipo navegável, 4 telas + switcher. *(claude.ai/design)*
- `design-tokens.dc.html` — referência visual navegável. *(claude.ai/design)*
- `support.js` — runtime dos Design Components, não editar. *(claude.ai/design)*

---

> **Procedência:** importado de claude.ai/design (projeto "Design System Dark Mode", `41dd75d8-82a0-4fa0-9c8c-e68169cdce47`) em 2026-06-20. O protótipo navegável e o showcase vivem lá; aqui ficam a spec e os tokens, que são a fonte-da-verdade visual para a implementação. Reconciliação com o domínio em [`../../CONTEXT.md`](../../CONTEXT.md) e [`../adr/`](../adr/).
