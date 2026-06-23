# Design system travelmanager

Este diretório é o contrato vivo de design do travelmanager. Ele existe para que
agentes prototipem e construam novas telas sem abrir o bundle congelado, sem ler
código por adivinhação e sem reimportar decisões já tomadas.

## Regra de fonte

**Origem não é fonte-da-verdade.** O bundle congelado em
`.claude/design/design-system-dark-mode/` é a origem creditada do Tema B Noturno,
mas continua gitignored e não deve ser aberto por agentes como rotina.

O contrato vivo tem dois estratos:

| Estrato | Verdade operacional | Como usar |
|---|---|---|
| **Implementado (as-built)** | Código versionado + tokens vivos | Preserve o comportamento e documente deltas contra o bundle. |
| **Projetado, não construído (⏳)** | Spec extraída do bundle, reconciliada com domínio | Use como blueprint futuro; rotule como não implementado até existir código. |

Para intenção e invariantes de domínio, leia `../../CONTEXT.md` e `../adr/`.
Para forma visual, leia estes documentos. Quando forma e domínio divergirem,
registre a contradição e aplique o filtro dos ADRs antes de implementar.

## Onde mora cada coisa

| Arquivo | Papel |
|---|---|
| `tokens.json` | Fonte viva dos tokens nomeados. |
| `../../apps/web/app/globals.css` | Espelho CSS consumido pelo app; deve ficar sincronizado com `tokens.json`. |
| `../../apps/web/lib/design/tokens.ts` | Catálogo TS usado pela página `/tokens` e testes. |
| `procedencia-e-deltas.md` | Auditoria: origem, mapa implementado/projetado, deltas e worklist. |
| `design-spec.md` | Tokens, tipografia, voz/copy, movimento e convenções de literais. |
| `layout.md` | Estrutura de telas, grid, responsivo e z-index. |
| `accessibility.md` | Semântica, foco, reduced motion, forced colors e trade-offs. |
| `components/*.md` | Contrato por componente/fronteira de código. |
| `como-estender-tela-de-viagem.md` | Guia para transformar dados/domínio em UI. |

## Ordem de leitura

1. `procedencia-e-deltas.md`
2. `design-spec.md`
3. `layout.md`
4. `accessibility.md`
5. O arquivo em `components/` da peça que você vai usar ou criar.
6. `como-estender-tela-de-viagem.md` quando a tela cruza dados de Viagem,
   Paradas, Trajetos, Rotas, Trechos, Pesquisas, Preferida ou Comprada.

## Mapa rápido

| Superfície | Estrato |
|---|---|
| Landing/home pública, `Wordmark`, `StepCards`, `BoardingPassRibbon`, CTAs locais e página `/tokens` | **Implementado (as-built)** |
| Login/OTP, Painel da Viagem, Rotas, bottom switcher, timeline, decision card, crew row, status/progress, route option, map e ticket | **⏳ Projetado, não construído** |

## Regra de edição

- Use token, não literal, para cor, raio, borda, tipografia, sombra e largura
  nomeada.
- Se precisar de literal consciente, catalogue em `design-spec.md` e diga qual
  token ele espelha.
- Se adicionar movimento, documente reduced-motion no componente.
- Se criar CSS Module com animação, co-localize `@keyframes` no mesmo módulo.
- Se um componente sai de `⏳` para implementado, atualize o arquivo dele e
  `procedencia-e-deltas.md` no mesmo PR.
