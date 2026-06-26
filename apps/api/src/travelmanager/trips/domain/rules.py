"""Regras puras do contexto `trips` (ADR-0005): lógica sem uma linha de banco.

Validação de `transfer_kind` (ADR-0009), normalização de e-mail do Convite (chave,
lowercase — ADR-0002), iniciais para o bloco rico da tripulação e o papel default.
Domínio independente: o `identity` não é importado aqui (a normalização de e-mail é
trivial e fica local, mantendo `trips → identity` só no FK/adapter).
"""

from travelmanager.shared.errors import Invalid

# Tipos de translado de primeira classe (ADR-0009). `other` carrega texto livre;
# `undecided` = "ainda em discussão" (nasce assim nos saltos compartilhados 2+).
TRANSFER_KINDS: frozenset[str] = frozenset(
    {
        "plane",
        "rental_car",
        "own_car",
        "bus",
        "train",
        "van",
        "on_foot",
        "other",
        "undecided",
    }
)

UNDECIDED = "undecided"
OTHER = "other"


def normalize_email(email: str) -> str:
    """Normaliza o e-mail para a forma canônica (chave do Convite — ADR-0002).

    Args:
        email: E-mail como digitado.

    Returns:
        O e-mail aparado e em caixa-baixa.
    """
    return email.strip().lower()


def validate_transfer_kind(kind: str) -> str:
    """Confere que o tipo de translado pertence ao conjunto de primeira classe.

    Args:
        kind: O tipo proposto (`plane`, `bus`, …, `other`, `undecided`).

    Returns:
        O próprio `kind`, quando válido.

    Raises:
        Invalid: tipo fora da lista (use `other` para um meio não previsto).
    """
    if kind not in TRANSFER_KINDS:
        raise Invalid(f"tipo de translado inválido: {kind!r}", code="transfer_kind_invalid")
    return kind


def clean_other_text(kind: str, other_text: str | None) -> str | None:
    """Mantém o texto livre só quando o tipo é `other` (senão descarta).

    Args:
        kind: O tipo de translado já validado.
        other_text: O texto livre digitado, se houver.

    Returns:
        O texto aparado quando `kind == 'other'`; `None` caso contrário.
    """
    if kind != OTHER:
        return None
    cleaned = (other_text or "").strip()
    return cleaned or None


def initials(display_name: str | None) -> str:
    """Deriva as iniciais para o avatar da tripulação (bloco rico pós-aceite).

    Args:
        display_name: Nome de exibição do membro (pode ser nulo).

    Returns:
        Até duas iniciais em caixa-alta (primeira+última palavra), ou `""` se sem nome.
    """
    parts = (display_name or "").split()
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()
