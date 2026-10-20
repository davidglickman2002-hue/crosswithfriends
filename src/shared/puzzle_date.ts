const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Extracts a publication date from a puzzle title, titleOverride, or combined info object.
 * Returns an integer in YYYYMMDD format (e.g. 20261019 for October 19, 2026),
 * or null if no valid date could be identified.
 */
export function extractPuzzleDate(
  info?: {title?: string; titleOverride?: string; originalTitle?: string} | string | null
): number | null {
  if (!info) return null;
  const rawTitle =
    typeof info === 'string'
      ? info
      : [info.titleOverride, info.title, info.originalTitle].filter(Boolean).join(' ');
  const title = rawTitle.trim();
  if (!title) return null;

  // Format 1: Month Name Day, Year (e.g. "October 19, 2026", "Oct. 19, 2026", "Oct 19 2026", "October 19th, 2026")
  const m1 = title.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.]?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i
  );
  if (m1) {
    const month = MONTH_MAP[m1[1].toLowerCase()];
    const day = parseInt(m1[2], 10);
    const year = parseInt(m1[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return year * 10000 + month * 100 + day;
    }
  }

  // Format 2: Day Month Name Year (e.g. "19 October 2026", "19 Oct 2026", "19th October 2026")
  const m2 = title.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.]?,?\s+(\d{4})\b/i
  );
  if (m2) {
    const day = parseInt(m2[1], 10);
    const month = MONTH_MAP[m2[2].toLowerCase()];
    const year = parseInt(m2[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return year * 10000 + month * 100 + day;
    }
  }

  // Format 3: ISO YYYY-MM-DD (e.g. "2026-10-19")
  const m3 = title.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m3) {
    const year = parseInt(m3[1], 10);
    const month = parseInt(m3[2], 10);
    const day = parseInt(m3[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return year * 10000 + month * 100 + day;
    }
  }

  // Format 4: MM/DD/YYYY or MM/DD/YY (e.g. "10/19/2026", "10/19/26")
  const m4 = title.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m4) {
    const month = parseInt(m4[1], 10);
    const day = parseInt(m4[2], 10);
    let year = parseInt(m4[3], 10);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return year * 10000 + month * 100 + day;
    }
  }

  return null;
}

/**
 * Comparator for ordering puzzles by publication date descending,
 * falling back to pid_numeric descending (or pid descending) as tie-breaker.
 * Puzzles with publication dates always precede undated puzzles (NULLS LAST).
 */
export function comparePuzzleDates(
  a: {date?: number | null; pid?: string; info?: {title?: string; titleOverride?: string}},
  b: {date?: number | null; pid?: string; info?: {title?: string; titleOverride?: string}}
): number {
  const dateA = a.date !== undefined ? a.date : extractPuzzleDate(a.info);
  const dateB = b.date !== undefined ? b.date : extractPuzzleDate(b.info);

  if (dateA !== dateB) {
    if (dateA != null && dateB != null) return dateB - dateA;
    if (dateA != null) return -1;
    if (dateB != null) return 1;
  }
  const pidA = a.pid ?? '';
  const pidB = b.pid ?? '';
  const numA = Number(pidA);
  const numB = Number(pidB);
  if (Number.isFinite(numA) && Number.isFinite(numB)) {
    return numB - numA;
  }
  return pidB.localeCompare(pidA);
}
