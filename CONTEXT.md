# Contexto de Domínio — travelmanager

Glossário e invariantes que definem a **linguagem comum** do projeto — lido por humanos e agentes antes de qualquer trabalho substantivo. Mudar algo aqui é mudar o jeito de pensar o produto. Decisões e porquês em [docs/adr/](docs/adr/README.md).

## Convenção de nomes

O termo canônico é em **pt-BR** (o domínio é pensado em pt-BR; a copy de UI é pt-BR). Identificadores de código em inglês (sugestão entre parênteses).

## Linguagem

### Conta e identidade

**Usuário** (`User`):
Pessoa com conta própria (e-mail com código ou Google) e um Perfil. Participa de várias Viagens, com papéis distintos em cada.

**Perfil** (`Profile`):
Dados do Usuário: nome de exibição, país e **cidade de origem**. A cidade de origem é o ponto de partida *default* (editável) das Rotas que ele cria.
_Evite_: "origem da viagem" — a origem é do Usuário, não da Viagem.

### A viagem e seu esqueleto

**Viagem** (`Trip`):
Jornada de um grupo: um **destino**, uma sequência ordenada de **Paradas**, **membros** e um período aproximado. É a unidade de topo de organização **e** de permissão (papéis são por-Viagem). Não tem origem própria.

**Parada** (`Stop`):
Cidade onde o grupo permanece (a estadia), em nível de **cidade** (sem aeroporto). Nó ordenado do itinerário. A **última Parada é o destino**.
_Evite_: destino (como entidade separada), escala, conexão.

**Destino**:
A última Parada da sequência. É **derivado**, não um campo à parte.

**Trajeto** (`Leg`):
O salto a vencer entre dois lugares consecutivos (casa→1ª parada, parada→parada, última parada→casa). **Derivado** da ordem das Paradas e da origem (do Perfil). Agrupa Rotas alternativas; não hospeda preço.
_Evite_: rota — o Trajeto é o *objetivo* ("chegar em NY"); a Rota é o *caminho*.

**Rota** (`Route`):
Um caminho candidato que realiza um Trajeto: sequência **ordenada** de Trechos. Duas Rotas com as **mesmas pontas** são alternativas a comparar (ex.: "direto" `SP→NY` vs "via Miami" `SP→MIA→NY`).
_Evite_: trajeto, conexão, "itinerário de voo".
> **Âncora:** `SP→NY` tem duas **Rotas** do mesmo **Trajeto** — direto vs via-Miami; a via-Miami tem dois **Trechos** (`SP→MIA` e `MIA→NY`). Uma ida-e-volta é **uma** **Pesquisa** cobrindo dois Trechos; marcar **Preferida** nela resolve os dois.

**Trecho** (`Segment`):
Cada **pulo** de uma Rota, entre dois pontos, com um **Modo**. É uma **compra à parte**. Hoje, só o Trecho aéreo hospeda Pesquisas.
_Evite_: voo, perna, escala, conexão, segmento.

**Modo** (`mode`):
Atributo do Trecho: **aéreo** ou **terrestre**. Aéreo hospeda Pesquisa; terrestre (carro/ônibus) é conector estrutural (cotação + rateio = em breve).

### A pesquisa e a decisão

**Pesquisa** (`FareQuote`) — também "pesquisa de translado" / "pesquisa de passagem":
Cotação que um Membro encontrou e cadastrou, cobrindo **um ou mais Trechos aéreos** (vários quando é um bilhete único de ida-e-volta). Carrega o **preço do bilhete inteiro**, em dinheiro e/ou pontos. É o artefato que se "compartilha".
_Evite_: proposta, opção, cotação (solta), voo (como entidade).

**Escala** (`stops`):
Parada técnica **dentro de um único bilhete** (campo da Pesquisa: direto / nº). **Não** é um Trecho.
_Evite_: conexão, trecho, baldeação.

**Preferida** (`Preference`):
Marcação **pessoal**: a Pesquisa que *eu* pretendo usar (no máximo uma por Trecho aéreo). Marcar uma Pesquisa ida-e-volta resolve a Preferida de todos os Trechos que ela cobre.
_Evite_: escolhida, eleição, decisão de grupo.

**Comprada** (`purchased`):
Status **pessoal** sobre uma Preferida: *eu* adquiri. Fluxo `preferida → comprada`.
_Evite_: reserva, booking.

**Rota adotada**:
A Rota que uma pessoa segue, **derivada** das suas Preferidas — não uma entidade persistida. É por-pessoa.

**Pontos** / **Programa de fidelidade** (`points` / `LoyaltyProgram`):
Unidade de preço alternativa ao dinheiro (ex.: `135.000 milhas LATAM`). Pontos de programas distintos não se comparam, não se somam e não se convertem em dinheiro.
_Evite_: milhas como moeda, "valor da milha".

### Pessoas na viagem

**Organizador** (`Organizer`):
Papel com poder sobre o **backbone** (paradas, datas, destino, membros) e **moderação** (apagar qualquer Rota/Trecho/Pesquisa). O criador da Viagem é o primeiro Organizador.
_Evite_: admin.

**Membro** (`Member`):
Papel com a camada de **exploração** (criar Rota, Trecho, Pesquisa) e o **plano pessoal** (Preferida/Comprada). Não mexe no backbone.

**Convite** (`Invitation`):
Intenção, criada por um Organizador, de incluir um e-mail. Vira Membership **só com aceite** in-app. Se o convidado não tem conta, o Convite espera o cadastro.
_Evite_: adição instantânea.

### Em breve (nomeados, ainda não construídos)

Termos reservados só para a linguagem ficar estável — **não existem na v1**: **Roteiro** / **Item de Roteiro**, **Orçamento**, **cotação de carro**, **atração/ingresso**, **comentário**.

## Invariantes

1. Uma **Rota** é uma sequência ordenada de **Trechos** entre as duas pontas de um **Trajeto**; Trechos não se compartilham entre Rotas. Duas Rotas com as mesmas pontas são alternativas. **Multi-pulo vale na v1.**
2. Uma **Pesquisa** cobre **um ou mais** Trechos **aéreos**; ida-e-volta cobre dois (possivelmente em Trajetos distintos). O preço é o do bilhete inteiro e entra **uma vez** em qualquer soma — não se divide preço por Trecho.
3. **Escala** é campo da Pesquisa, nunca um Trecho. "Dois Trechos" vs "um Trecho com escala" = **duas compras vs uma compra**.
4. A decisão é **por-pessoa**: cada Usuário tem no máximo uma **Preferida** por Trecho aéreo; marcar uma Pesquisa multi resolve todos os Trechos cobertos. **Não há eleição de grupo.**
5. **Não há conversão** entre unidades (moeda↔moeda, pontos↔dinheiro). A comparação é **visual**, dentro da mesma unidade. O app não computa "a mais barata" cruzando unidades.
6. **Origem é do Perfil**, não da Viagem. Trajetos de ponta (casa↔parada) agrupam por origem; Trajetos do meio (parada↔parada) são compartilhados por todos.
7. **Aeroportos** vivem no Trecho/Pesquisa (GRU, MIA…), **nunca** na Parada (que é cidade). O esqueleto é em nível de cidade; sigla só aparece quando há Trecho/Pesquisa.
8. Hoje só **Trecho aéreo** hospeda Pesquisa/Preferida. **Terrestre** é conector estrutural sem cotação registrável (o custo do carro entra no Orçamento — em breve).
9. **Camadas de escrita:** backbone (paradas/datas/destino/membros) = só Organizador; exploração (Rota/Trecho/Pesquisa) = qualquer Membro; plano pessoal (Preferida/Comprada) = só o dono. O autor edita/apaga o que é seu; o Organizador modera.
10. Ninguém entra numa Viagem sem **aceitar** um Convite.
