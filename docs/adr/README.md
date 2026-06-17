# Architecture Decision Records — traveltogether

Decisões arquiteturais relevantes (difíceis de reverter, surpreendentes sem contexto, resultado de trade-off real). Numeração sequencial. Formato inspirado no epistemix.

| # | Decisão | Status |
|---|---|---|
| [0001](0001-stack-e-arquitetura-espelha-epistemix.md) | Stack e arquitetura: espelhar o epistemix (monorepo Next.js + FastAPI + Postgres, hexagonal pragmática) | Accepted |
| [0002](0002-infra-panini-vps.md) | Infra: deploy no panini-vps (Coolify + Cloudflare), Postgres dedicado, CI com portão | Accepted |
| [0003](0003-modelo-de-acesso-mvp.md) | Modelo de acesso do MVP: gate por e-mail sem verificação + allowlist em env var | Superseded by 0013, 0015 |
| [0004](0004-modelo-de-itinerario-e-ancoragem-da-pesquisa.md) | Modelo de itinerário (Parada/Trajeto) e ancoragem da Pesquisa de Passagem | Superseded by 0018 (ancoramento) |
| [0005](0005-substrato-de-planejamento-github-issues.md) | Substrato de planejamento: GitHub Issues (Matt Pocock), divergindo do epistemix | Accepted |
| [0006](0006-autonomia-de-ops-afk-total.md) | Autonomia de ops: AFK total nas bordas 🔴 (DNS + secrets), com rotação pós-setup | Accepted |
| [0007](0007-roteiro-entra-no-mvp.md) | Roteiro entra no MVP como plano compartilhado ligado à Parada | Accepted |
| [0008](0008-imagens-de-capa-em-r2.md) | Imagens de Capa em Cloudflare R2, com Postgres guardando referências | Accepted |
| [0009](0009-aeroporto-de-referencia-na-origem-e-paradas.md) | Aeroporto de Referência na Origem e nas Paradas para rotas planejadas | Superseded by 0018 |
| [0010](0010-trajetos-derivados-das-paradas.md) | Trajetos derivados automaticamente da sequência de Paradas | Accepted (emendado por 0018: Rotas/Trechos são autorados) |
| [0011](0011-periodo-da-viagem-como-dado-proprio.md) | Período da Viagem como dado próprio informado na criação | Accepted |
| [0012](0012-summary-de-viagem-para-lista.md) | Summary de Viagem para renderizar lista sem N+1 | Accepted |
| [0013](0013-acesso-aberto-contas-proprias.md) | Acesso aberto: contas próprias (Google + e-mail com código), allowlist aposentada | Accepted (supersedes 0003) |
| [0014](0014-boundary-collaboration-alvo-polimorfico.md) | Boundary `collaboration`: Comentário e Tarefa com alvo polimórfico | Accepted |
| [0015](0015-convite-com-aceite-explicito.md) | Convite com aceite explícito: adicionar e-mail cria Convite pendente, vira Membership só no aceite | Accepted (supersedes 0003) |
| [0016](0016-orcamento-sem-conversao-de-cambio.md) | Orçamento sem conversão de câmbio (subtotais por moeda) + boundary `budget` | Accepted (fonte de passagens ajustada por 0018) |
| [0017](0017-notificacoes-persistidas-sem-barramento.md) | Notificações persistidas por destinatário, sem barramento de eventos | Accepted (tipo `decision` removido por 0018) |
| [0018](0018-rotas-multi-trecho-e-decisao-por-pessoa.md) | Rotas multi-trecho (Trajeto→Rota→Trecho→Pesquisa) e decisão de passagem por-pessoa (Preferida/Comprada) | Accepted (supersedes 0004, 0009; cardinalidade Pesquisa↔Trecho ampliada por 0019) |
| [0019](0019-pesquisa-multi-trecho-e-modo-de-transporte.md) | Pesquisa ida-e-volta (uma Pesquisa cobre vários Trechos) e Trecho com modo aéreo/terrestre | Accepted (emenda 0018) |

> A linguagem de domínio vive em [docs/CONTEXT.md](../CONTEXT.md). A direção visual provisória vive em [DESIGN.md](../../DESIGN.md).
