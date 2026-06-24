"""Ports do contexto identity (ADR-0005): contratos que os use-cases consomem.

`typing.Protocol` (estrutural, não `abc.ABC`): o adapter satisfaz o Port pela
**forma**, sem importá-lo — a seta de dependência aponta só para baixo. pyright
verifica no ponto de uso (o retorno anotado dos `provide_*`).
"""

from datetime import datetime
from typing import Protocol

from travelmanager.identity.domain.google import GoogleClaims
from travelmanager.identity.domain.models import AuthIdentity, AuthSession, OtpCode, User


class SessionRepository(Protocol):
    """Persistência de sessões opacas."""

    def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        """Busca a sessão pelo hash do token.

        Args:
            token_hash: O HMAC do token (o que se persiste).

        Returns:
            A sessão correspondente, ou `None` se não houver.
        """
        ...

    def save(self, session: AuthSession) -> None:
        """Cria ou persiste a mutação de uma sessão.

        Args:
            session: A entidade a persistir.
        """
        ...


class TokenGenerator(Protocol):
    """Fonte de tokens opacos."""

    def generate(self) -> str:
        """Cunha um token opaco, aleatório e URL-safe."""
        ...


class OtpRepository(Protocol):
    """Persistência de códigos OTP, chaveados por e-mail."""

    def save(self, otp: OtpCode) -> None:
        """Cria ou persiste a mutação de um código OTP.

        Args:
            otp: A entidade a persistir.
        """
        ...

    def get_active(self, email: str, now: datetime) -> OtpCode | None:
        """Busca o OTP mais recente ainda válido para o e-mail.

        Args:
            email: E-mail normalizado (chave natural).
            now: Instante de referência para descartar expirados.

        Returns:
            O código não-consumido e não-expirado mais recente, ou `None`.
        """
        ...


class UserRepository(Protocol):
    """Persistência de usuários, resolvidos pela chave natural (e-mail)."""

    def get_by_email(self, email: str) -> User | None:
        """Busca o usuário pelo e-mail normalizado.

        Args:
            email: E-mail normalizado.

        Returns:
            O usuário, ou `None` se ainda não existe.
        """
        ...

    def save(self, user: User) -> None:
        """Cria ou persiste a mutação de um usuário.

        Args:
            user: A entidade a persistir.
        """
        ...


class IdentityRepository(Protocol):
    """Persistência de vínculos de provedor externo (`auth_identities`)."""

    def get_by_provider_subject(self, provider: str, subject: str) -> AuthIdentity | None:
        """Busca o vínculo pela chave `(provider, subject)`.

        Args:
            provider: Nome do provedor externo (ex.: `google`).
            subject: Identificador estável do usuário no provedor.

        Returns:
            O vínculo correspondente, ou `None` se ainda não existe.
        """
        ...

    def save(self, identity: AuthIdentity) -> None:
        """Cria ou persiste a mutação de um vínculo.

        Args:
            identity: A entidade a persistir.
        """
        ...


class GoogleTokenVerifier(Protocol):
    """Verificador de `id_token` do Google: prova criptográfica → claims de domínio."""

    def verify(self, id_token: str) -> GoogleClaims | None:
        """Verifica a prova e devolve os claims, ou `None` se inválida.

        A checagem de assinatura (JWKS), `aud`, `iss` e `exp` é interna ao adapter;
        a regra de e-mail verificado fica no use-case (sobre os claims).

        Args:
            id_token: O JWT cru emitido pelo Google.

        Returns:
            Os claims verificados, ou `None` se o token for inválido.
        """
        ...


class CodeGenerator(Protocol):
    """Fonte de códigos OTP numéricos."""

    def generate(self) -> str:
        """Cunha um código OTP de 6 dígitos numéricos (zeros à esquerda inclusos)."""
        ...


class EmailSender(Protocol):
    """Transporte de e-mail transacional (o código OTP)."""

    def send_code(self, email: str, code: str) -> None:
        """Envia o código OTP ao e-mail.

        Args:
            email: Destinatário (e-mail normalizado).
            code: Código OTP em claro.
        """
        ...
