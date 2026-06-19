# ADR 0020 — Chassi visual Espresso supersede Atlas (fundação-primeiro, pele única)

- **Status:** Accepted
- **Data:** 2026-06-18
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [DESIGN.md](../../DESIGN.md) (direção visual), [docs/CONTEXT.md](../CONTEXT.md) (glossário + termos banidos), [ADR-0018](0018-rotas-multi-trecho-e-decisao-por-pessoa.md)/[ADR-0019](0019-pesquisa-multi-trecho-e-modo-de-transporte.md) (modelo de domínio, intocado por esta decisão). **Supersede** a direção **Atlas** registrada na DESIGN.md.

## Contexto

A direção **Atlas** (papel/floresta/laranja, Archivo + IBM Plex Mono, cantos quase retos) foi implementada como pele viva do app. Uma rodada de prototipação no Claude Design convergiu numa direção nova — **Espresso / Assinatura** — validada tela a tela a partir do **login** e depois do **casco + Painel + wizard**. Espresso não é um remapeamento de tokens sobre o Atlas: muda a metáfora (carimbo de passaporte/papel-carta café, não carta náutica esverdeada), a tipografia (três famílias grotescas + mono), o raio (arredondado generoso, não quase-reto) e o vocabulário de movimento (deriva/respira/sobe/carimbo/virar-de-passaporte).

Decidir **como** trocar a pele sem reescrever o produto inteiro de uma vez, e sem deixar duas peles meio-vivas brigando em runtime.

## Decisão

1. **Espresso é a única pele viva.** `globals.css` foi reescrita para Espresso; as fontes entram via `next/font` (Space Grotesk display · Hanken Grotesk corpo · DM Mono dado). **Não há mecanismo de duas-peles em runtime** (`data-skin`/dual-font foi descartado): nada do Atlas renderiza, logo não há o que alternar.
2. **Atlas vira código dormente, não deletado.** O CSS Atlas foi congelado em `apps/web/dormant/` (não importado, não roteado), referência reversível para os rebuilds. A poda definitiva acompanha a reconstrução de cada superfície, rodada a rodada.
3. **Fundação-primeiro.** A base foi construída **completa de uma vez** — tokens (paleta + raio + sombra + escala), três fontes, primitivas de movimento "Assinatura" com `prefers-reduced-motion`, e o **casco** (`AppShell`) Espresso — antes de qualquer tela. O `AppTopbar` Atlas morreu; o casco unifica sidebar (desktop) + header/drawer (mobile).
4. **Prototype-first / poda ao foco.** A rodada 0 entrega **só a superfície que o protótipo validou**: casco + navegação de 3 itens + Painel + wizard. O resto (miolo profundo da `Viagem`, laterais globais) fica **inacessível** — sem nav, sem rota — até ser reconstruído. Não se inventa destino que o protótipo não desenhou.
5. **Navegação = 3 itens, mas só Início resolve.** A IA validada é Início/Viagens/Perfil; na rodada 0 só **Início** tem tela (o Painel). Viagens e Perfil ficam **inertes** ("em breve"). O **logout** — necessidade funcional ausente do protótipo — pendura no chip de identidade que o protótipo já desenhou.

## Justificativa

- **Uma pele só é mais simples e mais honesta** do que um seletor de tema que ninguém vai usar: como nada do Atlas renderiza, manter dual-skin seria peso morto e fonte de bug de especificidade.
- **Dormente > deletado** preserva o trabalho do Atlas como referência reversível barata enquanto cada superfície ainda não foi reconstruída em Espresso, sem poluir o runtime.
- **Fundação completa antes das telas** evita remendo: as telas seguintes (Painel, wizard) plugam numa base real (tokens, classes, movimento), não numa que cresce por acidente.
- **Prototype-first protege o foco:** a estrela-guia do produto é a caça de preço aéreo; construir só o que foi prototipado evita reabrir telas que ainda não passaram por prototipação/validação.
- **O domínio não se move.** Esta é uma decisão de **pele e superfície**, não de modelo: ADR-0018/0019 seguem valendo, e o teste de aceitação **EUA Trip** continua verde. Onde protótipo e domínio divergem, **o domínio vence** (os termos banidos do CONTEXT.md mandam na copy).

## Consequências

- `apps/web/app/globals.css` reescrita (Espresso); `dormant/globals.atlas.css` guarda o Atlas. `layout.tsx` carrega as 3 fontes via `next/font` e larga o `<link>` Google Fonts + o `data-dir="atlas"`.
- `lib/nav/items.ts` passa de 5 itens (+Perfil solto, badges) para **3 itens** com `href` anulável (inerte = `href: null`); `isNavActive`/`isResolved` puros, cobertos por teste.
- `components/app-shell.tsx` reconstruído em Espresso (sidebar nav-3, CTA "Nova viagem", chip com logout, drawer mobile), com ícones próprios — não depende mais do conjunto Atlas (`components/atlas.tsx`), que segue em uso pelo miolo até ser podado.
- **Interino assumido:** telas do miolo ainda roteadas (lista/detalhe de `Viagem`, Tarefas, etc.) perdem o estilo Atlas até serem reconstruídas ou formalmente inacessibilizadas — é esperado e tratado nas fatias seguintes da rodada 0.
- **Rounds futuros** reconstroem, em Espresso, o miolo da `Viagem` e o loop de caça/comparação de preço (com os estados **com preço** do radar) — fora do escopo desta decisão.

## Opções rejeitadas

- **Remapear tokens do Atlas para cores Espresso:** rápido, mas a metáfora/raio/tipografia/movimento mudam — daria um híbrido sem identidade. Recusado: é refactor de pele, não de paleta.
- **Dual-skin em runtime (`data-skin`):** alternância que nada exercita; complexidade e bugs de cascata sem ganho. Recusado.
- **Deletar o Atlas já:** perde a referência reversível antes de cada superfície ter equivalente Espresso. Recusado em favor de código dormente.
- **Migrar tela a tela mantendo o Atlas vivo em paralelo:** duas peles meio-vivas ao mesmo tempo, inconsistência visível ao usuário. Recusado em favor de fundação-primeiro + poda ao foco prototipado.
