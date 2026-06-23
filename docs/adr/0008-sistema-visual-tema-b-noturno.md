# 0008 — Sistema visual: Tema B · Noturno e contrato vivo

**Status:** Aceito

## Contexto

A navegabilidade e a beleza são precondição de adoção ([0001](0001-criterio-e-fronteira-da-v1.md)). Foi produzido no claude.ai/design um pack completo de design (tokens, paleta, tipografia, protótipo navegável e spec de reconstrução), avaliado contra o domínio nesta sessão.

Em 2026-06-23, esse pack deixou de ser tratado como "fonte-da-verdade visual"
direta e virou **origem creditada**. O contrato vivo passa a morar em
[`../design/`](../design/), separado em dois estratos: implementado
(`as-built`, código = verdade) e projetado, não construído (`⏳`, bundle +
reconciliação de domínio).

## Decisão

A pele do produto é o **Tema B · Modo Escuro (Noturno)**, originado no pack
Claude Design e oficializado como contrato vivo em [`../design/`](../design/).
Os tokens nomeados vivem em [`../design/tokens.json`](../design/tokens.json);
componentes e telas vivem em docs agent-first.

- **Tipografia:** Saira Condensed (display, caixa-alta) + Public Sans (corpo) + Spline Sans Mono (rótulos/IATA).
- **Paleta:** noturna quente — petróleo/teal (`#0f171e`/`#14202b`) + accent terracota (`#df6a4d`) + cremes.
- **Estética:** retrô-analógica de aviação (cartão de embarque, tripulação, códigos IATA, mapa de voo).
- **Regra de UI herdada:** milhas e dinheiro só na Pesquisa de translado, nunca no Painel (alinha com [0005](0005-sem-conversao-de-unidades.md)).

Substitui direções visuais anteriores (Espresso/Atlas) — reset limpo.

## Reconciliação com o domínio (aplicar quando a casca for construída)

O protótipo precede a convergência de domínio em três pontos; o **domínio prevalece**:

1. **Decisão por-pessoa, não votação.** O protótipo desenha "votos/escolhida"; reescrever para linguagem por-pessoa ([0004](0004-decisao-por-pessoa.md)).
2. **Cascas "em breve" = Roteiro · Orçamento · Ingressos.** O protótipo mostra Roteiro/Tarefas/Ingressos; trocar Tarefas por Orçamento (degrau pós-MVP mais colado ao núcleo, pois reusa os preços já cadastrados) — ver [0001](0001-criterio-e-fronteira-da-v1.md).
3. **Terminologia.** A "linha do tempo" do protótipo chama de *"trecho"* o que é **Trajeto**; e *"Rota com escala = 2 voos"* mistura **Escala** (1 bilhete) com **2 Trechos** (2 compras). Alinhar a copy ao [`../../CONTEXT.md`](../../CONTEXT.md) (invariantes 1–3) na implementação.

## Lacunas do pack (a desenhar)

Sem tela ainda: **shell global** (Minhas viagens · Perfil · Nova viagem), **onboarding + cidade de origem** ([0006](0006-origem-no-perfil.md)), **wizard de criar viagem** (3 passos) e **convite/aceite** ([0007](0007-papeis-camadas-e-convite.md)).

## Consequências

- Novos componentes seguem [`../design/README.md`](../design/README.md) e os
  contratos em [`../design/components/`](../design/components/).
- Tokens nomeados seguem [`tokens.json`](../design/tokens.json).
- A copy do protótipo passa pelo filtro do `CONTEXT.md` antes de virar código.
- O protótipo navegável e o showcase ficam como origem congelada/gitignored;
  o contrato operacional fica em `docs/design/`.
