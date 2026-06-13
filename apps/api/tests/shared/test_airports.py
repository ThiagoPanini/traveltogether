"""Testes da busca de aeroportos (dataset de referência do boundary shared).

Comportamentos verificados:
  1. Buscar por cidade ("lisboa") sugere o IATA correspondente (LIS).
  2. Buscar por código IATA exato coloca-o em primeiro.
  3. Query em branco devolve lista vazia.
  4. limit é respeitado.
  5. Cada sugestão carrega coordenadas (lat/lon).
"""

from traveltogether.shared.airports import search_airports


def test_search_by_city_returns_iata() -> None:
    results = search_airports("lisboa")
    assert any(a.iata == "LIS" for a in results)


def test_search_by_iata_exact_ranks_first() -> None:
    results = search_airports("GRU")
    assert results[0].iata == "GRU"


def test_blank_query_returns_empty() -> None:
    assert search_airports("   ") == []


def test_limit_is_respected() -> None:
    assert len(search_airports("a", limit=3)) <= 3


def test_results_carry_coordinates() -> None:
    [lisbon] = [a for a in search_airports("lisboa") if a.iata == "LIS"]
    assert lisbon.latitude != 0.0
    assert lisbon.longitude != 0.0
