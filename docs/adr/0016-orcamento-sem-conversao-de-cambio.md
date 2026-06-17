# ADR 0016 — Orçamento sem conversão de câmbio + boundary `budget`

- **Status:** Accepted *(a fonte de passagens do `Orçamento` passou de `Escolhida` de grupo para `Preferida`/`Comprada` **por-pessoa** pelo [ADR-0018](0018-rotas-multi-trecho-e-decisao-por-pessoa.md); o resto — sem câmbio, subtotais por moeda — permanece)*
- **Data:** 2026-06-15
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [docs/CONTEXT.md](../CONTEXT.md) (`Orçamento`, `Hospedagem`, `Extra`, `Base de rateio`, boundary `budget`, invariantes 15 e 19), [ADR-0004](0004-modelo-de-itinerario-e-ancoragem-da-pesquisa.md)

## Contexto

O redesenho traz um **Orçamento** que soma as `Pesquisa de Passagem`s `Escolhida`s + custos de `Hospedagem` por `Parada` + `Extra`s, exibindo um custo estimado por pessoa. O protótipo resolvia isso convertendo tudo para BRL via uma tabela de câmbio fixa (`FX_TO_BRL`) e mostrando uma manchete única "R$ X por pessoa".

Isso colide de frente com a invariante 15 (**não há conversão de câmbio — comparação é visual**), que a tela de comparação de passagens respeita. E hardcodar BRL como moeda-base contradiz o horizonte de SaaS aberto (grupos fora do Brasil).

## Decisão

- **Não há conversão de câmbio em lugar nenhum, nem moeda-base do sistema.** A invariante 15 passa a valer também para o `Orçamento`.
- O `Orçamento` **soma por moeda**: moedas distintas aparecem como **subtotais separados** (ex.: `R$ 3.640` + `€ 489` por pessoa), nunca como um número único convertido.
- Mantém os recortes **por pessoa** e **por grupo**, calculados *dentro de cada moeda*; a `Base de rateio` (`por pessoa`/`rateado`) decide como cada linha entra no subtotal por pessoa (rateado divide pelo nº de `Membership`s).
- **Boundary novo `budget`** é dono de `Hospedagem` e `Extra`. Ele **agrega** lendo as `Escolhida`s via service de `fares` e as `Parada`s/`Membership`s via service de `trips` — nunca importando seus modelos (mesma disciplina do ADR-0014).

## Justificativa

- **Honestidade sobre conveniência:** um número único em BRL seria uma falsa precisão (câmbio flutua, datas de compra diferem). Subtotais por moeda dizem a verdade que o grupo precisa para decidir.
- **Sem dependência de FX:** nada de feed de cotação para manter nem constantes que envelhecem.
- **Pronto para abrir:** sem moeda-base, o produto serve qualquer grupo/moeda sem viés brasileiro.
- **Coesão por motivo (ADR-0001):** custo estimado é responsabilidade própria; não infla `trips` (estrutura) nem `fares` (convergência de passagem) com somatórios de orçamento.

## Consequências

- A manchete "R$ X por pessoa" do protótipo **não existe**; a UI mostra subtotais por moeda com nota mono explicando que não há conversão.
- Novo boundary a registrar em `alembic/env.py` e a espelhar em `packages/types`.
- `Hospedagem` ancora a uma `Parada` (noites derivadas das datas da `Parada`); `Extra` é no nível da `Viagem`. Só `Organizador`es editam (invariante 19).
- Se um dia o grupo quiser uma estimativa combinada, a saída documentada é um **câmbio assumido pelo grupo** (entrada manual por `Viagem`, rotulada como estimativa) — não um feed nem BRL fixo. Fora de escopo agora.

## Opções rejeitadas

- **Converter tudo para BRL (protótipo):** viola a invariante 15, hardcoda moeda-base, cria dependência de câmbio. Recusado.
- **Câmbio definido pelo grupo para um número único:** preserva a manchete e fica honesto, mas adiciona um conceito (taxa por Viagem) e superfície de UI sem demanda comprovada; adiável.
- **Dobrar orçamento dentro de `trips`:** menos chamadas cross-boundary (paradas/membros são locais), mas mistura custo com estrutura de itinerário e incha `trips`. Recusado por coesão.
