/**
 * Costura trocável de busca de cidades (ADR-0006 / #215).
 *
 * Fase 2: implementação build-time com dados GeoNames cities15000 (CC-BY 4.0),
 * recortados por país e carregados por code-split. Fase 5 substituirá por chamada
 * ao endpoint /geo da API sem reescrever a UI.
 *
 * GeoNames attribution: This product uses data from the GeoNames geographical
 * database (https://www.geonames.org), licensed under CC-BY 4.0.
 */

export type CityEntry = {
  name: string;
  asciiName: string;
  /** Coordenadas GeoNames (client-only — alimentam o mapa vetorial; ADR-0010/0011). */
  lat: number;
  lng: number;
  population: number;
};

// Mapa de loaders — bundler analisa estaticamente cada import().
const loaders: Partial<Record<string, () => Promise<{ default: CityEntry[] }>>> = {
  AO: () => import("./data/AO.json"),
  AR: () => import("./data/AR.json"),
  AU: () => import("./data/AU.json"),
  BR: () => import("./data/BR.json"),
  CA: () => import("./data/CA.json"),
  CH: () => import("./data/CH.json"),
  CL: () => import("./data/CL.json"),
  CO: () => import("./data/CO.json"),
  DE: () => import("./data/DE.json"),
  ES: () => import("./data/ES.json"),
  FR: () => import("./data/FR.json"),
  GB: () => import("./data/GB.json"),
  IE: () => import("./data/IE.json"),
  IT: () => import("./data/IT.json"),
  JP: () => import("./data/JP.json"),
  MX: () => import("./data/MX.json"),
  MZ: () => import("./data/MZ.json"),
  NL: () => import("./data/NL.json"),
  PE: () => import("./data/PE.json"),
  PT: () => import("./data/PT.json"),
  PY: () => import("./data/PY.json"),
  US: () => import("./data/US.json"),
  UY: () => import("./data/UY.json"),
};

const MAX_RESULTS = 20;

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Busca cidades de um país com filtro accent-insensitive.
 *
 * Retorna no máximo 20 resultados. Sem query, retorna as primeiras 20 por
 * população (já ordenadas no JSON de build). Retorna array vazio para países
 * sem dados ou query sem correspondência.
 */
export async function searchCities(country: string, query: string): Promise<CityEntry[]> {
  const loader = loaders[country];
  if (!loader) return [];
  const { default: cities } = await loader();
  if (!query.trim()) return cities.slice(0, MAX_RESULTS);
  const q = stripAccents(query);
  return cities
    .filter((c) => stripAccents(c.asciiName).includes(q) || stripAccents(c.name).includes(q))
    .slice(0, MAX_RESULTS);
}

/**
 * Resolve uma cidade textual para coordenadas do GeoNames dentro de um país.
 *
 * O casamento é exato depois de normalizar caixa e acentos para evitar plotar uma
 * sugestão parcial errada. É uma geocodificação best-effort exclusiva do cliente.
 */
export async function findCity(country: string, city: string): Promise<CityEntry | null> {
  const normalized = stripAccents(city.trim());
  if (!normalized) return null;
  const candidates = await searchCities(country, city);
  return (
    candidates.find(
      (candidate) =>
        stripAccents(candidate.name) === normalized ||
        stripAccents(candidate.asciiName) === normalized,
    ) ?? null
  );
}
