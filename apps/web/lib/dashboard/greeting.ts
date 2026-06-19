// Saudação do Painel cheio (#169): linha de data + "Bom dia/Boa tarde, nome".
// Pura e determinística (recebe a hora pronta) — a page server passa `new Date()`
// e o nome; o componente só pinta. Datas formatadas por tabela local (sem
// depender do Intl), à paridade do protótipo App ("quinta · 18 jun").

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export interface PanelGreeting {
  /** "quinta · 18 jun" */
  dateLine: string;
  /** "Bom dia, Marina" */
  salutation: string;
}

export function salutationFor(hour: number): "Bom dia" | "Boa tarde" | "Boa noite" {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}

export function buildGreeting(name: string, now: Date): PanelGreeting {
  const day = String(now.getDate()).padStart(2, "0");
  return {
    dateLine: `${WEEKDAYS[now.getDay()]} · ${day} ${MONTHS[now.getMonth()]}`,
    salutation: `${salutationFor(now.getHours())}, ${firstName(name)}`,
  };
}
