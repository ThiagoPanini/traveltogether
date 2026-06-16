"""Teste do template de e-mail do digest (#112).

Render puro: confere que o HTML traz a marca, agrupa por Viagem com suas linhas
e linka de volta para a inbox. Não dispara rede (sem RESEND_API_KEY no teste).
"""

from traveltogether.platform.email_service import render_digest_html


def test_render_digest_html_groups_by_trip_with_inbox_link() -> None:
    html = render_digest_html(
        recipient_name="Alice",
        groups=[
            ("Eurotrip", ["Tarefa atribuída a você", "Você foi mencionado"]),
            ("Andes 2027", ["Escolhida marcada"]),
        ],
        inbox_url="https://app.example.com/notifications",
    )

    assert "traveltogether" in html
    assert "Eurotrip" in html
    assert "Andes 2027" in html
    assert "Tarefa atribuída a você" in html
    assert "Escolhida marcada" in html
    assert 'href="https://app.example.com/notifications"' in html
