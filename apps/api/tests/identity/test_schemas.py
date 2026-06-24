"""Contrato de saída não vaza campo sensível (ADR-0005: persistência != contrato).

Varre todo schema Pydantic do módulo de borda e garante que nenhum serializa
`*_hash` nem `is_active` — campos que existem no ORM mas não podem viajar na API.
"""

import inspect

from pydantic import BaseModel

import travelmanager.identity.adapters.schemas as schemas

FORBIDDEN_FIELDS = {"token_hash", "code_hash", "is_active"}


def _schema_classes() -> list[type[BaseModel]]:
    return [
        obj
        for _, obj in inspect.getmembers(schemas, inspect.isclass)
        if issubclass(obj, BaseModel)
        and obj is not BaseModel
        and obj.__module__ == schemas.__name__
    ]


def test_ha_schemas_para_varrer() -> None:
    # given/when/then:
    assert _schema_classes(), "esperava ao menos um schema Pydantic no módulo"


def test_nenhum_schema_expoe_campo_sensivel() -> None:
    # given: todos os schemas de borda
    for cls in _schema_classes():
        # when:
        leaked = FORBIDDEN_FIELDS & set(cls.model_fields)
        # then:
        assert not leaked, f"{cls.__name__} vaza campo sensível: {leaked}"
