"""Dataset de referência de lugares/POIs + busca (boundary shared).

Lubrifica o cadastro de Item de Roteiro: digitar uma atividade/lugar sugere o
nome e pré-preenche endereço (vai para `notes`) e link (issue #61). Lista curada
dos pontos mais prováveis dos destinos do grupo — sem dependência externa, para
manter os testes herméticos. Digitação manual continua possível para o resto.

O link aponta para a busca no Google Maps do próprio lugar (sem chave de API).
"""

from urllib.parse import quote_plus

from sqlmodel import SQLModel


class PlacePublic(SQLModel):
    name: str
    city: str
    country: str
    address: str
    link: str


def _maps(name: str, city: str) -> str:
    return f"https://www.google.com/maps/search/?api=1&query={quote_plus(f'{name}, {city}')}"


# (nome, cidade, país, endereço)
_RAW: list[tuple[str, str, str, str]] = [
    # Lisboa
    ("Torre de Belém", "Lisboa", "Portugal", "Av. Brasília, Belém"),
    ("Mosteiro dos Jerónimos", "Lisboa", "Portugal", "Praça do Império, Belém"),
    ("Castelo de São Jorge", "Lisboa", "Portugal", "R. de Santa Cruz do Castelo"),
    ("Time Out Market", "Lisboa", "Portugal", "Av. 24 de Julho, 49"),
    ("Oceanário de Lisboa", "Lisboa", "Portugal", "Esplanada Dom Carlos I"),
    ("Palácio da Pena", "Sintra", "Portugal", "Estrada da Pena, Sintra"),
    # Porto
    ("Livraria Lello", "Porto", "Portugal", "R. das Carmelitas, 144"),
    ("Ponte Dom Luís I", "Porto", "Portugal", "Ponte Luiz I"),
    ("Cais da Ribeira", "Porto", "Portugal", "Ribeira"),
    # Paris
    ("Torre Eiffel", "Paris", "França", "Champ de Mars, 5 Av. Anatole France"),
    ("Museu do Louvre", "Paris", "França", "Rue de Rivoli"),
    ("Catedral de Notre-Dame", "Paris", "França", "6 Parvis Notre-Dame"),
    ("Museu d'Orsay", "Paris", "França", "Esplanade Valéry Giscard d'Estaing"),
    ("Basílica de Sacré-Cœur", "Paris", "França", "35 R. du Chevalier de la Barre"),
    # Roma
    ("Coliseu", "Roma", "Itália", "Piazza del Colosseo, 1"),
    ("Fontana di Trevi", "Roma", "Itália", "Piazza di Trevi"),
    ("Vaticano — Basílica de São Pedro", "Roma", "Itália", "Piazza San Pietro"),
    ("Panteão", "Roma", "Itália", "Piazza della Rotonda"),
    # Madri / Barcelona
    ("Museu do Prado", "Madri", "Espanha", "C. de Ruiz de Alarcón, 23"),
    ("Parque do Retiro", "Madri", "Espanha", "Plaza de la Independencia, 7"),
    ("Sagrada Família", "Barcelona", "Espanha", "C/ de Mallorca, 401"),
    ("Park Güell", "Barcelona", "Espanha", "Carrer d'Olot"),
    ("La Rambla", "Barcelona", "Espanha", "La Rambla"),
    # Londres
    ("London Eye", "Londres", "Reino Unido", "Riverside Building, County Hall"),
    ("British Museum", "Londres", "Reino Unido", "Great Russell St"),
    ("Tower Bridge", "Londres", "Reino Unido", "Tower Bridge Rd"),
    # Nova York
    ("Central Park", "Nova York", "Estados Unidos", "Central Park"),
    ("Estátua da Liberdade", "Nova York", "Estados Unidos", "Liberty Island"),
    ("Times Square", "Nova York", "Estados Unidos", "Manhattan, NY 10036"),
    ("Empire State Building", "Nova York", "Estados Unidos", "20 W 34th St"),
    # Buenos Aires
    ("Caminito", "Buenos Aires", "Argentina", "Dr. del Valle Iberlucea, La Boca"),
    ("Cemitério da Recoleta", "Buenos Aires", "Argentina", "Junín 1760"),
    ("Teatro Colón", "Buenos Aires", "Argentina", "Cerrito 628"),
    # Rio de Janeiro
    ("Cristo Redentor", "Rio de Janeiro", "Brasil", "Parque Nacional da Tijuca"),
    ("Pão de Açúcar", "Rio de Janeiro", "Brasil", "Av. Pasteur, 520, Urca"),
    ("Praia de Copacabana", "Rio de Janeiro", "Brasil", "Av. Atlântica"),
]

PLACES: list[PlacePublic] = [
    PlacePublic(name=n, city=c, country=co, address=a, link=_maps(n, c)) for n, c, co, a in _RAW
]


def _score(place: PlacePublic, q: str) -> int | None:
    """Menor é melhor; None = não casa."""
    name = place.name.lower()
    city = place.city.lower()
    if name == q:
        return 0
    if name.startswith(q):
        return 1
    if name.find(q) != -1:
        return 2
    if city.startswith(q):
        return 3
    if city.find(q) != -1:
        return 4
    return None


def search_places(
    query: str, *, limit: int = 8, places: list[PlacePublic] | None = None
) -> list[PlacePublic]:
    """Busca lugares por nome ou cidade. Ranqueada e limitada."""
    q = query.strip().lower()
    if not q:
        return []
    pool = PLACES if places is None else places
    scored = [(score, p) for p in pool if (score := _score(p, q)) is not None]
    scored.sort(key=lambda item: (item[0], item[1].name))
    return [p for _, p in scored[:limit]]
