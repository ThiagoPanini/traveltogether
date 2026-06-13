# ADR 0014 — Boundary `collaboration`: Comentário e Tarefa com alvo polimórfico

- **Status:** Accepted
- **Data:** 2026-06-13
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [docs/CONTEXT.md](../CONTEXT.md) (boundary `collaboration`, `Comentário`, `Tarefa`, invariantes 17–18), [ADR-0001](0001-stack-e-arquitetura-espelha-epistemix.md)

## Contexto

A evolução para plataforma traz dois primitivos de coordenação do grupo: **`Comentário`** (discussão assíncrona) e **`Tarefa`** (trabalho atribuído a `Responsável`eis, em board). Ambos precisam se prender a coisas que pertencem a **outros boundaries**: uma `Pesquisa de Passagem` (`fares`), um `Item de Roteiro`/`Parada`/`Trajeto` (`trips`), ou a própria `Viagem`. Onde colocá-los e como referenciar o alvo sem violar a regra de não importar modelos cross-boundary?

## Decisão

- **Um boundary novo `collaboration`** é dono de `Comentário` e `Tarefa` — não os espalhamos por `trips`/`fares`.
- **Alvo polimórfico:** cada `Comentário`/`Tarefa` referencia seu alvo por um par **(`target_type`, `target_id`)** — id apenas, nunca FK rígida para tabelas de outros boundaries, na mesma disciplina com que `fares` referencia `Trajeto` por `LegId`.
- **Âncora opcional na `Tarefa`** (pode ser solta, ex.: "reservar hotel"); **obrigatória no `Comentário`** (sempre comenta algo — incluindo a `Viagem`, que é o mural).
- **Autorização e existência** dos alvos são checadas chamando o *service* do boundary dono (ex.: `trips.service.get_trip_membership`), não lendo suas tabelas.

## Justificativa

- **Coesão pelo motivo, não pela tabela alvo:** comentar e atribuir são a mesma classe de ação ("o grupo coordenando sobre X"); juntá-las num boundary evita duplicar a lógica de targeting/membership em cada lugar.
- **Granularidade proporcional (ADR-0001):** um boundary fino e claro é melhor que costurar comentários e tarefas dentro de `trips` e `fares`, que ficariam com responsabilidade que não é deles.
- **Aditivo e reversível-por-alvo:** ampliar os `target_type` aceitos é só liberar um tipo novo; não mexe nos boundaries donos.

## Consequências

- **Sem integridade referencial no banco para o alvo** (o polimorfismo abre mão da FK): a consistência é garantida em `service.py` validando o alvo via boundary dono antes de gravar. Trade-off conhecido — o mesmo já valia para `fares`→`LegId`.
- `Comentário` é o **primeiro write de um `Membro`** (invariante 17); `Tarefa` é criada/atribuída só por `Organizador`, mas movida por qualquer `Responsável` (invariante 18).
- O **feed de Atividade** da home consome `collaboration` (e `fares`/`trips`) de forma derivada — sem event store dedicado na primeira versão.

## Opções rejeitadas

- **Comentários/Tarefas dentro de `trips`:** quebraria ao precisar mirar `Pesquisa de Passagem` (de `fares`) e inflaria `trips` com responsabilidade alheia.
- **Uma tabela de junção por tipo de alvo (sem polimorfismo):** integridade referencial real, mas N tabelas e N caminhos de código que crescem a cada novo alvo; preterido pela simetria e pelo custo de manutenção.
- **Dois boundaries separados (`discussion` + `tasks`):** fragmentaria dois primitivos que compartilham exatamente o mecanismo de targeting/membership; preterido por over-fragmentação.
