import { maskCedula } from '../lib/format';
import type { CollaboratorSearchResult, PersonProfile } from '../types/personProfile';

const DEFAULT_LIMIT = 20;

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function tokenize(value: string | null | undefined): string[] {
  const norm = normalizeSearchText(value ?? '');
  if (!norm) return [];
  return norm.split(' ').filter((token) => token.length > 0);
}

function textIncludes(value: string | null | undefined, query: string): boolean {
  if (!value || !query) return false;
  return normalizeSearchText(value).includes(query);
}

function buildSearchLabel(profile: PersonProfile): string {
  return [profile.person_name, profile.national_id, profile.person_id, profile.area_name]
    .filter(Boolean)
    .join(' - ');
}

/**
 * Match multi-token. Cada token del query debe ser PREFIJO o SUBSTRING de algún token del nombre.
 * Funciona sin importar el orden: para "RIVERA ANDRADE ERICK DAVID":
 *   - "erick david r"      ✅ (erick→ERICK, david→DAVID, r→RIVERA)
 *   - "david rivera"       ✅
 *   - "andrade r"          ✅
 *   - "rivera erick david" ✅
 * Devuelve: { ok, prefixMatches } donde prefixMatches cuenta cuántos tokens calzan como prefijo
 * (para rankear "prefix > substring").
 */
function matchNameTokens(nameTokens: string[], queryTokens: string[]): { ok: boolean; prefixMatches: number } {
  if (queryTokens.length === 0) return { ok: false, prefixMatches: 0 };
  let prefixMatches = 0;
  for (const q of queryTokens) {
    let hitPrefix = false;
    let hitSubstring = false;
    for (const n of nameTokens) {
      if (n.startsWith(q)) { hitPrefix = true; break; }
      if (n.includes(q)) hitSubstring = true;
    }
    if (!hitPrefix && !hitSubstring) return { ok: false, prefixMatches };
    if (hitPrefix) prefixMatches += 1;
  }
  return { ok: true, prefixMatches };
}

function rankProfile(profile: PersonProfile, normalizedQuery: string, digitsQuery: string, queryTokens: string[]): number | null {
  const nationalId = onlyDigits(profile.national_id ?? '');
  const personId = onlyDigits(profile.person_id ?? '');
  const personName = normalizeSearchText(profile.person_name ?? '');
  const nameTokens = tokenize(profile.person_name);

  if (digitsQuery) {
    if (nationalId === digitsQuery) return 1;
    if (personId === digitsQuery) return 2;
    if (nationalId.startsWith(digitsQuery)) return 3;
    if (personId.startsWith(digitsQuery)) return 4;
    if (nationalId.includes(digitsQuery)) return 5;
    if (personId.includes(digitsQuery)) return 6;
  }

  if (queryTokens.length > 0) {
    // Match exacto del nombre completo en orden (lo que el usuario tipea ⊆ el nombre tal cual)
    if (personName.includes(normalizedQuery)) return 7;

    // Match multi-token (orden libre, prefijo o substring por token)
    const tokenMatch = matchNameTokens(nameTokens, queryTokens);
    if (tokenMatch.ok) {
      // Más prefijos = mejor rank dentro de la franja 8-10
      if (tokenMatch.prefixMatches === queryTokens.length) return 8;   // todos prefijo
      if (tokenMatch.prefixMatches > 0) return 9;                       // mezcla
      return 10;                                                        // todos substring
    }
  }

  if (normalizedQuery.length >= 2) {
    if (textIncludes(profile.area_name, normalizedQuery)) return 11;
    if (textIncludes(profile.job_title, normalizedQuery)) return 12;
  }

  return null;
}

export function searchCollaborators(
  collaborators: PersonProfile[],
  query: string,
  options: { limit?: number } = {}
): CollaboratorSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  const digitsQuery = onlyDigits(query);
  const queryTokens = tokenize(query);
  const isNumericQuery = digitsQuery.length > 0 && digitsQuery.length === query.replace(/\s+/g, '').length;

  if (!normalizedQuery && !digitsQuery) return [];
  // Mínimo 2 chars totales para evitar resultados demasiado amplios, pero los tokens individuales
  // pueden ser de 1 char (ej. "erick david r") siempre que el query completo tenga ≥ 2 chars.
  if (!isNumericQuery && normalizedQuery.replace(/\s+/g, '').length < 2) return [];

  return collaborators
    .flatMap<CollaboratorSearchResult>((profile) => {
      const matchRank = rankProfile(profile, normalizedQuery, digitsQuery, queryTokens);
      if (matchRank === null) return [];
      return [{
        ...profile,
        search_label: buildSearchLabel(profile),
        masked_national_id: profile.national_id ? maskCedula(onlyDigits(profile.national_id)) : null,
        match_rank: matchRank
      }];
    })
    .sort((a, b) => a.match_rank - b.match_rank || (a.person_name ?? '').localeCompare(b.person_name ?? '', 'es'))
    .slice(0, options.limit ?? DEFAULT_LIMIT);
}
