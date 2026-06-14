"""Testes da busca de companhias aéreas (dataset de referência, boundary shared).

Comportamentos verificados:
  1. Buscar por nome ("latam") sugere a companhia correspondente.
  2. Buscar por código IATA exato coloca-a em primeiro.
  3. Query em branco devolve lista vazia.
  4. limit é respeitado.
  5. Cada sugestão carrega uma URL de logo.
"""

from traveltogether.shared.airlines import search_airlines


def test_search_by_name_returns_airline() -> None:
    results = search_airlines("latam")
    assert any(a.iata == "LA" for a in results)


def test_search_by_iata_exact_ranks_first() -> None:
    results = search_airlines("TP")
    assert results[0].iata == "TP"


def test_blank_query_returns_empty() -> None:
    assert search_airlines("   ") == []


def test_limit_is_respected() -> None:
    assert len(search_airlines("a", limit=3)) <= 3


def test_results_carry_logo() -> None:
    [tap] = [a for a in search_airlines("tap") if a.iata == "TP"]
    assert tap.logo_url.startswith("http")
