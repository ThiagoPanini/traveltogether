/**
 * Formatação e parsing de Pesquisa de Passagem, compartilhados entre o board
 * do Trajeto e a tela Comparar. Sem conversão de câmbio (invariante 15): valor
 * e moeda andam sempre juntos.
 */

/**
 * Converte o valor textual da Pesquisa para número, tolerando pt-BR
 * ("1.234,56") e formato com ponto decimal ("1234.56"). Valor inválido vira
 * `+Infinity` para cair por último em ordenações por preço.
 */
export function moneyValue(value: string): number {
  const raw = String(value).trim();
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

/** Valor formatado na moeda da Pesquisa; sem conversão. */
export function formatMoney(value: string, currency: string): string {
  const numeric = moneyValue(value);
  if (!Number.isFinite(numeric)) return `${currency} ${value}`;
  return new Intl.NumberFormat("pt-BR", {
    currency: currency || "BRL",
    style: "currency",
  }).format(numeric);
}

/** Data do voo abreviada (ex.: "seg., 01 set."). */
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/** Duração em "2h" ou "2h05" (minutos com zero à esquerda). */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
}
