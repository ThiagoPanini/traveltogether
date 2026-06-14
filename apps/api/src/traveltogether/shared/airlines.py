"""Dataset de referência de companhias aéreas + busca (boundary shared).

Lubrifica o cadastro de Pesquisa de Passagem: nome/código → companhia com logo.
Lista curada das companhias mais prováveis do grupo (sem dependência externa);
digitação manual continua possível para o que não casar (issue #60). A tarifa
segue cadastrada manualmente — isto só preenche melhor o formulário.

O logo vem do CDN público da Kiwi.com (`images.kiwi.com/airlines`), indexado
pelo código IATA de 2 letras da companhia.
"""

from sqlmodel import SQLModel


class AirlinePublic(SQLModel):
    iata: str
    name: str
    country: str
    logo_url: str


def _logo(iata: str) -> str:
    return f"https://images.kiwi.com/airlines/64/{iata}.png"


# (iata, nome, país)
_RAW: list[tuple[str, str, str]] = [
    # Brasil
    ("LA", "LATAM", "Brasil"),
    ("G3", "GOL", "Brasil"),
    ("AD", "Azul", "Brasil"),
    # América do Sul
    ("AR", "Aerolíneas Argentinas", "Argentina"),
    ("H2", "SKY Airline", "Chile"),
    ("AV", "Avianca", "Colômbia"),
    ("P5", "Wingo", "Colômbia"),
    ("4M", "LATAM Argentina", "Argentina"),
    # América do Norte
    ("AA", "American Airlines", "Estados Unidos"),
    ("UA", "United Airlines", "Estados Unidos"),
    ("DL", "Delta Air Lines", "Estados Unidos"),
    ("B6", "JetBlue", "Estados Unidos"),
    ("AC", "Air Canada", "Canadá"),
    ("AM", "Aeroméxico", "México"),
    ("Y4", "Volaris", "México"),
    # Europa
    ("TP", "TAP Air Portugal", "Portugal"),
    ("IB", "Iberia", "Espanha"),
    ("VY", "Vueling", "Espanha"),
    ("UX", "Air Europa", "Espanha"),
    ("AF", "Air France", "França"),
    ("KL", "KLM", "Países Baixos"),
    ("LH", "Lufthansa", "Alemanha"),
    ("BA", "British Airways", "Reino Unido"),
    ("U2", "easyJet", "Reino Unido"),
    ("FR", "Ryanair", "Irlanda"),
    ("AZ", "ITA Airways", "Itália"),
    ("LX", "Swiss", "Suíça"),
    ("OS", "Austrian Airlines", "Áustria"),
    ("SN", "Brussels Airlines", "Bélgica"),
    ("TK", "Turkish Airlines", "Turquia"),
    ("SK", "SAS", "Suécia"),
    # África / Oriente Médio
    ("EK", "Emirates", "Emirados Árabes Unidos"),
    ("QR", "Qatar Airways", "Catar"),
    ("EY", "Etihad Airways", "Emirados Árabes Unidos"),
    ("ET", "Ethiopian Airlines", "Etiópia"),
    ("SA", "South African Airways", "África do Sul"),
    ("MS", "EgyptAir", "Egito"),
    ("RAM", "Royal Air Maroc", "Marrocos"),
    # Ásia / Oceania
    ("JL", "Japan Airlines", "Japão"),
    ("NH", "ANA", "Japão"),
    ("CX", "Cathay Pacific", "Hong Kong"),
    ("SQ", "Singapore Airlines", "Singapura"),
    ("TG", "Thai Airways", "Tailândia"),
    ("QF", "Qantas", "Austrália"),
    ("NZ", "Air New Zealand", "Nova Zelândia"),
]

AIRLINES: list[AirlinePublic] = [
    AirlinePublic(iata=i, name=n, country=co, logo_url=_logo(i)) for i, n, co in _RAW
]


def _score(airline: AirlinePublic, q: str) -> int | None:
    """Menor é melhor; None = não casa."""
    iata = airline.iata.lower()
    name = airline.name.lower()
    if iata == q:
        return 0
    if name.startswith(q):
        return 1
    if iata.startswith(q):
        return 2
    if name.find(q) != -1:
        return 3
    return None


def search_airlines(
    query: str, *, limit: int = 8, airlines: list[AirlinePublic] | None = None
) -> list[AirlinePublic]:
    """Busca companhias por nome ou código IATA. Ranqueada e limitada."""
    q = query.strip().lower()
    if not q:
        return []
    pool = AIRLINES if airlines is None else airlines
    scored = [(score, a) for a in pool if (score := _score(a, q)) is not None]
    scored.sort(key=lambda item: (item[0], item[1].name))
    return [a for _, a in scored[:limit]]
