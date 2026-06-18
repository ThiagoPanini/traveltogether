# Issue tracker: GitHub

Issues e PRDs deste repo vivem como **GitHub Issues**. Use a CLI `gh` para tudo. O repo é inferido de `git remote -v` (`gh` faz isso automaticamente dentro de um clone): `ThiagoPanini/traveltogether`.

## Convenções

- **Criar issue**: `gh issue create --title "..." --body "..."`. Use heredoc para corpos multi-linha.
- **Ler issue**: `gh issue view <number> --comments`, filtrando comentários com `jq` e buscando também as labels.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` com os filtros `--label`/`--state` adequados.
- **Comentar**: `gh issue comment <number> --body "..."`
- **Aplicar / remover labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Fechar**: `gh issue close <number> --comment "..."`

## Pull requests como superfície de triagem

**PRs como superfície de pedido: não.** Beta fechado — o merge é sempre humano e não há PRs de colaboradores externos para triar. _(Mude para `sim` se o repo passar a tratar PRs externos como pedidos; `/triage` lê esse flag.)_

Quando `sim`, PRs passam pelas mesmas labels e estados das issues, via equivalentes `gh pr` (`view`/`diff`/`list`/`comment`/`edit`/`close`). O GitHub usa um único espaço de números para issues e PRs, então um `#42` solto pode ser qualquer um — resolva com `gh pr view 42` e caia para `gh issue view 42`.

## Quando um skill diz "publish to the issue tracker"

Crie uma GitHub issue.

## Quando um skill diz "fetch the relevant ticket"

Rode `gh issue view <number> --comments`.
