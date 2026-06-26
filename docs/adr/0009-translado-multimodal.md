# 0009 — Translado multi-modal: tipo de primeira classe e Pesquisa para qualquer tipo

**Status:** Aceito

## Contexto

A v1 foi cravada em [ADR-0001](0001-criterio-e-fronteira-da-v1.md) como "profunda num único lugar — a pesquisa de translado **aéreo**", com o terrestre como conector estrutural **sem cotação registrável** (invariante 8; o glossário de Modo dizia "cotação + rateio = em breve").

Ao destrinchar a jornada de **criação de viagem**, ficou claro que o sucesso do produto — na visão do dono — inclui **comparar formas concretas de vencer um salto**: Miami→Orlando de **carro alugado vs. avião**; **ônibus vs. trem vs. van** num trecho europeu. O **Modo** binário (aéreo/terrestre) não tem resolução pra responder "ônibus ou trem?", e restringir a **Pesquisa** ao aéreo empurra pra fora do app justamente a decisão que o grupo quer tomar dentro dele. Isto não contradiz o domínio: o terrestre já era um "em breve" — estamos **acelerando** e **refinando** esse "em breve", não inventando contra a corrente.

## Decisão

- **Tipo de translado** (`transfer_kind`) vira atributo de **primeira classe**: avião · carro alugado · carro próprio · ônibus · trem · van/transfer · a pé · **outro** (texto livre) · **em discussão**. **Modo** (`mode`) passa a ser **derivado** do tipo (aéreo = avião; terrestre = o resto) e marca só o que é **específico de aéreo** — IATA, milhas, escala.
- **Pesquisa passa a valer pra qualquer tipo** (os que têm o que cotar; a pé e carro próprio não hospedam Pesquisa de preço). A comparação multi-modal é **visual**, dentro da mesma unidade, e o app **não elege** vencedor — o invariante 5 (sem conversão; o app alinha, não vende) fica **intacto**. Per-pessoa vs. por-veículo é dimensão da própria Pesquisa.
- Na **criação**, cada salto carrega um **translado desejado** (`desired_transfer`) — só uma **proposta** (hint que **semeia** a exploração, não um Trecho), que nasce **em discussão**. Nos saltos **compartilhados** (parada→parada) é a proposta do Organizador pro grupo; nas **pontas** (casa↔parada, por-pessoa — inv. 6) é proposta **pessoal**: o **criador propõe a própria ponta já na criação**, e cada membro propõe a dele ao entrar. A consolidação real é **por-pessoa**, via Pesquisa → Preferida → Comprada.
- **Build faseado:** a criação grava o **translado desejado agora**; a Pesquisa multi-modal chega na fatia de **exploração** (depois). Reconciliar a UI da Pesquisa com o domínio fica pra quando ela for construída (just-in-time, [ADR-0003](0003-faseamento-e-fatiamento.md)).

## Opções consideradas

- **Manter Pesquisa só-aérea (inv. 8 original)** — rejeitado: impede a comparação carro-vs-avião / ônibus-vs-trem que é central ao uso real e empurra a decisão terrestre pra fora do app.
- **Tipo como rótulo cosmético na criação, colapsando em Modo binário** — rejeitado: criaria dado descartável no passo 3 e exigiria **migração** quando a Pesquisa multi-modal chegasse. Como a decisão de modelo é load-bearing já nesta fatia, o tipo precisa nascer primeira-classe.
- **Resolver o rateio automático agora (dividir o custo do carro entre passageiros)** — rejeitado: é a parte genuinamente de **Orçamento**, e o invariante 5 (comparação visual, app não decide) já deixa **registrar e comparar** sem auto-dividir. Mantém o escopo da fatia honesto.

## Consequências

- **Emenda o [ADR-0001](0001-criterio-e-fronteira-da-v1.md):** o "lugar profundo" da v1 deixa de ser "pesquisa **aérea**" e passa a "pesquisa de translado **multi-modal**". O critério (um lugar profundo + cascas honestas no resto) continua valendo — o lugar só ficou mais largo.
- Reescreve o **invariante 8** e ajusta **2 e 3** no `CONTEXT.md`; revisa o glossário de **Modo / Trecho / Pesquisa**; adiciona **tipo de translado** e **translado desejado**; remove **"cotação de carro"** da lista "em breve" (virou Pesquisa multi-modal).
- A pele visual (Noturno) ganha **ícones por tipo** — mono/linha, terracota, nunca emoji colorido.
- **Continua "em breve"** (Orçamento): só o **rateio automático** de custo por-veículo.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md).
