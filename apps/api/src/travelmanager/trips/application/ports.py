"""Ports do contexto `trips` (ADR-0005): contratos que os use-cases consomem.

`typing.Protocol` (estrutural): o adapter satisfaz pela **forma**, sem importar o
Port — a seta de dependência aponta só para baixo, e pyright confere no retorno
anotado dos `provide_*`. O `UserDirectory` é a **costura cross-contexto** (ADR-0011):
resolve o display (nome/iniciais/cidade) de um Usuário do `identity` para o backbone,
sem que o domínio de `trips` importe o `identity`.
"""

import uuid
from dataclasses import dataclass
from typing import Protocol

from travelmanager.trips.domain.models import Invitation, Membership, Trip


@dataclass(frozen=True, slots=True)
class MemberDisplay:
    """Bloco rico de um membro aceito (join cross-contexto via `UserDirectory`).

    Attributes:
        display_name: Nome de exibição do Perfil (pode ser nulo).
        initials: Iniciais derivadas para o avatar.
        city: Cidade de origem do Perfil (CONTEXT inv. 6; pode ser nula).
    """

    display_name: str | None
    initials: str
    city: str | None


class TripRepository(Protocol):
    """Persistência da Viagem (com Paradas/Participações/Convites em cascata)."""

    def save(self, trip: Trip) -> None:
        """Cria ou persiste a mutação de uma Viagem (`add` + `flush`, sem commit).

        A cascata persiste Paradas, Participações e Convites apensados à Viagem — é
        o que torna a criação **atômica** numa só unit-of-work (ADR-0011).

        Args:
            trip: A entidade a persistir.
        """
        ...

    def get(self, trip_id: uuid.UUID) -> Trip | None:
        """Busca a Viagem pelo id.

        Args:
            trip_id: Identificador da Viagem.

        Returns:
            A Viagem, ou `None` se não existe.
        """
        ...


class MembershipRepository(Protocol):
    """Persistência e consulta de Participações (visibilidade por-usuário — inv. 9)."""

    def save(self, membership: Membership) -> None:
        """Cria ou persiste a mutação de uma Participação (`add` + `flush`).

        Args:
            membership: A entidade a persistir.
        """
        ...

    def get_for(self, trip_id: uuid.UUID, user_id: uuid.UUID) -> Membership | None:
        """Busca a Participação de um usuário numa Viagem (papel + pertencimento).

        Args:
            trip_id: A Viagem.
            user_id: O usuário.

        Returns:
            A Participação, ou `None` se o usuário não participa.
        """
        ...

    def list_for_user(self, user_id: uuid.UUID) -> list[Membership]:
        """Lista as Participações de um usuário (as Viagens que ele vê).

        Args:
            user_id: Dono das Participações.

        Returns:
            As Participações do usuário (cada uma com `.trip` acessível).
        """
        ...


class InvitationRepository(Protocol):
    """Persistência e consulta de Convites (cego, por e-mail — ADR-0002)."""

    def save(self, invitation: Invitation) -> None:
        """Cria ou persiste a mutação de um Convite (`add` + `flush`).

        O `flush` aflora a violação do índice parcial (convite pendente duplicado)
        **dentro** do use-case, traduzível para `Conflict`.

        Args:
            invitation: A entidade a persistir.
        """
        ...

    def get(self, invitation_id: uuid.UUID) -> Invitation | None:
        """Busca o Convite pelo id.

        Args:
            invitation_id: Identificador do Convite.

        Returns:
            O Convite, ou `None` se não existe.
        """
        ...

    def list_pending_for_email(self, email: str) -> list[Invitation]:
        """Lista os Convites pendentes de um e-mail (a caixa de entrada do convidado).

        Args:
            email: E-mail normalizado da conta.

        Returns:
            Os Convites com `status='pending'` para o e-mail (cada um com `.trip`).
        """
        ...

    def find_pending(self, trip_id: uuid.UUID, email: str) -> Invitation | None:
        """Acha o Convite vivo (pendente) de um e-mail numa Viagem, se houver.

        Pré-checagem amigável do índice parcial (`Conflict` limpo antes do flush);
        o índice é o backstop race-safe.

        Args:
            trip_id: A Viagem.
            email: E-mail normalizado.

        Returns:
            O Convite pendente, ou `None` se o e-mail está livre para convite.
        """
        ...


class UserDirectory(Protocol):
    """Costura cross-contexto para o `identity` (ADR-0011): só leitura de display."""

    def displays_for(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, MemberDisplay]:
        """Resolve o bloco rico (nome/iniciais/cidade) de cada usuário.

        Args:
            user_ids: Ids dos usuários a resolver (membros aceitos, convidadores).

        Returns:
            Mapa `user_id → MemberDisplay`; ids sem Perfil podem vir ausentes.
        """
        ...
