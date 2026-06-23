# 0010 — Rebrand traveltogether → travelmanager e URL em panlabs.tech

**Status:** Aceito

## Contexto

O autor criou o `panlabs.tech` como vitrine das suas soluções SaaS e decidiu
padronizar todas as URLs como subdomínios de `panlabs.tech`. O traveltogether
vivia em `traveltogether.thiagopanini.dev`. Além da URL, a identidade muda: o
produto passa a se chamar **travelmanager** (gestão + parceria da viagem em
grupo), wordmark `travel·manager` (ponto-do-meio só no display).

Decisivo para o **timing**: só a Fase 0+1 (landing + `/health`) está no ar —
sem login, sem dados de usuário, sem links de convite soltos, DB só com o
baseline do Alembic. O custo de renomear só **cresce** quando as Fases 2–6
(auth, viagens, pesquisas) forem construídas sobre o identificador antigo.

## Decisão

Renomear **traveltogether → travelmanager** de forma **profunda** e mover a URL
para **`travelmanager.panlabs.tech`**.

- **Profundo:** marca + identificadores de código (pacote Python `travelmanager`,
  scope `@travelmanager/web`, imagens `ghcr.io/.../travelmanager-{web,api}`, env
  `TRAVELMANAGER_API_URL`, DB, PathPrefix `/tm-api`) + docs vivos + card no
  panlabs + repo no GitHub.
- **Histórico preservado:** `prompts/` datados, exports de design `.dc.html` e
  ADRs antigos ficam como nasceram — reescrever falsifica o registro.
- **Corte sem buraco:** provisiona o novo ao lado do velho, verifica, e só então
  liga um **301 permanente** `traveltogether.thiagopanini.dev → travelmanager.panlabs.tech`.
- **Não toca o glossário** (`CONTEXT.md`): decisão de marca/infra, não de
  linguagem; só a linha de título muda.

## Opções consideradas

- **Só trocar a URL, mantendo o nome traveltogether** — rejeitado: marca partida;
  o panlabs catalogaria um nome fora da padronização.
- **Rebrand só de casca** (marca/URL, mantendo `traveltogether` nos identificadores
  de código) — rejeitado: as tripas mentiriam para sempre; agora é barato ir fundo.
- **Renomear depois das Fases 2–6** — rejeitado: custo e risco crescem a cada
  fatia construída sobre o nome velho.

## Consequências

- O repo GitHub é renomeado; o GitHub faz 301 das URLs antigas.
- O domínio antigo vira 301 permanente (salva bookmark/SEO/o card).
- O DB é recriado limpo como `travelmanager` (baseline via `alembic upgrade`);
  zero migração de dados.
- `epistemix → ethitorial` é trilha paralela que reaproveita este playbook.
- Rollback é limpo em cada gate: o velho fica vivo até o novo ser verificado.

Linguagem e invariantes em [`../../CONTEXT.md`](../../CONTEXT.md) (inalterado).
