# Grilling — Arquitetura hexagonal pragmática do backend (2026-06-24)

> **O que é esta nota.** O registro **rico** da sessão de grilling (`/grill-with-docs`) que
> estabeleceu o padrão de backend do travelmanager. O `CLAUDE.md` (§Padrões de backend) carrega
> a regra ratificada; o [ADR-0005](../adr/0005-arquitetura-hexagonal-pragmatica.md) carrega a
> decisão indexada. **Esta nota carrega o oceano** — cada opção, o steelman do lado perdedor, o
> caminho rejeitado e por quê. Existe para (a) resgatar o _porquê-do-porquê_ quando a regra for
> questionada, e (b) ser **matéria-prima de uma eventual skill de bolso `code-as-me`** (analogia ao
> `write-as-me` do ethitorial): compilar o conhecimento das skills genéricas usadas
> (`hexagonal-architecture`, `python-project-structure`, `python-code-style`, `python-testing-patterns`)
> no _dialeto desta casa_, para nunca mais precisar engatilhá-las.
>
> **Como ler.** Cada Q é um nó da árvore de decisão. A ordem importa: cada resposta destrava a
> próxima. O contexto é a Fase 2 (login), com a #189 (trilhos de identidade) já mergeada e prestes a
> ser refatorada para este padrão.

## TL;DR — as decisões

| # | Pergunta | Decisão |
|---|---|---|
| Q1 | Quão purista? | **Pragmática (b)** — Ports via `Protocol`, ORM é a entidade, Pydantic só na borda |
| Q2 | Feature-first ou layer-first? | **Feature-first** — bounded context = pacote |
| Q3 | Profundidade do contexto? | **Híbrido** — 3 pastas-costura, flat dentro |
| Q4 | Idioma da aplicação? | `Protocol` ports · use-case `@dataclass(frozen)` `__call__` · `dependencies.py` por contexto |
| Q4′ | `save()` explícito? | **Sim** — honestidade do Port, portabilidade, testabilidade (mudei meu lean) |
| Q5 | Fronteira transacional? | `repo.save`=`add`+`flush`; commit/rollback só no `get_db`; request=UoW |
| Q6 | Tradução de erro? | Categorias semânticas (sem nº HTTP) + 1 handler central; outbound traduz infra→domínio |
| Q7 | Testes? | GWT (`# given:/when:/then:`), fakes de Port, split por costura, `FixedClock`>freezegun |
| Q8 | Acionar as skills? | **Não** — destilar tudo no `CLAUDE.md`; "aplicar padrão" ≠ "invocar skill" |
| Q9 | Onde mora o quê? | 3 artefatos: CLAUDE.md enxuto · ADR-0005 conciso · esta nota rica |

---

## Q1 — Quão purista? (decide todo o resto)

**O nó.** Hexagonal "de livro" quer **três representações** de `User`: entidade de domínio pura
(sem import de framework) + modelo ORM (adapter de persistência) + DTO Pydantic (borda HTTP). Cada
request mapeia entre as três. Em FastAPI isso briga com o framework — `Depends` já é injeção, ORM já
modela. A skill `hexagonal-architecture` cobre TS/Java/Kotlin/Go — **não Python**; logo, os idiomas
precisam ser traduzidos, não copiados.

**Opções.**
- **(a) Purista** — domínio em `@dataclass` puro, ORM e Pydantic como adapters, mapeamento triplo.
  Máxima isolação, máximo cerimonial.
- **(b) Pragmático** — use-cases dependem de **Ports** (`typing.Protocol`); ORM serve de entidade
  (com métodos de comportamento), Pydantic só na borda; `Depends` = composition root. Inverte o que
  tem I/O real; não paga o imposto do triplo-mapeamento até uma feature exigir.
- **(c) Light** — só uma camada `services/` entre rotas e ORM, sem Ports formais.

**Recomendação e decisão: (b).** Razão: o domínio do `CONTEXT.md` (Trip/Stop/Leg/Route/Segment/
FareQuote/Preference + 10 invariantes) é rico o bastante para justificar use-cases testáveis com
fakes — mas auth é majoritariamente orquestração de I/O, e Python/FastAPI pune a pureza purista
(triplo-mapeamento vira boilerplate morto). (b) dá testabilidade por Port sem fingir que ORM é veneno.

**O steelman do lado rejeitado (a), e por que aceitamos o custo.** Se um dia trocar SQLAlchemy por
outro ORM, (b) **vaza** — porque a entidade _é_ o ORM. Aceitamos esse acoplamento conscientemente: a
probabilidade real de troca de ORM neste projeto não paga o imposto perpétuo do triplo-mapeamento. É
o mesmo trade-off do [ADR-0005](../adr/0005-arquitetura-hexagonal-pragmatica.md) (rejeitar SQLModel para
**separar** persistência de contrato) levado à camada de aplicação.

---

## Q2 — Feature-first ou layer-first?

**O nó.** O `CONTEXT.md` já desenha contextos: identidade, viagem (Trip/Stop/Leg/Route), pesquisa
(FareQuote/Preference), pessoas (membership/convite).

**Opções.**
- **(a) Layer-first** — `domain/`, `application/`, `adapters/`, `schemas/` no topo, todo contexto
  misturado dentro de cada. Vira sopa quando crescer.
- **(b) Feature-first** — cada contexto é um pacote com hexagonal dentro; `shared/` para o
  cross-contexto.

**Recomendação e decisão: (b).** Alinha com `python-project-structure` (Pattern 7, domain-driven
para apps complexas) e com o mapa de bounded contexts do `CONTEXT.md`. O blast-radius de uma feature
fica num pacote; `trips/`, `fares/`, `membership/` aterrissam no mesmo molde depois.

**O que vai em `shared/` (e o que não vai).** `shared/` é **plumbing cross-contexto**, ortogonal à
pureza (Q1). Entra: infra de DB (`Base`, engine, sessionmaker, `get_db`), Ports genéricos + adapter
default (`Clock`/`now()`, `TokenGenerator`), exceções-base. **Não entra** nada de identidade (lógica
de sessão, OTP, kill-switch) — isso é do contexto `identity`. **Regra de entrada:** só se (≥2
contextos usam) **ou** (é plumbing puro de framework). `shared/` não é gaveta de tralha.

---

## Q3 — Granularidade do contexto: flat, nested ou híbrido?

Este foi o nó mais debatido. O usuário achou o **nested completo** tentador ("parece mais
organizado"). O grilling honesto:

**Por que (b) nested seduz — e está parcialmente certo.** O `python-project-structure` condena
nesting tipo `core/internal/services/impl/user/` — mas isso é profundidade **sem significado**.
`domain/application/adapters` são **costuras que sustentam carga**, não camadas arbitrárias. Os três
nomes no topo são auto-documentação. O instinto pelo nested é legítimo _quanto à costura de topo_.

**Onde nested erra no nosso tamanho.** O custo não é a costura de topo — é a **profundidade abaixo
dela**: `application/ports/session_repository.py` + `adapters/outbound/sqlalchemy/session_repository.py`
são pastas que hoje seguram **um arquivo cada**. Pasta com um módulo diz o nome duas vezes. Some o
imposto de import (`from travelmanager.identity.adapters.outbound.sqlalchemy.session_repository
import …`) e cristaliza um chute (OTP/Google/linking ainda vão ensinar onde identity racha).

**O critério que decide (não é gosto).** _identity é representativo do tamanho final de um contexto,
ou é um nanico?_ Se `trips`/`fares` vão ser gordos (e o `CONTEXT.md` diz que sim), a consistência de
nested se pagaria. Mas a profundidade abaixo da costura não se paga **em nenhum** tamanho enquanto os
arquivos forem únicos.

**Síntese ratificada: híbrido — 3 pastas-costura no topo, flat dentro.**

### Decomposição da #189 real → papéis hexagonais (idêntica nos 3 cenários)

| hoje | símbolo | vira papel |
|---|---|---|
| `db.py` | engine, sessionmaker, `get_db`, readiness, `Base` | **shared** (infra) |
| `models.py` | `User, Profile, AuthSession, OtpCode, AuthIdentity` | **domain** (entidade ORM) |
| `sessions.py` | `hash_session_token`, validade (expirou/revogou) | **domain** (regra pura) |
| `sessions.py` | `generate_session_token` (secrets), `_now` | **ports** → adapter (`TokenGenerator`, `Clock`) |
| `sessions.py` | `create/resolve/revoke` — parte persistência (`db.add/scalar/flush`) | **adapter outbound** (`SessionRepository`) |
| `sessions.py` | `create/resolve/revoke` — parte política (TTL, `last_used_at`) | **use-case** |
| `auth.py` | `_bearer_token`, `get_current_session`, rotas `/me` `/logout` | **adapter inbound** (HTTP) |
| `schemas.py` | `ProfileRead, UserRead, MeRead` | **DTO** (borda) |

> Nota: hoje `resolve_session` mistura persistência + política num só lugar. Hexagonal **força**
> rachar isso — e esse racha é igual nos 3 cenários. O debate era só a profundidade das pastas.

### Os três cenários (só a foldering muda)

**Total flat** — 0 pastas, 0 `__init__` extra. Perde a regra de dependência visível (só na cabeça):
```
identity/  models.py  rules.py  ports.py  use_cases.py  repository.py  routes.py  schemas.py
```

**Total nested** — ~7 pastas, ~9 `__init__.py`, arquivos de 1 símbolo (`logout.py` = 6 linhas):
```
identity/
  domain/{models.py, session_rules.py}
  application/ports/{session_repository.py, token_generator.py}
  application/use_cases/{resolve_session.py, logout.py}
  adapters/inbound/http/{routes.py, dependencies.py, schemas.py}
  adapters/outbound/sqlalchemy/{session_repository.py}
```

**Híbrido (escolhido)** — 3 pastas, 4 `__init__.py`, zero pasta-com-um-arquivo:
```
travelmanager/
  shared/
    db.py            # Base, engine, sessionmaker, get_db, readiness
    clock.py         # Clock(Protocol) + SystemClock
    errors.py        # categorias semânticas + install_error_handlers
  identity/
    __init__.py      # __all__ do seam do contexto
    domain/
      models.py      # ORM entities
      rules.py       # hash_session_token, session_is_valid
    application/
      ports.py       # SessionRepository, TokenGenerator
      use_cases.py   # ResolveSession, Logout
    adapters/
      routes.py      # inbound: /me, /logout, get_current_session
      schemas.py     # Pydantic DTOs
      repository.py  # outbound: SqlAlchemySessionRepository
  main.py
```

| placar (identity) | flat | nested | híbrido |
|---|---|---|---|
| pastas | 0 | ~7 | 3 |
| `__init__.py` | 0 | ~9 | 4 |
| regra de dependência visível? | ❌ | ✅ | ✅ |
| ruído pasta-com-1-arquivo | — | alto | nenhum |

**Veredito:** o híbrido dá ~90% da "cara organizada" do nested por ~20% do custo. Subpasta
(`adapters/outbound/...`) só nasce quando houver 2+ adapters do mesmo lado.

---

## Q4 — Idioma da aplicação

A camada inteira no caminho real `resolve_session → /auth/me`. Vira o **template** da refatoração e
da #190+.

**Ports = `typing.Protocol`** (estrutural, não `abc.ABC`):
```python
# identity/application/ports.py
from typing import Protocol
from datetime import datetime
from travelmanager.identity.domain.models import AuthSession

class SessionRepository(Protocol):
    def get_by_token_hash(self, token_hash: str) -> AuthSession | None: ...
    def save(self, session: AuthSession) -> None: ...   # cria ou persiste mutação

class Clock(Protocol):
    def now(self) -> datetime: ...
```

**Regra pura no domínio** (método na entidade quando é sobre o próprio estado):
```python
# identity/domain/rules.py
import hashlib, hmac
def hash_session_token(token: str, pepper: str) -> str:
    return hmac.new(pepper.encode(), token.encode(), hashlib.sha256).hexdigest()

# identity/domain/models.py  (método no ORM-entidade)
class AuthSession(Base):
    def is_valid_at(self, moment: datetime) -> bool:
        return self.revoked_at is None and _as_aware(self.expires_at) > moment
```

**Use-case = dataclass frozen callable**:
```python
# identity/application/use_cases.py
@dataclass(frozen=True, slots=True)
class ResolveSession:
    sessions: SessionRepository
    clock: Clock
    pepper: str

    def __call__(self, raw_token: str) -> AuthSession | None:
        session = self.sessions.get_by_token_hash(hash_session_token(raw_token, self.pepper))
        now = self.clock.now()
        if session is None or not session.is_valid_at(now) or not session.user.is_active:
            return None
        session.last_used_at = now
        self.sessions.save(session)
        return session
```

**Adapter outbound** (satisfaz o Protocol estruturalmente, sem herdar):
```python
# identity/adapters/repository.py
class SqlAlchemySessionRepository:
    def __init__(self, db: Session) -> None: self._db = db
    def get_by_token_hash(self, h: str) -> AuthSession | None:
        return self._db.scalar(select(AuthSession).where(AuthSession.token_hash == h))
    def save(self, session: AuthSession) -> None:
        self._db.add(session)
        self._db.flush()
```

**Composition root = um provider FastAPI por contexto** (wiring centralizado):
```python
# identity/adapters/dependencies.py
def provide_resolve_session(db: Annotated[Session, Depends(get_db)]) -> ResolveSession:
    return ResolveSession(SqlAlchemySessionRepository(db), SystemClock(), session_pepper())
```

**As três sub-escolhas, com o porquê fundo.**

1. **Protocol, não ABC.** Estrutural = o adapter **não importa** `application/ports` para
   implementar; a seta de dependência fica pura (adapter não aponta para cima). O Port é _propriedade
   do consumidor_ (application); o adapter "calha de ter a forma". pyright verifica no ponto de uso
   (no `provide_*`). ABC forçaria `class SqlAlchemySessionRepository(SessionRepository)` — import de
   application dentro de adapters, referência nominal para cima. **Cuidado:** o check estrutural só
   dispara onde há anotação — por isso anotamos o retorno do `provide_*` e os campos do use-case.
2. **Use-case = dataclass `frozen` + `__call__`.** Compra: (a) aplicação parcial dos Ports no
   composition-time, deixando a borda chamar só `use_case(raw_token)` — Ports não vazam para a rota;
   (b) um tipo nomeado e grepável por use-case; (c) uniformidade (todo use-case se acha igual).
   `frozen` = imutável; `slots` = sem atributo acidental. Para `logout` (3 linhas) é leve exagero,
   mas consistência > economizar 2 linhas.
3. **`dependencies.py` por contexto = o composition root.** Centralizar por contexto (não por rota):
   quando `ResolveSession` ganhar um Port novo (ex.: auditoria na #194), muda **um** provider, não N
   rotas. Rotas ficam declarativas (`Depends(provide_…)`).

### Q4′ — O debate do `save()` explícito (mudei meu lean)

No Q4 eu inclinei para "aceita o vazamento" (sem `save()`, confiando no dirty-tracking do
SQLAlchemy). Refletindo, **revertí** para `save()` explícito. Três razões, em ordem de peso:

1. **Honestidade do contrato.** O Port é a lista completa de capacidades. Sem `save()`, quem lê o
   use-case + o Port não sabe o que toca o banco (mutação persiste invisível).
2. **Portabilidade.** Troque o adapter por SQL cru / HTTP / cache e a mutação `last_used_at = now`
   **some sem sinal nenhum** — nem erro de tipo, nem teste vermelho. `save()` força a escrita em todo
   adapter. Sem ele, o Q1-pragmático acopla não só na entidade ORM, mas na **semântica de
   unit-of-work** do SQLAlchemy — mais fundo do que combinamos.
3. **Testabilidade (é segurança).** O `logout` zera `revoked_at` (mata sessão). Quero um teste que
   prove _"logout pediu para persistir a revogação"_, não só "setou um campo em memória". Sem
   `save()`, fake e use-case compartilham a referência → o teste não distingue "mutei" de "persisti".
   Para `revoked_at` (kill-switch) isso é exatamente o que se quer blindar.

```python
# o fake registra a INTENÇÃO de persistir:
class FakeSessionRepository:
    def __init__(self): self.saved, self._by_hash = [], {}
    def get_by_token_hash(self, h): return self._by_hash.get(h)
    def save(self, s): self.saved.append(s); self._by_hash[s.token_hash] = s

# com save():  assert revoked in repo.saved        # prova o efeito de persistência
# sem save():  assert session.revoked_at is not None  # passa mesmo se nada persistir
```

**A objeção mais forte (e a réplica).** O `save()` no adapter SQLAlchemy é quase no-op
(`self._db.add` é inócuo para objeto rastreado; o UPDATE real sai do dirty-tracking no commit). Então
`save()` parece _teatro_. **Réplica:** o valor do `save()` não é executar o SQL — é ser a **costura do
contrato**: deixa o fake registrar intenção, sobrevive à troca de adapter, torna os efeitos legíveis.
Ports se escrevem para o **contrato**, não para o adapter de hoje. O custo (uma linha por mutação) é o
preço de um Port que não mente. **Decisão:** `add` e mutação-persistida colapsam em **um** método
`save(entity)` — em SQLAlchemy os dois são `self._db.add`.

---

## Q5 — Fronteira transacional

**Decisão: split em dois tempos.**
- **`repo.save()` = `add` + `flush`** — ataca a escrita agora (manda o SQL, **aflora erro de
  constraint**), sem durabilidade.
- **commit/rollback = só no `get_db`** (borda do request) — durabilidade + atomicidade. **Use-case
  nunca commita.**

```python
# shared/db.py — a unit-of-work É o escopo do request
def get_db() -> Iterator[Session]:
    factory = get_sessionmaker()
    if factory is None:
        raise HTTPException(503, "banco indisponível")
    db = factory()
    try:
        yield db
        db.commit()          # único commit, na borda
    except Exception:
        db.rollback()        # qualquer falha no request desfaz o que deu flush
        raise
    finally:
        db.close()
```

**Por que o split (e não "commit só no `get_db`, sem flush").** O nó é **tradução de erro** (Q6).
Exemplo #195 (linkar identidade) violando `uq_provider_subject`:
- _Sem_ flush no `save()`: o `INSERT` só sai no commit do `get_db` — depois que o use-case saiu da
  pilha. O `IntegrityError` estoura na finalização da dependency, **sem o use-case para traduzir** →
  500 cru.
- _Com_ flush no `save()`: o `IntegrityError` estoura **dentro** do use-case → o adapter captura e
  re-lança erro de domínio (`IdentityAlreadyLinked`) → a rota mapeia para 409. Traduzível.

A **pegadinha do yield-dependency do FastAPI** fica desarmada: o commit que sobra no `get_db` só
falha por **infra** → **500 é o código certo mesmo**. Os erros traduzíveis já afloraram no flush.
Atomicidade intacta: flush ≠ durável; um passo posterior que falhe dispara o `rollback` que apaga o
flush. Um request = uma transação.

**Anti-cerimônia.** Sem classe `UnitOfWork` explícita — o escopo do request **é** a UoW, e `get_db`
é o seu nome. Port de UoW injetável só se pagaria com transação aninhada/saga (YAGNI). `get_db` mora
em `shared/db.py`.

**Bônus nos testes.** Teste de use-case usa o `FakeSessionRepository` → `save()` só registra, **sem
Session, sem transação**. A fronteira transacional só existe nos testes de adapter/integração.

---

## Q6 — Tradução de erro: as 3 costuras

| costura | levanta | exemplo |
|---|---|---|
| **outbound** (repo) | captura infra, re-lança **erro de domínio** | `IntegrityError` → `IdentityAlreadyLinked` |
| **domain/application** | **erro de domínio** puro (sem HTTP, sem SQLAlchemy) | `OtpExpired`, `OtpThrottled` |
| **inbound** (rota/dep) | mapeia domínio→HTTP **num handler central** | `Conflict`→409, `RateLimited`→429 |

**A jogada-chave: categorias semânticas, não números.** Erro de domínio não carrega `410`; carrega
uma **categoria semântica** (`NotFound`/`Conflict`/`Invalid`/`RateLimited`/`Unauthorized`). Essas
categorias transcendem HTTP (mapeiam para gRPC, exit-code de CLI) → **não são vazamento de HTTP**, são
vocabulário de aplicação. O número vive **uma vez**, no handler (a costura HTTP literal).

```python
# shared/errors.py — categorias puras, ZERO HTTP
class DomainError(Exception):
    code = "domain_error"
    def __init__(self, detail: str) -> None:
        super().__init__(detail); self.detail = detail
class NotFound(DomainError): ...
class Conflict(DomainError): ...
class Invalid(DomainError): ...
class Unauthorized(DomainError): ...
class RateLimited(DomainError): ...

_STATUS = {NotFound: 404, Conflict: 409, Invalid: 422, Unauthorized: 401, RateLimited: 429}
def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    def _handle(_: Request, exc: DomainError) -> JSONResponse:
        status = next((s for cls, s in _STATUS.items() if isinstance(exc, cls)), 400)
        return JSONResponse(status, {"code": exc.code, "detail": exc.detail})
```
```python
# identity/domain/errors.py — só subclassa categoria + code estável; nunca um número
class InvalidOtp(Invalid):             code = "invalid_otp"
class OtpExpired(Invalid):             code = "otp_expired"
class OtpThrottled(RateLimited):       code = "otp_throttled"
class IdentityAlreadyLinked(Conflict): code = "identity_already_linked"
```

**Duas nuances que evitam dogmatismo.**
1. **Ausência ≠ exceção.** "Não há sessão válida" (não-autenticado) é estado normal, não erro.
   `ResolveSession` devolve `None`; o inbound converte em 401. Exceção é para _violação de regra numa
   operação que o usuário tinha direito de tentar_.
2. **O inbound PODE falar HTTP — é a costura HTTP.** A regra proíbe HTTP em **domain/application**,
   não no inbound. `get_current_session` levantar `HTTPException(401)` direto continua certo (é
   dependency, é inbound). Só as violações de regra dos use-cases passam por erro-de-domínio + handler.

**O `code` é contrato com o web BFF.** Body `{"code": "otp_expired", "detail": "<pt-BR>"}`. O web
ramifica copy pt-BR no `code` (expirado → "peça outro"; throttled → "espere 1 min"). `code` é o seam
de integração, `detail` é cópia humana — e nunca carrega segredo/interno (higiene + gitleaks).

---

## Q7 — Testes GWT

**Reconciliação.** `python-testing-patterns` ensina **AAA** (Arrange/Act/Assert). **GWT é o mesmo
três-tempos**, renomeado. Adotamos os rótulos **given/when/then** porque leem como _spec de
comportamento_ (casa com o tdd). Zero conflito.

**Como o GWT se materializa.**
- Classe agrupa o subject: `class TestResolveSession:`
- Nome do método = cenário + esperado: `test_expired_session_returns_none`
- Corpo = blocos `# given: / # when: / # then:` (com `:`, **não** em-dash).
- Fixtures = o "given" compartilhado.

```python
# tests/identity/test_resolve_session.py
class TestResolveSession:
    def test_valid_session_records_last_used(self, sessions, clock):
        # given: sessão viva semeada no repo
        session, raw = _seed_live_session(sessions, clock)
        resolve = ResolveSession(sessions, clock, pepper="test-pepper")
        # when:
        result = resolve(raw)
        # then: devolve a sessão E persiste o uso (efeito no Port)
        assert result is session
        assert result.last_used_at == clock.now()
        assert session in sessions.saved
```

**Split por costura — qual double, qual DB, qual marker.**

| costura | double | DB? | marker | afirma |
|---|---|---|---|---|
| `domain/rules.py` + métodos da entidade | **nenhum** | não | default | regra pura |
| `application/use_cases.py` | **fakes dos Ports** | não | default | orquestração + efeito no Port — **o grosso** |
| `adapters/repository.py` | **SQLite in-mem real** | sim | default | query/persistência, tradução `IntegrityError` |
| `adapters/routes.py` | **TestClient** + provider sobrescrito | leve | default | mapeamento HTTP (status, body, bearer) |
| migrations / PG-specific | **Postgres real** | sim | `integration` | upgrade head, drift, constraints PG |

Layout de teste espelha o src:
```
tests/
  conftest.py                 # infra compartilhada (app, engine SQLite)
  identity/
    conftest.py               # fakes + fixtures do contexto
    test_rules.py             # domínio puro
    test_resolve_session.py   # use-case (fakes)
    test_logout.py            # use-case (fakes)
    test_repository.py        # outbound (SQLite real)
    test_routes.py            # inbound (TestClient)
  integration/
    test_migration.py         # Postgres (marker integration)
```

**Três decisões finas.**
1. **`FixedClock` (Port) > freezegun** para use-cases — construímos o seam no Q4, usamos ele.
   freezegun só onde código chama `datetime.now()` direto.
2. **"Then" afirma comportamento observável** (retorno, estado persistido via `repo.saved`, resposta
   HTTP). Asserir que `save` foi chamado é **efeito de Port** — hexagonal+tdd permitem ("assert
   business outcomes AND port interactions"); não é acoplamento a implementação interna.
3. **No refactor da #189 os testes GWT são de caracterização** (travam o comportamento atual antes de
   mover o código). Para a #190+ é red-green de verdade.

---

## Q8 — Acionar as skills? (o medo de lotar contexto)

**O reframe que dissolve o medo.** O usuário fundiu dois atos: _aplicar o padrão_ e _invocar a skill_.
Separados, o bloat some. "Acionar a skill toda vez" **e** "não lotar contexto" são **incompatíveis** —
algo cede. A saída dá a **garantia** (regra sempre vale) sem o **custo** (texto da skill toda vez): a
regra vale toda vez porque mora no **`CLAUDE.md`** (sempre carregado), não porque a skill é lida.
**Não se precisa invocar a skill toda vez; precisa-se das regras no contexto toda vez — e elas estão.**

**Decisão final (mais forte que a recomendação original).** O usuário cravou: **zero acionamento de
skill**, desde que **toda recomendação necessária esteja no `CLAUDE.md`**. Logo a tabela de gatilhos
(que eu havia proposto) **morre**; o `CLAUDE.md` passa a ser **auto-suficiente** para backend. As
skills viram referência humana sob demanda, fora do loop do agente.

> `python-code-style` é ~95% **máquina-aplicado** (ruff + pyright no gate) → praticamente nunca
> precisaria da skill mesmo. Isso _prova_ a tese: o que o gate cobre não vira contexto; só a decisão
> humana (ex.: profundidade de docstring) vira nota.

**A ideia que nasceu aqui: `code-as-me`.** Compilar o conhecimento das quatro skills genéricas no
_dialeto desta casa_ — uma skill de bolso individual, análoga ao `write-as-me` do ethitorial. Fica
para um **grilling futuro**; esta nota é a matéria-prima.

**Sem hook.** Hook que auto-carrega skill é o pior para o bloat; o `CLAUDE.md` já está sempre no
contexto, então o hook seria redundante. Mecanismo = a própria prosa do `CLAUDE.md`.

**Riders de estilo decididos.**
- **Docstrings Google-style em tudo, desde já** (o usuário já segue esse padrão e se ambienta melhor
  assim). Leitura sã de "tudo": função com args/retorno ganha bloco completo (Args/Returns/Raises);
  helper de zero-arg ganha só o summary (caso degenerado, ainda Google-style). O refactor da #189
  **sobe** as docstrings one-liner atuais.
- **`__all__` só no seam do contexto** (`identity/__init__.py` exporta router + use-cases públicos),
  **não** em todo `__init__` de camada interna — curar as internas é a cerimônia que evitamos.

---

## Q9 — Arquitetura de docs + sequência do refactor

**Três artefatos, três funções** (resolve o impasse "ADR é o documento? ou outro?"):

| artefato | função | densidade |
|---|---|---|
| **`CLAUDE.md` §Padrões de backend** | regra que rege o dia-a-dia | enxuto, checklist |
| **ADR-0005** | registro da decisão + consequências, indexado | conciso, com "alternativas" |
| **esta nota** | a discussão inteira (semente do `code-as-me`) | máxima riqueza |

Por que ADR **e** nota: o ADR tem que ficar escaneável (referência indexada); a riqueza máxima
estoura um ADR. O ADR aponta para a nota. Hierarquia: `CLAUDE.md` → ADR-0005 → esta nota (a mesma
3-camadas do Q8, com _nosso raciocínio_ na camada-fundo no lugar da skill — que era o ponto).

**Sequência do refactor da #189 (decidida, execução em outra sessão).**
1. **PR isolado** `refactor(identity): adota arquitetura hexagonal pragmática` — **não** dobra na
   #190; a #190 nasce limpa no molde.
2. **Caracterização primeiro** (GWT): trava o comportamento atual de `resolve/create/revoke`,
   `/auth/me`, `/auth/logout` antes de mover código.
3. **Move por costura** conforme a decomposição do Q3; racha `sessions.py`; sobe docstrings para
   Google-style.
4. **Cuidado de fiação:** `Base` migra para `shared/`, modelos para `identity/domain/models.py` →
   `alembic/env.py` muda o import e **precisa importar os modelos de identity** para registrarem em
   `Base.metadata` (senão `target_metadata` esvazia e o autogenerate quer dropar tudo). A migration
   `0002` em si não muda (usa `sa.` cru).
5. **Gate verde** local + CI, **sem mudança de comportamento** → PR → checks → merge → parar e
   reportar.

---

## Apêndice — princípios que sobrevivem ao tamanho (semente do `code-as-me`)

- **Pragmática sobre pureza, mas com costura testável.** O critério não é "quão hexagonal", é "onde
  há I/O ou regra que vale inverter". ORM-como-entidade é aceitável; Port sem teste de fake não é.
- **Profundidade de pasta paga-se por significado, não por simetria.** `domain/application/adapters`
  sustentam carga; `outbound/sqlalchemy/` segurando um arquivo é ruído. Promover lazy.
- **O Port se escreve para o contrato, não para o adapter de hoje.** Daí `save()` explícito mesmo
  quando o SQLAlchemy o tornaria redundante.
- **HTTP é da borda.** Domínio fala categorias semânticas; o número vive uma vez, no handler.
- **Teste afirma comportamento observável** — retorno, efeito no Port, resposta HTTP — nunca o
  passo-a-passo interno. GWT é AAA lido como spec.
- **O padrão rege por estar sempre no contexto (CLAUDE.md), não por a skill ser invocada.** Destilar
  > engatilhar.
