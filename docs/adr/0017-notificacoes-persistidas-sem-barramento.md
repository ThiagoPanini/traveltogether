# ADR 0017 — Notificações persistidas por destinatário, sem barramento de eventos

- **Status:** Accepted *(o tipo de notificação `decision` foi **removido** junto com a `Escolhida` de grupo pelo [ADR-0018](0018-rotas-multi-trecho-e-decisao-por-pessoa.md); sobram `invite`/`task`/`mention`. O resto — persistência por destinatário, sem barramento — permanece.)*
- **Data:** 2026-06-15
- **Decisores:** Thiago Panini (solo)
- **Relacionado:** [docs/CONTEXT.md](../CONTEXT.md) (`Notificação`, `Atividade`, `Preferências de Notificação`, boundary `notifications`, invariante 20), [ADR-0014](0014-boundary-collaboration-alvo-polimorfico.md), [ADR-0015](0015-convite-com-aceite-explicito.md)

## Contexto

O redesenho tem **dois** conceitos parecidos, mas distintos:

- **Atividade:** feed cronológico **derivado** do que aconteceu nas `Viagem`s do `Usuário` (alguém entrou, registrou `Pesquisa`, comentou). Público para os membros, sem destinatário, sem estado de leitura. **Já existe** em `trips/activity_service.py`.
- **Notificação:** aviso **direcionado a um destinatário** (`Convite` a aceitar, `Escolhida` numa `Viagem` sua, `Tarefa` atribuída a você, `menção`), com estado **lida/não-lida** e contador no shell.

A pergunta é como modelar a Notificação e como os boundaries que originam os eventos a alimentam, dado que este código **não tem barramento de eventos** — boundaries se chamam por service direto.

## Decisão

- **`Notificação` é entidade persistida, uma linha por destinatário**, com `recipient_id`, `kind` (`invite`/`decision`/`task`/`mention`), referência ao alvo, texto e `read_at`. Mantida separada da `Atividade` (que continua derivada e sem estado de leitura).
- **Boundary novo `notifications`** é dono dela. Os boundaries que produzem o evento (`trips`, `fares`, `collaboration`) **chamam `notifications.service` diretamente** ao gerar o aviso — **sem event bus, sem pub/sub** —, no mesmo padrão "um boundary chama o service de outro" já usado no projeto.
- **Entrega filtrada por `Preferências de Notificação`** do `Usuário` (interruptor por tipo + opt-in de resumo por e-mail), que vivem no perfil (`identity`), não na `Viagem`.
- Invariante 20: estado lida/não-lida é por destinatário; marcar como lida não altera o domínio de origem (não é sinal de decisão).

## Justificativa

- **Persistir é necessário pelo read-state:** "não-lida" e o contador exigem uma linha por destinatário; não dá para derivar honestamente de um feed sem inventar um cursor frágil, e convites direcionados não são deriváveis de atividade pública.
- **Sem barramento porque não precisamos dele:** introduzir event bus/outbox seria peso arquitetural desproporcional para um app deste tamanho. Chamada de service direta é explícita, testável e consistente com o resto do código.
- **Atividade e Notificação não se fundem:** têm cardinalidade (público vs. por destinatário), persistência (derivado vs. armazenado) e propósito (panorama vs. "preciso de você") diferentes. Unificá-las acoplaria dois conceitos que mudam por razões distintas.

## Consequências

- Novo boundary a registrar em `alembic/env.py` e a espelhar em `packages/types`.
- **Acoplamento de escrita explícito:** quem marca `Escolhida`, atribui `Tarefa` ou cria `Convite` passa a depender do service de `notifications`. Aceitável; é dependência de service, não de modelo.
- **@menção precisa de parsing:** `collaboration` identifica menções no texto do `Comentário` e chama `notifications`; o mecanismo exato (sintaxe, resolução de `Usuário`) é detalhe de implementação.
- **Resumo por e-mail (digest)** reusa o `email_service` de `platform`; é entrega assíncrona/agendada, fora do caminho síncrono — pode vir numa onda posterior.

## Opções rejeitadas

- **Derivar tudo de Atividade + cursor de leitura:** menos armazenamento, mas read-state por item e convites direcionados ficam tortos, e @menção precisaria de parsing de qualquer jeito. Recusado.
- **Inbox dentro de `identity`:** mesmo modelo persistido, mas mistura preocupações cross-domain de notificação no boundary que é só auth/conta. Recusado por coesão.
- **Event bus / outbox para alimentar notificações:** desacoplaria produtores e consumidor, mas é infraestrutura cara demais para a escala atual; preterido em favor de chamada de service direta.
