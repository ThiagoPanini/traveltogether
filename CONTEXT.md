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
Cada **pulo** de uma Rota, entre dois pontos, com um **tipo de translado** (e o **Modo** derivado dele). É uma **compra à parte**. **Qualquer tipo** hospeda Pesquisas (os que têm o que cotar — ver inv. 8).
_Evite_: voo, perna, escala, conexão, segmento.

**Modo** (`mode`):
Atributo **derivado** do **tipo de translado** do Trecho: **aéreo** (tipo = avião) ou **terrestre** (os demais tipos). Já **não** decide quem hospeda Pesquisa — qualquer tipo hospeda (inv. 8); marca só o que é **específico de aéreo**: IATA, milhas, escala (inv. 3 e 7).
_Evite_: usar Modo como "o meio de transporte" — esse papel é do **tipo de translado**.

**Tipo de translado** (`transfer_kind`):
O **meio** concreto de vencer um salto — atributo de **primeira classe**: avião · carro alugado · carro próprio · ônibus · trem · van/transfer · a pé · **outro** (texto livre) · **em discussão** (indefinido). Refina o Modo (avião→aéreo; o resto→terrestre) e é o **eixo da comparação multi-modal** (avião vs. carro vs. trem) na Pesquisa. Tipos sem o que cotar (a pé, carro próprio) não hospedam Pesquisa de preço.
_Evite_: "modo" como sinônimo (Modo é o rótulo grosso derivado); inventar tipo fora da lista — use **outro**.

**Translado desejado** (`desired_transfer`):
Na **criação** da Viagem, o tipo de translado **proposto** para um salto — só **proposta**, não compromisso. Nos saltos **compartilhados** (parada→parada) é a proposta do Organizador pro grupo; nas **pontas** (casa↔parada, por-pessoa — inv. 6) é proposta **pessoal**: o **criador propõe a própria ponta já na criação**, os demais ao entrar. **Hint** que **semeia** a exploração (não um Trecho); nasce **em discussão**, e a consolidação real é **por-pessoa**, via Pesquisa.
_Evite_: confundir com **Modo** (realizado, no Trecho) ou com **Pesquisa** (cotação).

### A pesquisa e a decisão

**Pesquisa** (`FareQuote`) — também "pesquisa de translado" / "pesquisa de passagem":
Cotação que um Membro encontrou e cadastrou, cobrindo **um ou mais Trechos** de **qualquer tipo de translado** (vários quando é um bilhete único de ida-e-volta). Carrega o **preço do item inteiro** (bilhete, diária, serviço), em dinheiro e/ou pontos. É o artefato que se "compartilha".
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

**Participação** (`Membership`):
O **elo** entre um Usuário e uma Viagem, carregando o **papel** dele ali (Organizador ou Membro). Nasce **na criação** (o criador, como Organizador) ou **no aceite** de um Convite. É por ela que a Viagem aparece pra pessoa e que o papel libera as camadas de escrita (inv. 9).
_Evite_: confundir com **Membro** (o papel) ou com **Convite** (intenção ainda não aceita).

**Convite** (`Invitation`):
Intenção, criada por um Organizador, de incluir um e-mail **com um papel** (Membro por default; pode ser Organizador). Vira Participação **só com aceite** in-app. Se o convidado não tem conta, o Convite espera o cadastro.
_Evite_: adição instantânea.

### Em breve (nomeados, ainda não construídos)

Termos reservados só para a linguagem ficar estável — **não existem na v1**: **Roteiro** / **Item de Roteiro**, **Orçamento**, **atração/ingresso**, **comentário**.

## Invariantes

1. Uma **Rota** é uma sequência ordenada de **Trechos** entre as duas pontas de um **Trajeto**; Trechos não se compartilham entre Rotas. Duas Rotas com as mesmas pontas são alternativas. **Multi-pulo vale na v1.**
2. Uma **Pesquisa** cobre **um ou mais** Trechos de **qualquer tipo**; ida-e-volta cobre dois (possivelmente em Trajetos distintos). O preço é o do **item inteiro** e entra **uma vez** em qualquer soma — não se divide preço por Trecho. Per-pessoa vs. por-veículo é dimensão da Pesquisa, comparada **visualmente** (inv. 5); rateio automático é do Orçamento (em breve).
3. **Escala** é campo da Pesquisa (específica do tipo **avião**), nunca um Trecho. "Dois Trechos" vs "um Trecho com escala" = **duas compras vs uma compra**.
4. A decisão é **por-pessoa**: cada Usuário tem no máximo uma **Preferida** por Trecho aéreo; marcar uma Pesquisa multi resolve todos os Trechos cobertos. **Não há eleição de grupo.**
5. **Não há conversão** entre unidades (moeda↔moeda, pontos↔dinheiro). A comparação é **visual**, dentro da mesma unidade. O app não computa "a mais barata" cruzando unidades.
6. **Origem é do Perfil**, não da Viagem. Trajetos de ponta (casa↔parada) agrupam por origem; Trajetos do meio (parada↔parada) são compartilhados por todos.
7. **Aeroportos** vivem no Trecho/Pesquisa (GRU, MIA…), **nunca** na Parada (que é cidade). O esqueleto é em nível de cidade; sigla só aparece quando há Trecho/Pesquisa.
8. **Qualquer tipo de translado** hospeda Pesquisa/Preferida — a comparação é **multi-modal** (avião vs. carro vs. trem…), sempre **visual** e na mesma unidade (inv. 5); o app não elege vencedor. O **Modo** (derivado: aéreo/terrestre) marca só o **específico de aéreo** (IATA, milhas, escala). Tipos sem o que cotar (a pé, carro próprio) não hospedam Pesquisa; o **rateio automático** de custo por-veículo é do Orçamento (em breve).
9. **Camadas de escrita:** backbone (paradas/datas/destino/membros) = só Organizador; exploração (Rota/Trecho/Pesquisa) = qualquer Membro; plano pessoal (Preferida/Comprada) = só o dono. O autor edita/apaga o que é seu; o Organizador modera.
10. Ninguém entra numa Viagem sem **aceitar** um Convite.
