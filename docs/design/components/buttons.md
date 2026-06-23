# Buttons

## Estrato

**Implementado localmente + ⏳ projetado para componente compartilhado.**

## Propósito

Dar comandos claros no estilo Tema B: primário terracota, fantasma contornado e
texto/acento para ações leves.

## Fronteira de código

- Implementado localmente em `apps/web/app/page.tsx`: `primaryCta` e `ghostCta`.
- Ainda não há componente `Button` compartilhado.

## Estrutura / DOM

As CTAs da home são `a` porque navegam para âncoras. Comandos futuros devem ser
`button`.

Variantes:

- Primário: fundo `accent`, texto `on-accent`, display uppercase.
- Fantasma: borda `line-strong`, texto `text-body`.
- Texto: sem caixa, acento e seta visual quando a ação for secundária.

## Tokens usados

`--accent`, `--on-accent`, `--line-strong`, `--text-body`, `--font-display`,
`--border-outline`, `--radius-btn`.

## Estados / interação

As-built: sem hover/focus customizado; mantém foco do navegador. Futuro
componente compartilhado deve documentar hover, active, disabled e loading.

## Movimento

Nenhum. Se hover animar cor/borda, inclua reduced-motion local.

## A11y

Use `a` para navegação e `button` para comando. Não implemente comandos como
`span onClick`, mesmo que o bundle use isso no protótipo.

## Invariantes

- Botão primário sempre usa `accent/on-accent`.
- Não criar nova cor de CTA.
- Texto de botão usa Saira Condensed uppercase.

## Como editar

Enquanto só a home usa, manter estilos locais é aceitável. Extraia componente
quando houver uma segunda fronteira real usando as mesmas variantes.
