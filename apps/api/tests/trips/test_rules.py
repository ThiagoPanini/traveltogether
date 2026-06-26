"""Regras puras de `trips` (ADR-0005): sem Ports, sem DB — só lógica de domínio."""

import pytest

from travelmanager.shared.errors import Invalid
from travelmanager.trips.domain.rules import (
    clean_other_text,
    initials,
    normalize_email,
    validate_transfer_kind,
)


class TestNormalizeEmail:
    def test_apara_e_caixa_baixa(self) -> None:
        # given/when/then:
        assert normalize_email("  Joao@Example.COM ") == "joao@example.com"


class TestValidateTransferKind:
    def test_tipo_de_primeira_classe_passa(self) -> None:
        # given/when/then:
        assert validate_transfer_kind("plane") == "plane"

    def test_undecided_e_valido(self) -> None:
        # given/when/then:
        assert validate_transfer_kind("undecided") == "undecided"

    def test_tipo_desconhecido_e_recusado(self) -> None:
        # given/when/then:
        with pytest.raises(Invalid) as exc:
            validate_transfer_kind("teleporte")
        assert exc.value.code == "transfer_kind_invalid"


class TestCleanOtherText:
    def test_other_preserva_texto_aparado(self) -> None:
        # given/when/then:
        assert clean_other_text("other", "  barco  ") == "barco"

    def test_other_vazio_vira_none(self) -> None:
        # given/when/then:
        assert clean_other_text("other", "   ") is None

    def test_tipo_conhecido_descarta_texto(self) -> None:
        # given/when/then:
        assert clean_other_text("bus", "qualquer coisa") is None


class TestInitials:
    def test_sem_nome_fica_vazio(self) -> None:
        # given/when/then:
        assert initials(None) == ""
        assert initials("   ") == ""

    def test_nome_unico_usa_duas_primeiras_letras(self) -> None:
        # given/when/then:
        assert initials("ana") == "AN"

    def test_nome_composto_usa_primeira_e_ultima(self) -> None:
        # given/when/then:
        assert initials("Ana Maria Lima") == "AL"
