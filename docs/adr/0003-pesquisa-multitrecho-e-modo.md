# 0003 — Pesquisa cobre 1+ Trechos; Trecho tem Modo

**Status:** Aceito

## Contexto

Bilhetes reais nem sempre mapeiam 1:1 em um pulo. Uma **ida-e-volta** é um bilhete só que cobre dois trechos (a ida e a volta), que podem até estar em Trajetos diferentes. O caso que validou isso: para o grupo, comprar ida-volta `SP↔MIA` e outra ida-volta `NY↔MIA` resolve a chegada a NY e o passeio a Miami; o `MIA→ORL` fica de carro.

## Decisão

- **Uma compra = uma Pesquisa**, cobrindo **um ou mais Trechos aéreos**.
- **Ida-e-volta** = uma Pesquisa cobrindo 2 trechos; carrega o **preço do bilhete inteiro**, resolve **todos** os trechos cobertos e entra **uma vez** em qualquer soma (não se divide preço por trecho).
- **Escala** (parada técnica dentro de um bilhete) é **campo da Pesquisa** (direto / nº), **nunca** um Trecho.
- **Trecho tem Modo** (aéreo / terrestre). Terrestre (carro/ônibus) é **conector estrutural**: existe para a Rota não mentir, mas **não hospeda Pesquisa/preço na v1** (cotação + rateio = Orçamento, em breve).

## Opções consideradas

- **Dividir um bilhete em meias-pesquisas por trecho** — rejeitado: distorce preço e duplica entrada.
- **Registrar só a ida** — rejeitado: a volta é parte da viagem e da decisão.

## Consequências

- A relação **Pesquisa ↔ Trecho é muitos-para-muitos**; selo **"ida-e-volta"**.
- Somatórios contam o bilhete uma vez.
- "Dois Trechos" vs "um Trecho com Escala" = **duas compras vs uma compra** — a distinção que evita confundir o voo-com-conexão-em-Bogotá (1 bilhete, 1 Trecho) com a rota-via-Miami (2 bilhetes, 2 Trechos).

Linguagem em [`../../CONTEXT.md`](../../CONTEXT.md) (invariantes 1–3).
