import {dayOfWeekExtract, puzzleDateExtract, puzzleSourceExtract} from '../../model/sql_helpers';
import {
  classifyPuzzleSource,
  normalizeSourceText,
  PUZZLE_SOURCES,
  SOURCE_ABBREVIATION_CHARS,
  SOURCE_ALPHANUMERIC,
} from '@shared/puzzle_source';

describe('dayOfWeekExtract', () => {
  it('returns SQL with table alias prefix when alias is provided', () => {
    const sql = dayOfWeekExtract('p');
    expect(sql).toContain("p.content->'info'->>'title'");
    expect(sql).toContain("THEN 'Mon'");
    expect(sql).toContain("THEN 'Sun'");
  });

  it('returns SQL without prefix when alias is empty string', () => {
    const sql = dayOfWeekExtract('');
    expect(sql).toContain("content->'info'->>'title'");
    expect(sql).not.toContain(".content->'info'->>'title'");
  });

  it('uses default empty alias when called with no arguments', () => {
    const sql = dayOfWeekExtract();
    expect(sql).toContain("content->'info'->>'title'");
    expect(sql).not.toContain(".content->'info'->>'title'");
  });

  it('contains all seven days of the week', () => {
    const sql = dayOfWeekExtract('p');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach((day) => {
      expect(sql).toContain(`THEN '${day}'`);
    });
  });

  it('includes ELSE NULL fallback', () => {
    const sql = dayOfWeekExtract('p');
    expect(sql).toContain('ELSE NULL');
  });
});

describe('puzzleDateExtract', () => {
  it('returns SQL with table alias prefix when alias is provided', () => {
    const sql = puzzleDateExtract('p');
    expect(sql).toContain("p.content->'info'->>'title'");
    expect(sql).toContain("p.content->'info'->>'titleOverride'");
  });

  it('returns SQL without table alias prefix when alias is empty', () => {
    const sql = puzzleDateExtract('');
    expect(sql).toContain("content->'info'->>'title'");
    expect(sql).not.toContain(".content->'info'->>'title'");
  });

  it('handles Month Day, Year format', () => {
    const sql = puzzleDateExtract();
    expect(sql).toContain('oct|october');
    expect(sql).toContain('THEN 1000');
  });

  it('includes ELSE NULL fallback for non-dated titles', () => {
    const sql = puzzleDateExtract();
    expect(sql).toContain('ELSE NULL');
  });
});

/**
 * Pulls the `WHEN <text> ~ '<pattern>' THEN '<id>'` arms back out of the
 * generated SQL, so the arms themselves can be executed in JavaScript. This is
 * what keeps the server's CASE and the client's badge from drifting: the SQL
 * carries no pattern of its own, it carries the shared ones.
 */
function armsFrom(sql: string): {id: string; pattern: RegExp}[] {
  return Array.from(sql.matchAll(/~ '([^']+)' THEN '([a-z_]+)'/g)).map(([, pattern, id]) => ({
    id,
    pattern: new RegExp(pattern),
  }));
}

describe('puzzleSourceExtract', () => {
  it('prefixes every column with the table alias when one is given', () => {
    const sql = puzzleSourceExtract('p');
    expect(sql).toContain("p.content->'info'->>'titleOverride'");
    expect(sql).toContain("p.content->'info'->>'title'");
    expect(sql).toContain("p.content->'info'->>'copyright'");
  });

  it('returns SQL without a prefix when the alias is empty', () => {
    expect(puzzleSourceExtract('')).not.toContain(".content->'info'->>'title'");
    expect(puzzleSourceExtract()).not.toContain(".content->'info'->>'title'");
  });

  it('folds the text the same way the client does, and tests it case-sensitively', () => {
    const sql = puzzleSourceExtract('');
    // Same two steps, same order, as normalizeSourceText():
    // drop abbreviation dots, then collapse every other separator to a space.
    expect(sql).toContain('btrim(');
    expect(sql).toContain('lower(');
    expect(sql.indexOf('lower(')).toBeLessThan(sql.indexOf(SOURCE_ALPHANUMERIC));
    // The kept-character set is enumerated, not written as a-z0-9, because a
    // bracket range follows the database collation.
    expect(sql).toContain(`[^${SOURCE_ALPHANUMERIC}]+`);
    expect(sql).not.toContain('a-z0-9');
    // The abbreviation class must survive escaping: ".'’" contains a quote.
    expect(sql).toContain(`'[${SOURCE_ABBREVIATION_CHARS.replace(/'/g, "''")}]'`);
    // Already lowercase, so ~ is enough; ~* would hide a stray capital in a pattern.
    expect(sql).toContain(' ~ ');
    expect(sql).not.toContain('~*');
  });

  it('emits one arm per named publication, in taxonomy order, and never for the catch-all', () => {
    const named = PUZZLE_SOURCES.filter((source) => source.match);
    const sql = puzzleSourceExtract('');
    expect(sql).toContain('ELSE NULL');
    expect(armsFrom(sql).map(({id}) => id)).toEqual(named.map((source) => source.id));
    expect(sql).not.toContain("THEN 'other'");
  });

  // The real check: run the emitted arms, in the emitted order, over the same
  // titles the client classifier sees, and require the same answer.
  it.each([
    'NY Times, Sunday, October 11, 2026 Heart Transplants',
    'L. A. Times, Sun, Oct 11, 2026 - Out of the Question',
    'Guardian (Fri., Oct 9, 2026): Cryptic crossword No 30,133',
    'Cross Atlantic No 1421',
    'The Telwgraph Mini Crossword',
    'Atlantic (Sun., Oct 11, 2026): Sunday, October 11, 2026',
    'Simply Daily Puzzles Quick Crossword',
    'Kinda Sorta',
  ])('classifies "%s" the same way the client badge does', (title) => {
    const arms = armsFrom(puzzleSourceExtract(''));
    const normalised = normalizeSourceText(title);
    const fromSql = arms.find(({pattern}) => pattern.test(normalised))?.id ?? 'other';
    expect(fromSql).toBe(classifyPuzzleSource({title}));
  });
});
