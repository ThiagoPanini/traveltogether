"""Carregamento leve de arquivos .env (sem dependências externas).

A API lê configuração via ``os.getenv`` (ver ``platform/db.py`` e
``identity/auth.py``). Quando o processo é iniciado sem injetar o ambiente
(ex.: ``uv run uvicorn traveltogether.main:app`` sem ``--env-file``), variáveis
como ``DATABASE_URL`` e ``AUTH_SECRET`` ficam ausentes e toda rota com banco
responde ``503``. Este módulo carrega ``.env.local`` e depois ``.env`` do
diretório de trabalho, **sem sobrescrever** o que já estiver definido no
ambiente real (Docker/CI continuam soberanos).
"""

import os
from pathlib import Path

# .env.local tem precedência sobre .env (carregado primeiro; não sobrescreve).
_ENV_FILES = (".env.local", ".env")


def _parse_line(line: str) -> tuple[str, str] | None:
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None
    key, _, raw_value = stripped.partition("=")
    key = key.strip()
    if not key:
        return None
    value = raw_value.strip().strip('"').strip("'")
    return key, value


def load_env_files(base_dir: Path | None = None) -> None:
    """Popula ``os.environ`` a partir dos arquivos .env, sem sobrescrever."""
    root = base_dir or Path.cwd()
    for name in _ENV_FILES:
        path = root / name
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            parsed = _parse_line(line)
            if parsed is None:
                continue
            key, value = parsed
            os.environ.setdefault(key, value)
