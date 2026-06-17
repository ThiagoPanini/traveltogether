# Design — traveltogether

> **Status:** direção visual ativa após segundo handoff de Claude Design (2026-06-11). A direção escolhida para implementação é **Atlas** — papel claro, tinta floresta, laranja queimado. Substitui a direção anterior "Cartão de Embarque" (dark-first, coral), que fica **descontinuada**.

## Direção

**Atlas**: um atlas moderno de viagem em grupo — papel claro com grão sutil, tinta verde-floresta e um laranja queimado como acento. A metáfora não é mais o bilhete perfurado; é a **carta náutica / mapa de rota**: códigos de aeroporto em células split-flap, capas com linhas topográficas, e a rota da `Viagem` desenhada como uma linha de nós (`Origem` → `Parada`s → `Origem`) com setas pontilhadas.

- **Base:** papel claro (`#f4f0e6`), superfícies marfim (`#faf8f1` / `#f1ecdf`), grão de papel fixo e discreto sobre o fundo. Contraste WCAG AA.
- **Tinta:** verde-floresta profundo (`#1f3a2e`) como cor de texto e de elementos sólidos (marca, avatares, botão primário).
- **Acento:** laranja queimado (`#c05621`) para kickers, foco de formulário, hover de rota, marcação pessoal `Preferida`/`Comprada` e CTAs.
- **Tipografia:** **Archivo** (variável, com eixo de largura `wdth` esticado em ~112% nos displays) para títulos e UI; **IBM Plex Mono** para códigos de aeroporto, datas, preços, kickers e qualquer dado de viagem.
- **Raios:** cantos quase retos (`--radius: 2px`, `--radius-lg: 4px`) — sensação de papel impresso, não de SaaS arredondado.
- **Motivo visual:** células de código split-flap (cada letra do código de aeroporto de um `Trecho` numa caixa), linhas de contorno topográfico nas capas, banda vertical de acento, kickers mono em maiúsculas com tracking largo.

## Aplicação por área

- **Home pública:** hero editorial ("A viagem do grupo, finalmente fora do grupo do zap."), um *board* de rota de exemplo animado e três pilares numerados (Itinerário com `Parada`s · `Pesquisa de Passagem`s · Decisão por pessoa). Fecho com nota mono "mvp · acesso por allowlist".
- **Login:** identificação por e-mail ("Identifique-se" / kicker "embarque"). Copy deixa claro o acesso por allowlist no MVP. Sem senha.
- **Lista de Viagens:** cartões largos com capa topográfica à esquerda, nome em display, período em mono, sequência de códigos `Origem → Parada`s, pilha de avatares e papel `Organizador`.
- **Detalhe da Viagem:** header com capa topográfica + `Período da Viagem` em mono; a `RouteLine` mostra o ciclo de **cidades** (`Origem` → `Parada`s → `Origem`) com cada `Trajeto` como aresta clicável (mostra nº de `Rota`s, melhor preço entre elas, e quantas pessoas já têm `Preferida`/`Comprada`). Abaixo, grade de cards de `Parada`.
- **Rotas exibidas:** dois registros. **Esqueleto** (lista de `Viagem`s e topo do detalhe): nomes de **cidade** `Origem` → `Parada`s → `Origem`, **sem siglas** (uma sigla por cidade mentiria — invariantes 3 e 22). **Rota real** (ao abrir um `Trajeto`): os códigos split-flap dos `Trecho`s de verdade, por `Rota`, com a *tua* rota destacada quando há `Preferida`.
- **Imagens de Capa:** a capa é sempre o grafismo topográfico gerado a partir do id (sem upload). A funcionalidade de upload de `Imagem de Capa` foi **removida da superfície** (UI, actions, endpoints) e está adiada para reavaliação futura — as colunas no banco e o adapter de storage (ADR-0008) permanecem dormentes, sem uso, prontos para uma eventual retomada.
- **Pesquisas de Passagem (`Trecho`):** a comparação acontece **dentro de um `Trecho`** — *board* de linhas (`Pesquisa`s concorrentes) com companhia, duração/escalas/bagagem em mono, observações, preço em mono grande (em dinheiro **e/ou pontos** — ex.: `135.530 milhas LATAM + R$ 242,21`), `Upvote` (pílula) e ação **pessoal** `Preferida` (a passagem que *eu* vou usar) com status `Comprada`. **Não há mais** *stamp* de `Escolhida` de grupo: o sinal é por-pessoa (pilha de avatares de quem preferiu/comprou aquela `Pesquisa`). Uma `Pesquisa` **ida-e-volta** aparece nos dois `Trecho`s que cobre, com selo "ida-e-volta" e o preço **total** do bilhete (contado uma vez no `Orçamento`). Modo de comparação em tabela lado a lado destaca o melhor valor por critério, com a nota "sem conversão — comparação por unidade (moeda/programa)".
- **Membros:** *board* de pessoas com avatar, e-mail em mono, chip de papel (`Organizador` verde / `Membro` outline) e ações Promover/Rebaixar/Remover, respeitando o invariante do último organizador.
- **Roteiro da Parada:** dias numerados (`dia 01`…), itens com horário em mono e acento, notas e link; dia sem itens mostra "Dia livre". Itens sem dia definido vão para uma seção própria.

## Superfícies da evolução (plataforma aberta)

> Adicionadas na sessão de grilling de 2026-06-13. Mesma direção **Atlas**; ver `docs/CONTEXT.md` (termos `Comentário`, `Tarefa`, `Responsável`) e ADR-0013/0014.

- **Login / Cadastro:** deixa de ser só e-mail. Dois caminhos — **continuar com Google** (botão sólido floresta) e **e-mail com código** (informa e-mail → tela de **código de 6 dígitos** em células split-flap mono, reusando o motivo split-flap dos códigos de aeroporto). Kicker "embarque". O e-mail transacional (código e convite) leva a marca: papel marfim, tinta floresta, código em Plex Mono grande, acento laranja no CTA.
- **Painel (home logada):** substitui a lista crua. Espinha = **Minhas Viagens** (cards Atlas de hoje). Em volta: **Próxima viagem em destaque** (hero com contagem regressiva em mono até a `data de ida` e `RouteLine` resumida), **O que precisa de mim** (board de pendências derivadas: `Trajeto`s sem nenhuma `Pesquisa`, `Trajeto`s onde *eu* ainda não tenho `Preferida`, `Parada`s sem `Roteiro`, `Tarefa`s atribuídas a mim, convites a aceitar), **Atividade recente** (filete de novidades do grupo) e acesso a **Perfil & conta**.
- **Perfil & conta:** editar `nome de exibição` e `avatar` (Google entrega; e-mail gera avatar topográfico a partir do id, coerente com as capas), ver logins conectados. Avatar e nome passam a aparecer no lugar do e-mail cru em todo lugar (Membros, autoria de `Pesquisa`, `Comentário`s).
- **Adicionar Membro:** campo de e-mail único; ao casar um `Usuário`, mostra **nome + avatar como confirmação** ("é esta pessoa?"). Autocomplete sutil da sua rede (quem você já divide Viagem). Sem diretório, sem handle.
- **Comentários:** bloco de discussão assíncrona ancorado a `Pesquisa de Passagem`, `Item de Roteiro` e à `Viagem` (mural). Avatar + `nome` + timestamp mono; texto em Archivo; ação Responder (um nível). Lê-se como margem de caderno, não como rede social. `Membro` comenta.
- **Tarefas (board):** board kanban de 3 colunas — **a fazer · fazendo · feito** — cards com `título`, pílula de âncora opcional (ex.: `LIS→GRU`), pilha de avatares dos `Responsáveis` e prazo em mono. Cantos quase retos, arrastar com `prefers-reduced-motion` respeitado. Sensação de prancheta de expedição.
- **Mapa da rota (salto):** a `RouteLine` ganha um modo **mapa geográfico real** usando coordenadas do autocomplete de aeroporto — `Parada`s plotadas, `Trajeto`s desenhados como arco pontilhado, paleta floresta/laranja sobre relevo de papel. Convive com a `RouteLine` esquemática.
- **Orçamento do grupo (salto):** painel que soma três fontes — as `Pesquisa de Passagem`s `Preferida`s/`Comprada`s **de cada pessoa** (passagens, somando os `Trecho`s da `Rota` adotada), `Hospedagem` por `Parada` e `Extra`s — em **subtotais por moeda** (Plex Mono grande), com recortes por pessoa e por grupo. **Não há conversão de câmbio nem moeda-base**: moedas distintas aparecem como subtotais separados (nota mono), não como um número único. Lacunas (pessoa sem `Preferida` num `Trajeto`) aparecem como "a decidir". Linhas de `Hospedagem`/`Extra` só `Organizador`es editam.
- **Notificações (inbox pessoal):** lista por destinatário dos `Convite`s a aceitar/recusar, `Tarefa`s atribuídas a você e `menção`s — com estado lida/não-lida e contador no shell. *(O tipo `decision`, atrelado à `Escolhida` de grupo, foi aposentado — ADR-0018.)* **Distinta** da "Atividade recente" do painel (feed factual do grupo, sem estado de leitura). Preferências de entrega (por tipo + resumo por e-mail) ficam no Perfil.
- **Cronograma unificado (salto):** timeline vertical única da `Viagem` — `Trajeto`s, estadias de `Parada` e `Item de Roteiro` com horário num eixo só. Datas/horas em mono, faixas de estadia em marfim, trajetos como marcos de acento.

## Limites de linguagem

- "Embarque", "split-flap", "board" e "atlas" são **copy/visual**, não termos de domínio.
- O glossário continua mandando: `Viagem`, `Origem`, `Parada`, `Trajeto`, `Rota`, `Trecho`, `Pesquisa de Passagem`, `Programa de Fidelidade`, `Preferida`, `Comprada`, `Upvote`, `Organizador`, `Membro`, `Usuário`, `Roteiro`, `Item de Roteiro`. Ver `docs/CONTEXT.md`.
- A seção "Termos ambíguos a evitar" do CONTEXT.md continua valendo: nunca "voo", "proposta", "etapa", "like".

## Princípios

1. A estética serve o conteúdo; dados de voo e decisões de grupo continuam legíveis primeiro.
2. O tema de viagem aparece como craft de interface (papel, topografia, split-flap), não como kitsch.
3. Componentes interativos têm foco visível (borda laranja), estados de hover e contraste AA.
4. `prefers-reduced-motion` é respeitado (animações de entrada e da rota só rodam quando permitido).
5. Dados de viagem — códigos, datas, preços, moedas — sempre em mono (IBM Plex Mono).

## Rotas multi-trecho e decisão por-pessoa

> Adicionadas na sessão de grilling de 2026-06-16. Mesma direção **Atlas**; ver `docs/CONTEXT.md` (termos `Rota`, `Trecho`, `Preferida`, `Comprada`) e [ADR-0018](docs/adr/0018-rotas-multi-trecho-e-decisao-por-pessoa.md).

- **Construtor de rota (ao abrir um `Trajeto`):** a aresta cidade→cidade do esqueleto expande num editor de **`Rota`s** alternativas — "direto" `[GRU→JFK]`, "via Miami" `[GRU→MIA, MIA→JFK]`. Cada `Rota` é uma trilha de **`Trecho`s** em split-flap; adicionar um `Trecho` insere um nó de aeroporto **de conexão** (≠ `Parada`). Sair de GRU ou VCP é só outra `Rota`. Sensação de prancheta: linhas pontilhadas de acento entre os códigos.
- **Comparação no `Trecho`:** abrir um `Trecho` revela o board de `Pesquisa`s concorrentes (preço/companhia/bagagem em mono, `Upvote`). O total de uma `Rota` é a **soma** dos melhores/preferidos `Trecho`s, em mono grande, por moeda.
- **Plano pessoal (a virada):** sem *stamp* coletivo. Cada pessoa marca sua `Preferida` por `Trecho` e o status `Comprada`; a UI mostra **quem vai por onde** — pilha de avatares por `Rota`/`Pesquisa`, e um filete de "fechamento" (quantos já compraram). É o jeito de ver, fácil, que o Matheus vai direto e o Thiago via Miami.
- **RouteLine honesta (dois registros):** esqueleto de cidade quando não há `Trecho`; rota real em split-flap quando há, destacando a **tua** quando marcaste `Preferida`. Nunca uma sigla por nó-cidade fingindo ser a rota de todos.
- **Prune do labirinto:** `Rota` sem nenhuma `Preferida` de ninguém é descartável — a UI oferece arquivar/limpar as rotas que ninguém adotou, sem tocar nas que alguém escolheu.

> Estendido em 2026-06-16 com o registro de pesquisas em pontos e ida-e-volta; ver [ADR-0019](docs/adr/0019-pesquisa-multi-trecho-e-modo-de-transporte.md).

- **Preço em pontos:** o formulário de `Pesquisa` aceita um par de **dinheiro** (`valor` + `moeda`) **e/ou** um par de **pontos** (`quantidade` + `programa de fidelidade`, em mono). Nada se converte: pontos e taxa aparecem lado a lado (ex.: `135.530 milhas LATAM` · `R$ 242,21`). Programas distintos não se comparam — o seletor de comparação agrupa por unidade.
- **Ida-e-volta:** ao registrar, marca-se que o bilhete cobre **ida + volta**; um seletor casa o `Trecho` de volta (mesmo par invertido, possivelmente em outro `Trajeto`). Vira **um** card que ecoa nos dois `Trecho`s com selo "ida-e-volta" — sem dividir o preço, sem registro-fantasma.
- **`Trecho` terrestre:** no construtor de `Rota`, um `Trecho` pode ser de **carro** (ícone/linha cheia, sem split-flap de aeroporto e sem board de tarifa) — ex.: `Miami →(carro)→ Orlando`. Na `RouteLine`, perna terrestre é traço contínuo; aérea é pontilhada com códigos. O custo do aluguel entra no `Orçamento` como `Extra`.
