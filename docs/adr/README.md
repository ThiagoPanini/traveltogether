# Architecture Decision Records — travelmanager

Decisões arquiteturais da reconstrução clean-room (2026-06-20): difíceis de reverter, surpreendentes sem contexto, fruto de trade-off real. Fonte-da-verdade junto com [`CONTEXT.md`](../../CONTEXT.md) (domínio) e [`docs/design/`](../design/) (visual). Faseamento em [`docs/roadmap.md`](../roadmap.md).

| # | Decisão | Status |
|---|---|---|
| [0001](0001-criterio-e-fronteira-da-v1.md) | Critério e fronteira da v1 | Aceito |
| [0002](0002-estrutura-do-translado.md) | Estrutura do translado | Aceito |
| [0003](0003-pesquisa-multitrecho-e-modo.md) | Pesquisa cobre 1+ Trechos; Trecho tem Modo | Aceito |
| [0004](0004-decisao-por-pessoa.md) | Decisão por-pessoa (Preferida → Comprada), sem eleição de grupo | Aceito |
| [0005](0005-sem-conversao-de-unidades.md) | Sem conversão entre dinheiro e pontos | Aceito |
| [0006](0006-origem-no-perfil.md) | Origem no Perfil do Usuário (multi-origem) | Aceito |
| [0007](0007-papeis-camadas-e-convite.md) | Papéis, camadas de escrita e convite com aceite | Aceito (canal do convite em aberto) |
| [0008](0008-sistema-visual-tema-b-noturno.md) | Sistema visual: Tema B · Noturno e contrato vivo | Aceito |
| [0009](0009-faseamento-e-fatiamento.md) | Faseamento outside-in e fatiamento tracer-bullet | Aceito |
| [0010](0010-rebrand-travelmanager-e-url-panlabs.md) | Rebrand traveltogether → travelmanager e URL em panlabs.tech | Aceito |
| [0011](0011-topologia-de-autenticacao.md) | Topologia de autenticação: API autoridade de identidade, web cliente OAuth/BFF | Aceito |
| [0012](0012-camada-de-dados-sqlalchemy.md) | Camada de dados: SQLAlchemy 2.0 + Pydantic v2 (não SQLModel) | Aceito |
| [0013](0013-arquitetura-hexagonal-pragmatica.md) | Arquitetura do backend: hexagonal pragmática, feature-first, layout híbrido | Aceito |
