# Triage Labels

Os skills falam em cinco papéis canônicos de triagem. Este arquivo mapeia esses papéis para as strings de label de fato usadas no tracker deste repo, que segue a convenção de eixo prefixado `status:` (ver `CLAUDE.md` › Fluxo de trabalho).

| Papel (mattpocock/skills) | Label no nosso tracker   | Significado                                   | Existe? |
| ------------------------- | ------------------------ | --------------------------------------------- | ------- |
| `needs-triage`            | `status:needs-triage`    | Mantenedor precisa avaliar a issue            | criar   |
| `needs-info`              | `status:needs-info`      | Aguardando mais informação do autor           | criar   |
| `ready-for-agent`         | `status:ready-for-agent` | Totalmente especificada, pronta p/ agente AFK | sim     |
| `ready-for-human`         | `status:hitl`            | Precisa de humano (nas bordas/implementação)  | sim     |
| `wontfix`                 | `status:wontfix`         | Não será tratada                              | criar   |

As labels marcadas "criar" ainda não existem; crie-as quando a triagem precisar pela primeira vez, mantendo o eixo `status:`:

```bash
gh label create "status:needs-triage" --color fbca04 --description "Mantenedor precisa avaliar"
gh label create "status:needs-info"   --color fef2c0 --description "Aguardando info do autor"
gh label create "status:wontfix"      --color e6e6e6 --description "Não será tratada"
```

Quando um skill mencionar um papel (ex.: "aplique a label de AFK-ready"), use a string da coluna do meio. Edite essa coluna para refletir o vocabulário que você de fato usa.
