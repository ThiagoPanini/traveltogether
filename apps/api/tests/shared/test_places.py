"""Testes da busca de lugares (POIs de referência, boundary shared).

Comportamentos verificados:
  1. Buscar por nome ("torre eiffel") sugere o lugar correspondente.
  2. Buscar por cidade ("lisboa") devolve POIs daquela cidade.
  3. Query em branco devolve lista vazia.
  4. limit é respeitado.
  5. Cada sugestão carrega endereço e link.
"""

from traveltogether.shared.places import search_places


def test_search_by_name_returns_place() -> None:
    results = search_places("torre eiffel")
    assert any("Eiffel" in p.name for p in results)


def test_search_by_city_returns_places() -> None:
    results = search_places("lisboa")
    assert results
    assert all(
        p.city.lower().find("lisboa") != -1 or p.name.lower().find("lisboa") != -1 for p in results
    )


def test_blank_query_returns_empty() -> None:
    assert search_places("   ") == []


def test_limit_is_respected() -> None:
    assert len(search_places("a", limit=3)) <= 3


def test_results_carry_address_and_link() -> None:
    results = search_places("coliseu")
    assert results
    assert results[0].address
    assert results[0].link.startswith("http")
