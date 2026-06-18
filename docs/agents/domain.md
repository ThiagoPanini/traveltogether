# Domain Docs

Como os skills de engenharia devem consumir a documentação de domínio deste repo ao explorar o código.

## Antes de explorar, leia

- **`docs/CONTEXT.md`** — glossário canônico de domínio + invariantes. (Atenção: fica em `docs/`, não na raiz.)
- **`docs/adr/`** — leia as ADRs que tocam a área onde vai trabalhar. As mais carregadas de contexto: 0003 (acesso), 0004/0018 (itinerário/rotas), 0006 (autonomia de ops).

Se algum desses arquivos não existir, **siga em silêncio**. Não sinalize a ausência nem sugira criá-los de antemão. O skill `/domain-modeling` (alcançado via `/grill-with-docs` e `/improve-codebase-architecture`) os cria sob demanda quando termos ou decisões de fato se resolvem.

## Estrutura de arquivos

Repo **single-context**:

```
/
├── docs/
│   ├── CONTEXT.md        ← glossário + invariantes
│   └── adr/
│       ├── 0001-stack-e-arquitetura-espelha-epistemix.md
│       └── ... (0002–0019)
└── apps/ (api, web), packages/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (título de issue, proposta de refatoração, hipótese, nome de teste), use o termo como definido em `docs/CONTEXT.md`. Não derive para sinônimos que o glossário evita — a seção "Termos ambíguos a evitar" lista palavras proibidas (ex.: nunca "voo", "proposta", "etapa", "like"). Identificadores de código são em inglês (mapa pt-BR→inglês no glossário).

Se o conceito que você precisa ainda não está no glossário, é um sinal — ou você está inventando linguagem que o projeto não usa (reconsidere) ou há uma lacuna real (anote para `/domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradiz uma ADR existente, explicite em vez de sobrescrever em silêncio:

> _Contradiz a ADR-0018 (rotas multi-trecho e decisão por-pessoa) — mas vale reabrir porque…_
