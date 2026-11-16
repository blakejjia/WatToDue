/**
 * University of Waterloo term code parser and utilities.
 *
 * Term code convention:
 * 4 digits (e.g. 1251):
 * - Century & Year: 1900 + Math.floor(code / 10) (e.g. 1900 + 125 = 2025)
 * - Season suffix:
 *     1 -> Winter
 *     5 -> Spring
 *     9 -> Fall
 */

const SEASONS = {
  1: 'Winter',
  5: 'Spring',
  9: 'Fall',
};

const TERM_REGEX = /(?<!\d)(1\d{3})(?!\d)/g;

/**
 * Parses a 4-digit Waterloo term code into structured information.
 * @param {string|number} code - e.g. "1265" or 1265
 * @returns {{ termCode: string, season: string, year: number, label: string } | null}
 */
export function parseTermCode(code) {
  if (typeof code !== 'string' && typeof code !== 'number') {
    return null;
  }
  const str = String(code).trim();
  if (!/^\d{4}$/.test(str)) {
    return null;
  }

  const num = parseInt(str, 10);
  if (num < 1000 || num > 1999) {
    return null;
  }

  const seasonNum = num % 10;
  const season = SEASONS[seasonNum];
  if (!season) {
    return null;
  }

  const year = 1900 + Math.floor(num / 10);
  return {
    termCode: str,
    season,
    year,
    label: `${season} ${year}`,
  };
}

/**
 * Extracts the last valid 4-digit Waterloo academic term code from an offering code string.
 * @param {string} offeringCode - e.g. "1265-CHEM.233.001.1.LEC"
 * @returns {string | null}
 */
export function extractTermFromOffering(offeringCode) {
  if (typeof offeringCode !== 'string' || !offeringCode) {
    return null;
  }

  const matches = [...offeringCode.matchAll(TERM_REGEX)];
  if (matches.length === 0) {
    return null;
  }

  const validCodes = matches
    .map((m) => m[1])
    .filter((code) => {
      const num = parseInt(code, 10);
      return num >= 1000 && num <= 1999 && (num % 10) in SEASONS;
    });

  return validCodes.length > 0 ? validCodes[validCodes.length - 1] : null;
}
