# Como estender uma tela de Viagem

Use este guia quando uma nova tela ou protótipo cruza dados de domínio.

## 1. Escolha o estrato

- Se a peça já existe em código, comece pelo contrato as-built em
  `components/` e preserve deltas deliberados.
- Se a peça só existe no bundle, use o contrato `⏳ projetado` e promova para
  implementado no mesmo PR em que criar código.

## 2. Traga o domínio antes da forma

Leia `../../CONTEXT.md` para nomear dados:

| Dado | Como aparece na UI |
|---|---|
| Viagem | Unidade de organização e permissão. |
| Parada | Cidade onde o grupo permanece; sem aeroporto. |
| Trajeto | Salto derivado entre casa/paradas. |
| Rota | Caminho candidato que realiza um Trajeto. |
| Trecho | Cada pulo de uma Rota; compra à parte. |
| Pesquisa | Cotação/passagem cadastrada, com dinheiro e/ou pontos. |
| Preferida | Decisão pessoal sobre uma Pesquisa. |
| Comprada | Status pessoal depois da Preferida. |

## 3. Aplique as invariantes de UI

- Painel mostra progresso e decisões pessoais visíveis; não mostra preço.
- Rotas/Pesquisa é o único lugar para dinheiro e pontos.
- Não existe voto nem rota escolhida pelo grupo.
- Pontos e dinheiro não se convertem nem são somados.
- IATA fica em Trecho/Pesquisa, nunca como dado da Parada.
- Terrestre existe como conector estrutural; cotação/rateio é Orçamento em breve.

## 4. Escolha os componentes

- Casca pública: `Wordmark`, `StepCards`, `BoardingPassRibbon`, botões.
- Painel da Viagem: tabs/chips, progress strip, timeline leg, decision card,
  crew row, em breve card.
- Rotas: route option card, flight map, ticket panel.
- Login: OTP input, botões e card de login.

## 5. Use tokens

Cor, raio, borda, família tipográfica, largura nomeada e sombra vêm de token.
Geometria local pequena pode ser literal até virar padrão repetido.

## 6. Atualize o contrato

Ao implementar:

1. Atualize o arquivo do componente em `components/`.
2. Mova o item de `⏳ projetado` para `Implementado` em
   `procedencia-e-deltas.md`.
3. Catalogue novos tokens ou literais conscientes.
4. Adicione ou ajuste testes de copy/a11y quando houver risco de regressão.
