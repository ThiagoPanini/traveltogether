# OTP input

## Estrato

**⏳ Projetado, não construído.**

## Propósito

Coletar código de embarque de 6 dígitos no login.

## Fronteira de código

Nenhuma implementação viva. Spec extraída do bundle.

## Estrutura / DOM

Grupo de seis células de input, cada uma com `maxlength=1` e aspect-ratio perto
de `0.9`. Deve existir label do grupo, por exemplo `Código de embarque`.

## Tokens usados

`--fill-subtle`, `--line-dashed`, `--radius-btn`, `--font-display`,
`--accent`, `--text-faint`, `--accent-alert`.

## Estados / interação

- Foco por célula, avanço ao digitar e retorno ao apagar.
- Estado de expiração normal e alerta quando `ttl < 60s`.
- Reenvio desabilitado até o contador zerar.

## Movimento

Nenhum obrigatório. Se houver transição de alerta, reduza em
`prefers-reduced-motion`.

## A11y

Use `inputmode="numeric"`, `autocomplete="one-time-code"` e label acessível.
Não comunique expiração apenas por cor; inclua texto do tempo.

## Invariantes

- O login é Fase 2, ainda não existe.
- `span onClick` do bundle vira `button`.

## Como editar

Ao implementar, crie teste de teclado básico e atualize este arquivo para
`Implementado (as-built)`.
