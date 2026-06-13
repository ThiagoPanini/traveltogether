# Design — traveltogether

> **Status:** direção visual ativa após segundo handoff de Claude Design (2026-06-11). A direção escolhida para implementação é **Atlas** — papel claro, tinta floresta, laranja queimado. Substitui a direção anterior "Cartão de Embarque" (dark-first, coral), que fica **descontinuada**.

## Direção

**Atlas**: um atlas moderno de viagem em grupo — papel claro com grão sutil, tinta verde-floresta e um laranja queimado como acento. A metáfora não é mais o bilhete perfurado; é a **carta náutica / mapa de rota**: códigos de aeroporto em células split-flap, capas com linhas topográficas, e a rota da `Viagem` desenhada como uma linha de nós (`Origem` → `Parada`s → `Origem`) com setas pontilhadas.

- **Base:** papel claro (`#f4f0e6`), superfícies marfim (`#faf8f1` / `#f1ecdf`), grão de papel fixo e discreto sobre o fundo. Contraste WCAG AA.
- **Tinta:** verde-floresta profundo (`#1f3a2e`) como cor de texto e de elementos sólidos (marca, avatares, botão primário).
- **Acento:** laranja queimado (`#c05621`) para kickers, foco de formulário, hover de rota, `Escolhida` (stamp) e CTAs.
- **Tipografia:** **Archivo** (variável, com eixo de largura `wdth` esticado em ~112% nos displays) para títulos e UI; **IBM Plex Mono** para códigos de aeroporto, datas, preços, kickers e qualquer dado de viagem.
- **Raios:** cantos quase retos (`--radius: 2px`, `--radius-lg: 4px`) — sensação de papel impresso, não de SaaS arredondado.
- **Motivo visual:** células de código split-flap (cada letra do `Aeroporto de Referência` numa caixa), linhas de contorno topográfico nas capas, banda vertical de acento, kickers mono em maiúsculas com tracking largo.

## Aplicação por área

- **Home pública:** hero editorial ("A viagem do grupo, finalmente fora do grupo do zap."), um *board* de rota de exemplo animado e três pilares numerados (Itinerário com `Parada`s · `Pesquisa de Passagem`s · Decisão em grupo). Fecho com nota mono "mvp · acesso por allowlist".
- **Login:** identificação por e-mail ("Identifique-se" / kicker "embarque"). Copy deixa claro o acesso por allowlist no MVP. Sem senha.
- **Lista de Viagens:** cartões largos com capa topográfica à esquerda, nome em display, período em mono, sequência de códigos `Origem → Parada`s, pilha de avatares e papel `Organizador`.
- **Detalhe da Viagem:** header com capa topográfica + `Período da Viagem` em mono; a `RouteLine` mostra o ciclo completo (`Origem` → `Parada`s → `Origem`) com cada `Trajeto` como aresta clicável (mostra nº de `Pesquisa de Passagem`s, melhor preço, ou ✓ `Escolhida`). Abaixo, grade de cards de `Parada`.
- **Rotas exibidas:** na lista de `Viagem`s, a sequência de códigos vai de `Origem` até a última `Parada` e volta à `Origem`; no detalhe, a `RouteLine` desenha o ciclo completo com as arestas (`Trajeto`s) interativas. Todo código de aeroporto aparece com a cidade em texto menor e sutil.
- **Imagens de Capa:** a capa é sempre o grafismo topográfico gerado a partir do id (sem upload). A funcionalidade de upload de `Imagem de Capa` foi **removida da superfície** (UI, actions, endpoints) e está adiada para reavaliação futura — as colunas no banco e o adapter de storage (ADR-0008) permanecem dormentes, sem uso, prontos para uma eventual retomada.
- **Pesquisas de Passagem (`Trajeto`):** *board* de linhas com companhia, duração/escalas/bagagem em mono, observações, preço em mono grande, `Upvote` (pílula) e ação `Escolher`/`Desmarcar` (a `Escolhida` ganha o *stamp* laranja). Modo de comparação em tabela lado a lado, com o melhor valor de cada critério destacado e a nota "sem conversão de câmbio — comparação visual".
- **Membros:** *board* de pessoas com avatar, e-mail em mono, chip de papel (`Organizador` verde / `Membro` outline) e ações Promover/Rebaixar/Remover, respeitando o invariante do último organizador.
- **Roteiro da Parada:** dias numerados (`dia 01`…), itens com horário em mono e acento, notas e link; dia sem itens mostra "Dia livre". Itens sem dia definido vão para uma seção própria.

## Superfícies da evolução (plataforma aberta)

> Adicionadas na sessão de grilling de 2026-06-13. Mesma direção **Atlas**; ver `docs/CONTEXT.md` (termos `Comentário`, `Tarefa`, `Responsável`) e ADR-0013/0014.

- **Login / Cadastro:** deixa de ser só e-mail. Dois caminhos — **continuar com Google** (botão sólido floresta) e **e-mail com código** (informa e-mail → tela de **código de 6 dígitos** em células split-flap mono, reusando o motivo do `Aeroporto de Referência`). Kicker "embarque". O e-mail transacional (código e convite) leva a marca: papel marfim, tinta floresta, código em Plex Mono grande, acento laranja no CTA.
- **Painel (home logada):** substitui a lista crua. Espinha = **Minhas Viagens** (cards Atlas de hoje). Em volta: **Próxima viagem em destaque** (hero com contagem regressiva em mono até a `data de ida` e `RouteLine` resumida), **O que precisa de mim** (board de pendências derivadas: `Trajeto`s sem `Pesquisa`, `Pesquisa`s sem `Escolhida`, `Parada`s sem `Roteiro`, `Tarefa`s atribuídas a mim, convites a aceitar), **Atividade recente** (filete de novidades do grupo) e acesso a **Perfil & conta**.
- **Perfil & conta:** editar `nome de exibição` e `avatar` (Google entrega; e-mail gera avatar topográfico a partir do id, coerente com as capas), ver logins conectados. Avatar e nome passam a aparecer no lugar do e-mail cru em todo lugar (Membros, autoria de `Pesquisa`, `Comentário`s).
- **Adicionar Membro:** campo de e-mail único; ao casar um `Usuário`, mostra **nome + avatar como confirmação** ("é esta pessoa?"). Autocomplete sutil da sua rede (quem você já divide Viagem). Sem diretório, sem handle.
- **Comentários:** bloco de discussão assíncrona ancorado a `Pesquisa de Passagem`, `Item de Roteiro` e à `Viagem` (mural). Avatar + `nome` + timestamp mono; texto em Archivo; ação Responder (um nível). Lê-se como margem de caderno, não como rede social. `Membro` comenta.
- **Tarefas (board):** board kanban de 3 colunas — **a fazer · fazendo · feito** — cards com `título`, pílula de âncora opcional (ex.: `LIS→GRU`), pilha de avatares dos `Responsáveis` e prazo em mono. Cantos quase retos, arrastar com `prefers-reduced-motion` respeitado. Sensação de prancheta de expedição.
- **Mapa da rota (salto):** a `RouteLine` ganha um modo **mapa geográfico real** usando coordenadas do autocomplete de aeroporto — `Parada`s plotadas, `Trajeto`s desenhados como arco pontilhado, paleta floresta/laranja sobre relevo de papel. Convive com a `RouteLine` esquemática.
- **Orçamento do grupo (salto):** painel que soma a `Pesquisa de Passagem` `Escolhida` de cada `Trajeto` → **custo estimado por pessoa**, valores em Plex Mono grande, sem conversão de câmbio (nota mono). Lacunas (Trajeto sem Escolhida) aparecem como "a decidir".
- **Cronograma unificado (salto):** timeline vertical única da `Viagem` — `Trajeto`s, estadias de `Parada` e `Item de Roteiro` com horário num eixo só. Datas/horas em mono, faixas de estadia em marfim, trajetos como marcos de acento.

## Limites de linguagem

- "Embarque", "split-flap", "board" e "atlas" são **copy/visual**, não termos de domínio.
- O glossário continua mandando: `Viagem`, `Origem`, `Parada`, `Trajeto`, `Pesquisa de Passagem`, `Escolhida`, `Upvote`, `Organizador`, `Membro`, `Usuário`, `Roteiro`, `Item de Roteiro`. Ver `docs/CONTEXT.md`.
- A seção "Termos ambíguos a evitar" do CONTEXT.md continua valendo: nunca "voo", "proposta", "etapa", "like".

## Princípios

1. A estética serve o conteúdo; dados de voo e decisões de grupo continuam legíveis primeiro.
2. O tema de viagem aparece como craft de interface (papel, topografia, split-flap), não como kitsch.
3. Componentes interativos têm foco visível (borda laranja), estados de hover e contraste AA.
4. `prefers-reduced-motion` é respeitado (animações de entrada e da rota só rodam quando permitido).
5. Dados de viagem — códigos, datas, preços, moedas — sempre em mono (IBM Plex Mono).
