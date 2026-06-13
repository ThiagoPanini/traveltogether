"""Dataset de referência de aeroportos + busca (boundary shared).

Lubrifica o cadastro de Origem/Parada: cidade → código IATA + coordenadas.
Lista curada dos aeroportos mais prováveis do grupo (sem dependência externa);
digitação manual continua possível para o que não casar (issue #59).
"""

from sqlmodel import SQLModel


class AirportPublic(SQLModel):
    iata: str
    city: str
    country: str
    name: str
    latitude: float
    longitude: float


# (iata, cidade, país, nome, lat, lon)
_RAW: list[tuple[str, str, str, str, float, float]] = [
    # Brasil
    ("GRU", "São Paulo", "Brasil", "Guarulhos", -23.4356, -46.4731),
    ("CGH", "São Paulo", "Brasil", "Congonhas", -23.6266, -46.6556),
    ("GIG", "Rio de Janeiro", "Brasil", "Galeão", -22.8100, -43.2506),
    ("SDU", "Rio de Janeiro", "Brasil", "Santos Dumont", -22.9105, -43.1631),
    ("BSB", "Brasília", "Brasil", "Presidente Juscelino Kubitschek", -15.8711, -47.9186),
    ("CNF", "Belo Horizonte", "Brasil", "Confins", -19.6336, -43.9686),
    ("POA", "Porto Alegre", "Brasil", "Salgado Filho", -29.9939, -51.1714),
    ("CWB", "Curitiba", "Brasil", "Afonso Pena", -25.5285, -49.1758),
    ("REC", "Recife", "Brasil", "Guararapes", -8.1264, -34.9236),
    ("SSA", "Salvador", "Brasil", "Deputado Luís Eduardo Magalhães", -12.9086, -38.3225),
    ("FOR", "Fortaleza", "Brasil", "Pinto Martins", -3.7763, -38.5326),
    ("FLN", "Florianópolis", "Brasil", "Hercílio Luz", -27.6705, -48.5525),
    ("MAO", "Manaus", "Brasil", "Eduardo Gomes", -3.0386, -60.0497),
    ("NAT", "Natal", "Brasil", "Governador Aluízio Alves", -5.7681, -35.3764),
    ("MCZ", "Maceió", "Brasil", "Zumbi dos Palmares", -9.5108, -35.7917),
    ("IGU", "Foz do Iguaçu", "Brasil", "Cataratas", -25.5963, -54.4872),
    # América do Sul
    ("EZE", "Buenos Aires", "Argentina", "Ezeiza", -34.8222, -58.5358),
    ("AEP", "Buenos Aires", "Argentina", "Aeroparque Jorge Newbery", -34.5592, -58.4156),
    ("SCL", "Santiago", "Chile", "Arturo Merino Benítez", -33.3930, -70.7858),
    ("LIM", "Lima", "Peru", "Jorge Chávez", -12.0219, -77.1143),
    ("BOG", "Bogotá", "Colômbia", "El Dorado", 4.7016, -74.1469),
    ("MVD", "Montevidéu", "Uruguai", "Carrasco", -34.8384, -56.0308),
    ("CUZ", "Cusco", "Peru", "Alejandro Velasco Astete", -13.5358, -71.9389),
    # América do Norte
    ("JFK", "Nova York", "Estados Unidos", "John F. Kennedy", 40.6413, -73.7781),
    ("EWR", "Nova York", "Estados Unidos", "Newark Liberty", 40.6895, -74.1745),
    ("MIA", "Miami", "Estados Unidos", "Miami International", 25.7959, -80.2870),
    ("MCO", "Orlando", "Estados Unidos", "Orlando International", 28.4312, -81.3081),
    ("LAX", "Los Angeles", "Estados Unidos", "Los Angeles International", 33.9416, -118.4085),
    ("SFO", "São Francisco", "Estados Unidos", "San Francisco International", 37.6213, -122.3790),
    ("ORD", "Chicago", "Estados Unidos", "O'Hare", 41.9742, -87.9073),
    ("YYZ", "Toronto", "Canadá", "Pearson", 43.6777, -79.6248),
    ("CUN", "Cancún", "México", "Cancún International", 21.0365, -86.8771),
    ("MEX", "Cidade do México", "México", "Benito Juárez", 19.4361, -99.0719),
    # Europa
    ("LIS", "Lisboa", "Portugal", "Humberto Delgado", 38.7742, -9.1342),
    ("OPO", "Porto", "Portugal", "Francisco Sá Carneiro", 41.2481, -8.6814),
    ("MAD", "Madri", "Espanha", "Adolfo Suárez Barajas", 40.4983, -3.5676),
    ("BCN", "Barcelona", "Espanha", "El Prat", 41.2974, 2.0833),
    ("CDG", "Paris", "França", "Charles de Gaulle", 49.0097, 2.5479),
    ("ORY", "Paris", "França", "Orly", 48.7233, 2.3794),
    ("LHR", "Londres", "Reino Unido", "Heathrow", 51.4700, -0.4543),
    ("LGW", "Londres", "Reino Unido", "Gatwick", 51.1537, -0.1821),
    ("FCO", "Roma", "Itália", "Fiumicino", 41.8003, 12.2389),
    ("MXP", "Milão", "Itália", "Malpensa", 45.6306, 8.7281),
    ("VCE", "Veneza", "Itália", "Marco Polo", 45.5053, 12.3519),
    ("AMS", "Amsterdã", "Países Baixos", "Schiphol", 52.3105, 4.7683),
    ("FRA", "Frankfurt", "Alemanha", "Frankfurt am Main", 50.0379, 8.5622),
    ("MUC", "Munique", "Alemanha", "Franz Josef Strauss", 48.3538, 11.7861),
    ("BER", "Berlim", "Alemanha", "Brandenburg", 52.3667, 13.5033),
    ("ZRH", "Zurique", "Suíça", "Kloten", 47.4647, 8.5492),
    ("VIE", "Viena", "Áustria", "Schwechat", 48.1103, 16.5697),
    ("DUB", "Dublin", "Irlanda", "Dublin Airport", 53.4264, -6.2499),
    ("ATH", "Atenas", "Grécia", "Eleftherios Venizelos", 37.9364, 23.9445),
    ("IST", "Istambul", "Turquia", "Istanbul Airport", 41.2753, 28.7519),
    ("CPH", "Copenhague", "Dinamarca", "Kastrup", 55.6180, 12.6508),
    ("PRG", "Praga", "Tchéquia", "Václav Havel", 50.1008, 14.2600),
    # África / Oriente Médio
    ("DXB", "Dubai", "Emirados Árabes Unidos", "Dubai International", 25.2532, 55.3657),
    ("DOH", "Doha", "Catar", "Hamad International", 25.2731, 51.6080),
    ("CPT", "Cidade do Cabo", "África do Sul", "Cape Town International", -33.9690, 18.6017),
    ("JNB", "Joanesburgo", "África do Sul", "O. R. Tambo", -26.1392, 28.2460),
    ("CAI", "Cairo", "Egito", "Cairo International", 30.1219, 31.4056),
    # Ásia / Oceania
    ("NRT", "Tóquio", "Japão", "Narita", 35.7720, 140.3929),
    ("HND", "Tóquio", "Japão", "Haneda", 35.5494, 139.7798),
    ("HKG", "Hong Kong", "China", "Hong Kong International", 22.3080, 113.9185),
    ("SIN", "Singapura", "Singapura", "Changi", 1.3644, 103.9915),
    ("BKK", "Bangkok", "Tailândia", "Suvarnabhumi", 13.6900, 100.7501),
    ("SYD", "Sydney", "Austrália", "Kingsford Smith", -33.9399, 151.1753),
    ("AKL", "Auckland", "Nova Zelândia", "Auckland Airport", -37.0082, 174.7850),
]

AIRPORTS: list[AirportPublic] = [
    AirportPublic(iata=i, city=c, country=co, name=n, latitude=lat, longitude=lon)
    for i, c, co, n, lat, lon in _RAW
]


def _score(airport: AirportPublic, q: str) -> int | None:
    """Menor é melhor; None = não casa."""
    iata = airport.iata.lower()
    city = airport.city.lower()
    name = airport.name.lower()
    if iata == q:
        return 0
    if iata.startswith(q):
        return 1
    if city.startswith(q):
        return 2
    if city.find(q) != -1 or name.find(q) != -1:
        return 3
    return None


def search_airports(
    query: str, *, limit: int = 8, airports: list[AirportPublic] | None = None
) -> list[AirportPublic]:
    """Busca aeroportos por cidade, nome ou código IATA. Ranqueada e limitada."""
    q = query.strip().lower()
    if not q:
        return []
    pool = AIRPORTS if airports is None else airports
    scored = [(score, a) for a in pool if (score := _score(a, q)) is not None]
    scored.sort(key=lambda item: (item[0], item[1].city))
    return [a for _, a in scored[:limit]]
