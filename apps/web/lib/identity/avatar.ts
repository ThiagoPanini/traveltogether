// Avatar topográfico determinístico, derivado do id do Usuário.
// Coerente com a direção Atlas (papel/floresta/laranja) e com as Imagens de
// Capa: linhas de contorno sobre fundo marfim. Sem foto → este grafismo.

const PAPER = ["#f4f0e6", "#faf8f1", "#f1ecdf"];
const INK = ["#1f3a2e", "#2b4a3a", "#c05621"];

/** Hash FNV-1a de 32 bits — estável entre execuções e plataformas. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Gera um data URI de SVG com contornos topográficos a partir do seed. */
export function topographicAvatar(seed: string): string {
  const h = hash(seed);
  const paper = PAPER[h % PAPER.length];
  const ink = INK[(h >> 3) % INK.length];
  const cx = 18 + ((h >> 6) % 28);
  const cy = 18 + ((h >> 11) % 28);
  const rings = 4 + ((h >> 16) % 4);

  const contours: string[] = [];
  for (let i = 0; i < rings; i++) {
    const rx = 8 + i * 7 + ((h >> (i + 2)) % 5);
    const ry = rx - 2 - ((h >> (i + 4)) % 4);
    const opacity = (0.85 - i * 0.12).toFixed(2);
    contours.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ` +
        `stroke="${ink}" stroke-width="1.5" opacity="${opacity}"/>`,
    );
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    `<rect width="64" height="64" fill="${paper}"/>` +
    contours.join("") +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
