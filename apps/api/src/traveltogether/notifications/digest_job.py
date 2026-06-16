"""Entrypoint do job de digest de Notificações (#112).

Roda fora do ciclo HTTP (agendado pelo operador — ex.: scheduled task no
Coolify): abre uma sessão, dispara `run_digest` e loga quantos e-mails saíram.
Execução: ``python -m traveltogether.notifications.digest_job``.
"""

import logging

from sqlmodel import Session

from traveltogether.notifications.digest_service import run_digest
from traveltogether.platform.db import get_engine

logger = logging.getLogger(__name__)


def main() -> int:
    """Dispara o digest e devolve quantos destinatários receberam e-mail."""
    with Session(get_engine()) as session:
        emailed = run_digest(session)
    logger.info("[digest_job] enviados %d e-mail(s) de digest", len(emailed))
    return len(emailed)


if __name__ == "__main__":  # pragma: no cover
    logging.basicConfig(level=logging.INFO)
    main()
