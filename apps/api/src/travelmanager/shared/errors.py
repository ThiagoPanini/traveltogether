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

    def __init__(self, detail: str) -> None:
        """Inicializa o erro com a mensagem humana.

        Args:
            detail: Mensagem em pt-BR exibível ao usuário.
        """
        super().__init__(detail)
        self.detail = detail


class NotFound(DomainError):
    """Recurso pedido não existe."""


class Conflict(DomainError):
    """Estado conflita com uma invariante (ex.: unicidade violada)."""


class Invalid(DomainError):
    """Entrada ou estado inválido para a operação."""


class Unauthorized(DomainError):
    """Falta autorização para a operação."""


class RateLimited(DomainError):
    """Operação barrada por throttling."""


_STATUS: dict[type[DomainError], int] = {
    NotFound: 404,
    Conflict: 409,
    Invalid: 422,
    Unauthorized: 401,
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
