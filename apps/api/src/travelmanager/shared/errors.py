"""Categorias semânticas de erro + handler HTTP central (ADR-0005).

O domínio fala **categorias** (`NotFound`, `Conflict`, `Invalid`, `Unauthorized`,
`RateLimited`), nunca números HTTP — categorias transcendem o transporte (mapeiam
para gRPC, exit-code de CLI). O número vive **uma vez**, no handler que é a costura
HTTP literal. O `code` estável no body é contrato com o web BFF; `detail` é cópia
humana em pt-BR e nunca carrega segredo/interno.

Na #189 nenhum caminho ainda levanta `DomainError` (o 401 de sessão ausente é
estado normal, tratado no inbound). O módulo existe para a #190+ (OTP, linking)
aterrissar pronta.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Erro de regra de domínio, sem qualquer noção de HTTP.

    Attributes:
        code: Identificador estável consumido pelo web BFF para ramificar copy.
        detail: Mensagem humana em pt-BR (nunca um segredo ou detalhe interno).
    """

    code = "domain_error"

    def __init__(self, detail: str, *, code: str | None = None) -> None:
        """Inicializa o erro com a mensagem humana e, opcionalmente, um `code` estável.

        Args:
            detail: Mensagem em pt-BR exibível ao usuário.
            code: Identificador estável específico (sobrepõe o `code` da categoria)
                quando o web precisa ramificar copy num caso particular — ex.:
                `trip_name_required`, `invitation_exists`. Sem ele, vale o da classe.
        """
        super().__init__(detail)
        self.detail = detail
        if code is not None:
            self.code = code


class NotFound(DomainError):
    """Recurso pedido não existe."""


class Conflict(DomainError):
    """Estado conflita com uma invariante (ex.: unicidade violada)."""


class Invalid(DomainError):
    """Entrada ou estado inválido para a operação."""


class Unauthorized(DomainError):
    """Falta autenticação para a operação (quem é você?)."""


class Forbidden(DomainError):
    """Autenticado, mas sem permissão para esta operação (ex.: não-Organizador)."""

    code = "forbidden"


class RateLimited(DomainError):
    """Operação barrada por throttling."""

    code = "rate_limited"


# Ordem importa: subclasses antes das bases não se aplica aqui (categorias são irmãs),
# mas o handler usa `isinstance` — categorias distintas não se sobrepõem.
_STATUS: dict[type[DomainError], int] = {
    NotFound: 404,
    Conflict: 409,
    Invalid: 422,
    Unauthorized: 401,
    Forbidden: 403,
    RateLimited: 429,
}


def install_error_handlers(app: FastAPI) -> None:
    """Registra o handler que mapeia categoria de domínio → status HTTP.

    Args:
        app: A aplicação FastAPI onde o handler é instalado.
    """

    @app.exception_handler(DomainError)
    def _handle(_: Request, exc: DomainError) -> JSONResponse:
        status = next((s for cls, s in _STATUS.items() if isinstance(exc, cls)), 400)
        return JSONResponse(status_code=status, content={"code": exc.code, "detail": exc.detail})
