# Blueprint — Noturno projetado

> **PROJETADO — não construído ou ainda não persistido.** O redesenho navegável de `.claude/design/redesign-travelmanager` já foi implementado nas telas atuais descritas em `as-built.md`. Este arquivo guarda o que ainda precisa virar produto real, principalmente persistência e superfícies futuras.

## Reconciliação com o domínio

O protótipo visual é a referência de forma, mas o vocabulário precisa continuar obedecendo ao domínio do travelmanager. Qualquer implementação futura deve manter estas correções:

| No protótipo ou em linguagem genérica | No travelmanager | Por quê |
|---|---|---|
| `votos`, `votou`, `falta votar`, `eleição` | `já preferem`, estado pessoal de Preferida/Comprada | A decisão é **por-pessoa**, sem voto de grupo — CONTEXT inv. 4 · [ADR-0006](../adr/0006-apostas-de-dominio.md). |
| `escolhida` como decisão do grupo | `Preferida de você` / `Preferida de Nome`, ou `selecionada` para estado de UI | Não existe Rota escolhida pelo grupo; só Preferida pessoal. |
| Dinheiro/pontos em métricas globais | dinheiro/pontos só na Pesquisa de translado, Rotas e ticket | Dinheiro e pontos **nunca** no Painel — CONTEXT inv. 5. |
| "mais barato" cruzando unidades | comparação visual apenas dentro da mesma unidade | Não há conversão moeda↔moeda nem pontos↔dinheiro — CONTEXT inv. 5 · ADR-0006. |
| "trecho" para o salto entre cidades | Trajeto = salto derivado; Trecho = cada pulo de uma Rota | Não chamar Trajeto de Trecho. |
| IATA em Parada | IATA só em Trecho/Pesquisa | Parada é cidade, sem aeroporto. |

## Próximas peças de produto

### Pesquisa persistida

A timeline e o takeover de Pesquisa já existem visualmente, mas persistem no navegador. O próximo passo é substituir `localStorage` por entidades reais de Rota/Trecho/Pesquisa, mantendo a anatomia atual: card por Trajeto, takeover em dois passos, canhoto-resumo, dinheiro e pontos como dimensões separadas, e Preferida por-pessoa.

### Rotas

A tela de Rotas ainda não existe como superfície persistida. Quando nascer, deve usar a linguagem do protótipo: grid amplo, lista de opções de Rota à esquerda, mapa/ticket à direita, cards selecionáveis com estado visual forte e ticket como único lugar de dinheiro/pontos. "Selecionada" pode ser estado de UI; "Preferida" só quando for decisão pessoal real.

### Preferida e Comprada

Preferida e Comprada precisam virar ações pessoais no servidor. A interface pode agregar tendências ("2 de 4 já preferem"), mas não deve criar decisão coletiva, ranking global ou voto que decida por alguém.

### Cascas futuras

Roteiro, Orçamento e Ingressos continuam como cascas "em breve" dentro da Viagem. Elas não entram como menu global até terem fluxo real. Se uma casca for implementada, mova a anatomia para `as-built.md` e mantenha o vocabulário pt-BR do domínio.

## Componentes projetados

- **Route option card**: card selecionável para Rota candidata, ativo com borda/fundo accent e inativo com superfície/borda muted; use `button` ou radio group conforme a interação.
- **Flight map**: painel abstrato com grade, dots e paths; precisa de resumo textual próximo e não deve prometer geografia real.
- **Ticket panel**: painel de preço e pontos por Pesquisa/Rota; dimensões separadas, sem conversão, com ações pessoais Preferida → Comprada.
- **Em breve card**: borda tracejada, ícone decorativo, título, nota e pill "em breve"; informativo, não clicável.

## Layout projetado — referência

- Containers: `--page-gutter` (40px), `--max-width-wide` (1040px), `--max-width-panel` (1000px), `--hero-max` (720px), `--login-card` (400px).
- Breakpoints: preferir CSS intrínseco (`clamp`, `auto-fit`, `minmax`, `flex-wrap`, containers máximos). Só nomear breakpoint quando um layout real exigir decisão que esses padrões não expressem.
- Estados nunca dependem só de cor; foco sempre visível; `span onClick` do protótipo vira controle semântico (`a` para navegação, `button` para comando).
