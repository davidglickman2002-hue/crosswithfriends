import {
  PUZZLE_SOURCES,
  SOURCE_ALPHANUMERIC,
  SOURCE_ABBREVIATION_CHARS,
  buildSourcePattern,
} from '@shared/puzzle_source';

/**
 * Returns a SQL CASE expression that extracts the day of the week from a puzzle title.
 * Uses PostgreSQL regex word boundaries to match day names and common abbreviations.
 *
 * @param tableAlias - Table alias for the puzzles table (e.g. 'p'). Pass empty string for no alias.
 */
export function dayOfWeekExtract(tableAlias = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `
  CASE
    WHEN UPPER(${prefix}content->'info'->>'title') ~ '\\m(MONDAY|MON)\\M' THEN 'Mon'
    WHEN UPPER(${prefix}content->'info'->>'title') ~ '\\m(TUESDAY|TUE|TUES)\\M' THEN 'Tue'
    WHEN UPPER(${prefix}content->'info'->>'title') ~ '\\m(WEDNESDAY|WED|WEDS)\\M' THEN 'Wed'
    WHEN UPPER(${prefix}content->'info'->>'title') ~ '\\m(THURSDAY|THU|THURS)\\M' THEN 'Thu'
    WHEN UPPER(${prefix}content->'info'->>'title') ~ '\\m(FRIDAY|FRI)\\M' THEN 'Fri'
    WHEN UPPER(${prefix}content->'info'->>'title') ~ '\\m(SATURDAY|SAT)\\M' THEN 'Sat'
    WHEN UPPER(${prefix}content->'info'->>'title') ~ '\\m(SUNDAY|SUN)\\M' THEN 'Sun'
    ELSE NULL
  END`;
}

/**
 * Returns a SQL CASE expression that extracts an integer publication date (YYYYMMDD)
 * from a puzzle title or titleOverride. Returns NULL if no publication date is present.
 *
 * @param tableAlias - Table alias for the puzzles table (e.g. 'p'). Pass empty string for no alias.
 */
export function puzzleDateExtract(tableAlias = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const titleText = `lower(COALESCE(${prefix}content->'info'->>'titleOverride', '') || ' ' || COALESCE(${prefix}content->'info'->>'title', ''))`;

  return `
  CASE
    -- Format 1: Month Name Day, Year (e.g. 'October 19, 2026' or 'Oct. 19, 2026')
    WHEN ${titleText} ~ '\\m(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.]?\\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\\s+[0-9]{4}\\M'
    THEN (
      substring(${titleText} from '\\m(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.]?\\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\\s+([0-9]{4})\\M')::int * 10000
      + CASE
          WHEN ${titleText} ~ '\\m(?:jan|january)\\M' THEN 100
          WHEN ${titleText} ~ '\\m(?:feb|february)\\M' THEN 200
          WHEN ${titleText} ~ '\\m(?:mar|march)\\M' THEN 300
          WHEN ${titleText} ~ '\\m(?:apr|april)\\M' THEN 400
          WHEN ${titleText} ~ '\\m(?:may)\\M' THEN 500
          WHEN ${titleText} ~ '\\m(?:jun|june)\\M' THEN 600
          WHEN ${titleText} ~ '\\m(?:jul|july)\\M' THEN 700
          WHEN ${titleText} ~ '\\m(?:aug|august)\\M' THEN 800
          WHEN ${titleText} ~ '\\m(?:sep|sept|september)\\M' THEN 900
          WHEN ${titleText} ~ '\\m(?:oct|october)\\M' THEN 1000
          WHEN ${titleText} ~ '\\m(?:nov|november)\\M' THEN 1100
          WHEN ${titleText} ~ '\\m(?:dec|december)\\M' THEN 1200
          ELSE 0
        END
      + substring(${titleText} from '\\m(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.]?\\s+([0-9]{1,2})(?:st|nd|rd|th)?,?\\s+[0-9]{4}\\M')::int
    )
    -- Format 2: Day Month Name Year (e.g. '19 October 2026' or '19 Oct 2026')
    WHEN ${titleText} ~ '\\m[0-9]{1,2}(?:st|nd|rd|th)?\\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.]?,?\\s+[0-9]{4}\\M'
    THEN (
      substring(${titleText} from '\\m[0-9]{1,2}(?:st|nd|rd|th)?\\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.]?,?\\s+([0-9]{4})\\M')::int * 10000
      + CASE
          WHEN ${titleText} ~ '\\m(?:jan|january)\\M' THEN 100
          WHEN ${titleText} ~ '\\m(?:feb|february)\\M' THEN 200
          WHEN ${titleText} ~ '\\m(?:mar|march)\\M' THEN 300
          WHEN ${titleText} ~ '\\m(?:apr|april)\\M' THEN 400
          WHEN ${titleText} ~ '\\m(?:may)\\M' THEN 500
          WHEN ${titleText} ~ '\\m(?:jun|june)\\M' THEN 600
          WHEN ${titleText} ~ '\\m(?:jul|july)\\M' THEN 700
          WHEN ${titleText} ~ '\\m(?:aug|august)\\M' THEN 800
          WHEN ${titleText} ~ '\\m(?:sep|sept|september)\\M' THEN 900
          WHEN ${titleText} ~ '\\m(?:oct|october)\\M' THEN 1000
          WHEN ${titleText} ~ '\\m(?:nov|november)\\M' THEN 1100
          WHEN ${titleText} ~ '\\m(?:dec|december)\\M' THEN 1200
          ELSE 0
        END
      + substring(${titleText} from '\\m([0-9]{1,2})(?:st|nd|rd|th)?\\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.]?,?\\s+[0-9]{4}\\M')::int
    )
    -- Format 3: ISO Date YYYY-MM-DD
    WHEN ${titleText} ~ '\\m[0-9]{4}-[0-9]{2}-[0-9]{2}\\M'
    THEN (
      substring(${titleText} from '\\m([0-9]{4})-[0-9]{2}-[0-9]{2}\\M')::int * 10000
      + substring(${titleText} from '\\m[0-9]{4}-([0-9]{2})-[0-9]{2}\\M')::int * 100
      + substring(${titleText} from '\\m[0-9]{4}-[0-9]{2}-([0-9]{2})\\M')::int
    )
    ELSE NULL
  END`;
}

/** Doubles single quotes so a pattern can be embedded in a SQL string literal. */
function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Returns a SQL CASE expression that classifies a puzzle's publication
 * ("source") from the title + copyright text it carries, or NULL when no known
 * publication matches (the "other sources" bucket).
 *
 * The patterns come from shared/puzzle_source.ts so the server filter and the
 * client-side card badges can never disagree. They are POSIX ERE with no
 * punctuation and no capitals; the text is folded by `normalizeSqlSourceText`
 * first, which is the SQL mirror of `normalizeSourceText`, so the patterns are
 * tested with the case-sensitive `~` operator.
 *
 * @param tableAlias - Table alias for the puzzles table (e.g. 'p'). Pass empty string for no alias.
 */
export function puzzleSourceExtract(tableAlias = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  // Must stay identical to puzzleSourceHaystack() in shared/puzzle_source.ts,
  // including field order: the start-anchored patterns need the publication
  // name to be able to sit at the very front of the haystack.
  const text = `(COALESCE(${prefix}content->'info'->>'titleOverride', '') || ' ' || COALESCE(${prefix}content->'info'->>'title', '') || ' ' || COALESCE(${prefix}content->'info'->>'copyright', ''))`;
  const normalized = normalizeSqlSourceText(text);
  const whens = PUZZLE_SOURCES.filter((source) => source.match)
    .map(
      (source) => `WHEN ${normalized} ~ '${escapeSqlLiteral(buildSourcePattern(source))}' THEN '${source.id}'`
    )
    .join('\n    ');
  return `
  CASE
    ${whens}
    ELSE NULL
  END`;
}

/**
 * SQL mirror of `normalizeSourceText` from shared/puzzle_source.ts: lowercase,
 * drop abbreviation punctuation, collapse every other run of separators to a
 * single space, trim.
 *
 * Both character classes are built from the shared constants rather than
 * hard-coded, and the kept-character set is spelled out instead of written as
 * `a-z0-9`, because Postgres bracket ranges follow the database collation —
 * under `en_US.UTF-8` a range can include accented letters that JavaScript's
 * `[^a-z0-9]` would have treated as separators. An explicit enumeration has no
 * range and is therefore identical in both engines.
 *
 * Order matters and matches the JavaScript: strip the abbreviation dots before
 * collapsing separators, so "N.Y." becomes "ny" and not "n y".
 */
function normalizeSqlSourceText(text: string): string {
  const dropped = escapeSqlLiteral(SOURCE_ABBREVIATION_CHARS);
  return `btrim(regexp_replace(regexp_replace(lower(${text}), '[${dropped}]', '', 'g'), '[^${SOURCE_ALPHANUMERIC}]+', ' ', 'g'))`;
}
