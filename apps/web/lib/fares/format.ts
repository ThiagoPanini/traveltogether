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
  // Intl insere NBSP (U+00A0) entre símbolo e número; normaliza p/ espaço comum.
  return new Intl.NumberFormat("pt-BR", {
    currency: currency || "BRL",
    style: "currency",
  })
    .format(numeric)
    .replace(/ /g, " ");
}

/** Pontos formatados com separador de milhar pt-BR + rótulo do programa. */
export function formatPoints(points: number, loyaltyProgram: string): string {
  return `${new Intl.NumberFormat("pt-BR").format(points)} ${loyaltyProgram}`;
}

/**
 * Preço completo da Pesquisa: pontos (quando houver) seguidos da taxa em
 * dinheiro. Sem conversão (invariante 15 estendida, ADR-0019): as unidades
 * andam separadas, juntas por "·". Taxa zero é omitida (arranjo só-pontos).
 */
export function formatFarePrice(
  value: string,
  currency: string,
  points: number | null,
  loyaltyProgram: string | null,
): string {
  const parts: string[] = [];
  if (points != null && points > 0 && loyaltyProgram) {
    parts.push(formatPoints(points, loyaltyProgram));
  }
  if (moneyValue(value) > 0 || parts.length === 0) {
    parts.push(formatMoney(value, currency));
  }
  return parts.join(" · ");
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
