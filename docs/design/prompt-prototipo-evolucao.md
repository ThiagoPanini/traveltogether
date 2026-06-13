# Prompt de saída — protótipo da evolução (Claude Design / artifact)

> Gerado na sessão de grilling de 2026-06-13. Cole o bloco abaixo numa sessão Claude para gerar o protótipo visual do "mundo aprimorado". É autocontido: não depende do repo.

---

Você é um designer de produto sênior. Construa um **protótipo de alta fidelidade, multi-tela, em um único arquivo React (com Tailwind)** para o **traveltogether** — um hub para grupos de amigos organizarem viagens juntos. Toda a copy é em **português do Brasil**. Foco em fidelidade visual e fluxo, dados podem ser mockados.

## Direção visual — "Atlas" (siga à risca)

Um atlas moderno de viagem: papel claro com grão sutil, tinta verde-floresta, laranja queimado de acento. Metáfora de carta náutica / mapa de rota — não de SaaS arredondado.

- **Base:** papel `#f4f0e6`; superfícies marfim `#faf8f1` e `#f1ecdf`; grão de papel discreto e fixo no fundo. Contraste WCAG AA.
- **Tinta:** verde-floresta `#1f3a2e` (texto, marca, avatares, botão primário).
- **Acento:** laranja queimado `#c05621` (kickers, foco de formulário, hover de rota, item "escolhido", CTAs).
- **Tipografia:** **Archivo** (títulos e UI; eixo de largura esticado ~112% nos displays); **IBM Plex Mono** para TODO dado de viagem — códigos de aeroporto, datas, preços, moedas, horários, kickers em maiúsculas com tracking largo.
- **Raios:** cantos quase retos (`2px`, `4px`). Sensação de papel impresso.
- **Motivos:** códigos de aeroporto em **células split-flap** (cada letra numa caixa mono); linhas de **contorno topográfico** nas capas; banda vertical de acento; kickers mono em maiúsculas.
- Respeite `prefers-reduced-motion`. Foco visível (borda laranja). Dados de viagem sempre em mono.

## Linguagem de domínio (use exatamente estes termos na copy)

Viagem · Origem (cidade-casa) · Parada (cidade do itinerário) · Trajeto (salto cidade→cidade) · Aeroporto de Referência · Pesquisa de Passagem (uma tarifa que alguém cadastrou) · Upvote · Escolhida (a opção decidida) · Organizador · Membro · Roteiro / Item de Roteiro · Comentário · Tarefa · Responsável.
**Proibido:** "voo", "proposta", "etapa/perna", "like/curtida", "to-do", "chat/mensagem". Use o termo canônico.

## Telas a prototipar (em abas ou navegação entre telas)

1. **Login / Cadastro.** Kicker mono "embarque". Dois caminhos: botão sólido floresta **"Continuar com Google"** e **"Entrar com e-mail"**. Ao escolher e-mail: tela de **código de 6 dígitos** em células split-flap mono ("enviamos um código para você@email"). Tom: carta náutica, não banco.

2. **Painel (home logada).** Espinha = **Minhas Viagens** (cards largos com capa topográfica, nome em display, `Período da Viagem` em mono, sequência de códigos `Origem → Paradas → Origem`, pilha de avatares). Em volta, módulos:
   - **Próxima viagem em destaque:** hero com **contagem regressiva** em mono até a data de ida + `RouteLine` resumida.
   - **O que precisa de mim:** lista de pendências derivadas — Trajetos sem Pesquisa de Passagem, Pesquisas sem Escolhida, Paradas sem Roteiro, **Tarefas atribuídas a mim**, convites a aceitar.
   - **Atividade recente:** filete de novidades do grupo (novo Comentário, nova Pesquisa, alguém entrou).
   - Acesso a **Perfil & conta**.

3. **Perfil & conta.** Editar nome de exibição e avatar; logins conectados (Google / e-mail). Avatar topográfico gerado quando não há foto.

4. **Detalhe da Viagem.** Header com capa topográfica + `Período da Viagem` em mono. **RouteLine** mostrando o ciclo `Origem → Paradas → Origem`, cada Trajeto como aresta clicável (nº de Pesquisas, melhor preço, ou ✓ Escolhida). Toggle para **modo Mapa geográfico real** (Paradas plotadas em coordenadas, Trajetos como arco pontilhado, paleta floresta/laranja sobre relevo de papel). Abaixo, grade de cards de Parada. Aba de **Tarefas** e blocos de **Comentário**.

5. **Pesquisas de Passagem de um Trajeto.** Board de linhas: companhia (com logo), duração/escalas/bagagem em mono, observações, **preço em mono grande**, pílula de **Upvote**, ação **Escolher/Desmarcar** (a Escolhida ganha um *stamp* laranja). Abaixo de cada Pesquisa, **Comentários**.

6. **Tarefas (board kanban).** Três colunas: **a fazer · fazendo · feito**. Cards com título, pílula de âncora opcional (ex.: `LIS→GRU` ou nome da Parada), **pilha de avatares dos Responsáveis**, prazo em mono. Visual de prancheta de expedição; cards arrastáveis.

7. **Comentários (componente reutilizável).** Discussão assíncrona ancorada a uma Pesquisa, um Item de Roteiro ou à Viagem (mural). Avatar + nome + timestamp mono, texto em Archivo, ação **Responder** (um nível). Margem de caderno, não rede social.

8. **Orçamento do grupo.** Soma das Pesquisas Escolhidas de cada Trajeto → **custo estimado por pessoa**, valores em Plex Mono grande, nota "sem conversão de câmbio — comparação visual". Trajetos sem Escolhida aparecem como "a decidir".

9. **Cronograma unificado.** Timeline vertical única da Viagem: Trajetos, estadias de Parada e Itens de Roteiro com horário num eixo só. Datas/horas em mono, faixas de estadia em marfim, Trajetos como marcos de acento.

## Entregável

Um protótipo navegável e coeso, fiel à direção Atlas, demonstrando o fluxo do usuário recém-cadastrado: **login → painel → entrar numa Viagem → comparar Pesquisas com Comentários → mover uma Tarefa no board → ver Orçamento e Cronograma**. Capriche na densidade tipográfica mono dos dados de viagem e no craft de papel/topografia.
