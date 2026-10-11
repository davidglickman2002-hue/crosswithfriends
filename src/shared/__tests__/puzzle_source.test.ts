import {describe, it, expect} from 'vitest';
import {
  classifyPuzzleSource,
  getPuzzleSource,
  normalizeSourceFilter,
  normalizeSourceText,
  OTHER_SOURCE_ID,
  PUZZLE_SOURCES,
  puzzleSourceHaystack,
  SOURCE_ABBREVIATION_CHARS,
  SOURCE_ALPHANUMERIC,
  SOURCE_GROUPS,
  sourceSqlPattern,
} from '../puzzle_source';

// Titles taken verbatim from the live puzzle list (the 500 most recent
// uploads), so a taxonomy change that breaks the real corpus fails here.
const CORPUS: [title: string, copyright: string, expected: string][] = [
  ['NY Times, Sunday, October 11, 2026 Heart Transplants', '', 'nyt'],
  ['NY Times Mini Crossword, Sunday, October 11, 2026 Mini', '', 'nyt'],
  ['NYT Mini Crossword', '', 'nyt'],
  ['The New York Times Crossword', '© 2024 The New York Times', 'nyt'],
  ['NYTimes Crossword', '', 'nyt'],
  ['L. A. Times, Sun, Oct 11, 2026 - Out of the Question', '', 'la_times'],
  ['LA Times, Sunday, October 11, 2026', '', 'la_times'],
  ['Los Angeles Times Mini Crossword', '', 'la_times'],
  ['Guardian (Fri., Oct 9, 2026): Cryptic crossword No 30,133', '', 'guardian'],
  ['Quiptic 1234', '', 'guardian'],
  ['Universal Crossword', '', 'universal'],
  ['Wall Street Journal Crossword', '', 'wsj'],
  ['WSJ Saturday Puzzle', '', 'wsj'],
  ['Newsday Sunday Crossword', '', 'newsday'],
  ['Washington Post Sunday Crossword', '', 'washington_post'],
  ['The New Yorker Crossword', '', 'new_yorker'],
  ['Atlantic (Sun., Oct 11, 2026): Sunday, October 11, 2026', '', 'the_atlantic'],
  ['Simply Daily Puzzles Quick Crossword', '', 'simply_daily'],
  ['Simply Daily Puzzles Cryptic', '', 'simply_daily'],
  ['Puzzmo (Sun., Oct 11, 2026): Quick on the pick-up', '', 'puzzmo'],
  ['Crossword Club (Sun, Oct 11, 2026)', '', 'crossword_club'],
  ['Daily Pop Crossword', '', 'daily_pop'],
  ['Daily Beast Crossword', '', 'daily_beast'],
  ['Vox Crossword', '', 'vox'],
  ['Vulture Crossword', '', 'vulture'],
  ['The Walrus Crossword', '', 'the_walrus'],
  ['Daily Princetonian Crossword', '', 'princetonian'],
  ['Minute Cryptic Mini', '', 'minute_cryptic'],
  ['Apple News+ Mini Crossword', '', 'apple_news'],
  ['USA TODAY Crossword', '', 'usa_today'],
  ['The Times Mephisto No 442', '', 'the_times'],
  ['Times Cryptic Jumbo No 1789', '', 'the_times'],
  ['Sunday Times Cryptic Sunday, Oct 11, 2026 No 5237', '', 'the_times'],
  ['Times Quick Cryptic No 2965', '', 'the_times'],
  ['The Telwgraph Mini Crossword', '', 'telegraph'],
  // Series names that carry the publisher even when the paper is not named.
  ['Toughie Crossword No 2211', '', 'telegraph'],
  ['Herculis No 442', '', 'telegraph'],
  // Publications the live census showed were being filed as "other".
  ['Seattle Times Mini Crossword', '', 'seattle_times'],
  ['SMH Daily Cryptic Crossword', '', 'smh'],
  ['Sydney Morning Herald Cryptic', '', 'smh'],
  ['Boston Globe Mini Crossword', '', 'boston_globe'],
  ['Times GK Crossword No 950', '', 'the_times'],
  ['Times Monthly Club Special', '', 'the_times'],
  ['10/10/26 SATURDAY STUMPER', '', 'newsday'],
  ['October 7, 2026 - "AVCX Classic Themeless #90" - Billy Bratton', '', 'avcx'],
];

describe('classifyPuzzleSource', () => {
  it.each(CORPUS)('classifies %s as %s', (title, copyright, expected) => {
    expect(classifyPuzzleSource({title, copyright})).toBe(expected);
  });

  it('can classify at least one real spelling of every named source', () => {
    // A pattern that no spelling can ever satisfy is dead weight on the server.
    const unmatched = PUZZLE_SOURCES.filter(
      (source) =>
        source.id !== OTHER_SOURCE_ID &&
        !CORPUS.some(([title]) => classifyPuzzleSource({title}) === source.id)
    ).map((source) => source.id);
    expect(unmatched).toEqual([]);
  });

  // The publisher usually lives in titleOverride, not in the raw title: the
  // live corpus carries "Prize Cryptic No 3390" overridden to "The Telegraph
  // Prize Cryptic Sunday, Oct 11, 2026 No 3390".
  it('reads the publisher out of titleOverride, as production uploads do', () => {
    expect(
      classifyPuzzleSource({
        title: 'Prize Cryptic No 3390',
        titleOverride: 'The Telegraph Prize Cryptic Sunday, Oct 11, 2026 No 3390',
      })
    ).toBe('telegraph');
    expect(
      classifyPuzzleSource({
        title: 'Over and Out - Saturday, October 10, 2026',
        titleOverride: 'USA Today - Over and Out - Saturday, October 10, 2026',
      })
    ).toBe('usa_today');
    // Without the override the same title is genuinely unattributable.
    expect(classifyPuzzleSource({title: 'Prize Cryptic No 3390'})).toBe(OTHER_SOURCE_ID);
  });

  // Publishers that only exist as a serial number and a day name carry no
  // signal at all. Bucketing them as "other" is intentional, not a bug.
  it.each([
    ['Cross Atlantic No 1421'],
    ['Prize Cryptic No 1755'],
    ['Quick Crossword No 31362'],
    ['Cryptic Crossword No 31366'],
    ['Mini Cryptic No 741'],
    ['Mini Crossword No 7'],
    ['The Crossword'],
    ['Hard Shell -'],
  ])('leaves the unattributable title %s in the catch-all bucket', (title) => {
    expect(classifyPuzzleSource({title})).toBe(OTHER_SOURCE_ID);
  });

  it('falls back to the catch-all bucket for community uploads', () => {
    expect(classifyPuzzleSource({title: 'My first puzzle'})).toBe(OTHER_SOURCE_ID);
    expect(classifyPuzzleSource({})).toBe(OTHER_SOURCE_ID);
  });

  it('does not match a publication name embedded inside another word', () => {
    // "washingtonposter" must not count as The Washington Post
    expect(classifyPuzzleSource({title: 'washingtonposter fan club'})).toBe(OTHER_SOURCE_ID);
    // but "NYTimes" (no space) is still the same paper as "NY Times"
    expect(classifyPuzzleSource({title: 'NYTimes'})).toBe('nyt');
  });

  it('prefers the New Yorker over the New York Times when both could match', () => {
    expect(classifyPuzzleSource({title: 'The New Yorker Crossword'})).toBe('new_yorker');
  });

  it('start-anchors publications whose name is also a common title word', () => {
    // The real Atlantic title starts with the name ...
    expect(classifyPuzzleSource({title: 'Atlantic Weekly Crossword'})).toBe('the_atlantic');
    // ... whereas "Cross Atlantic" is a Times-family puzzle, not The Atlantic.
    expect(classifyPuzzleSource({title: 'Cross Atlantic No 1421'})).toBe(OTHER_SOURCE_ID);
    expect(classifyPuzzleSource({title: 'Vox Populi'})).toBe('vox');
    expect(classifyPuzzleSource({title: 'A Cross of Vox'})).toBe(OTHER_SOURCE_ID);
  });

  it('classifies on exactly the text the SQL CASE reads', () => {
    // titleOverride wins over title, matching COALESCE(titleOverride, ...).
    expect(classifyPuzzleSource({title: 'Untitled', titleOverride: 'NY Times, Monday', copyright: ''})).toBe(
      'nyt'
    );
    // copyright alone is enough ...
    expect(classifyPuzzleSource({title: 'Sunday Crossword', copyright: '© 2024 The Guardian'})).toBe(
      'guardian'
    );
    // ... a publisher named only in the raw title still counts when a display
    // titleOverride replaces it (4-digit-id uploads do this in production) ...
    expect(
      classifyPuzzleSource({title: 'Times Quick Cryptic No 3427', titleOverride: 'Cryptic No 3427'})
    ).toBe('the_times');
    // ... and author is not in the server's haystack, so it cannot move a
    // puzzle between buckets (the badge must agree with the filter). The cast
    // mirrors reality: the API ships an `author` field we deliberately ignore.
    const withAuthor = {title: 'My puzzle', author: 'The New York Times'} as unknown as {title: string};
    expect(classifyPuzzleSource(withAuthor)).toBe(OTHER_SOURCE_ID);
  });

  it('puts titleOverride first so start-anchored names still line up', () => {
    // The publisher stamp lives in titleOverride, ahead of the generic title.
    expect(
      classifyPuzzleSource({
        title: 'Sunday, October 11, 2026',
        titleOverride: 'Atlantic (Sun., Oct 11, 2026): Sunday',
      })
    ).toBe('the_atlantic');
  });

  it('builds the same haystack shape as the SQL expression', () => {
    expect(puzzleSourceHaystack({title: 'A', copyright: 'B'})).toBe('A B');
    expect(puzzleSourceHaystack({title: 'A', titleOverride: 'C', copyright: 'B'})).toBe('C A B');
    expect(puzzleSourceHaystack({title: 'A'})).toBe('A');
    expect(puzzleSourceHaystack({})).toBe('');
    // undefined fields are skipped rather than producing "undefined"
    expect(puzzleSourceHaystack({titleOverride: 'C'})).toBe('C');
  });
});

// One publication, many spellings. The whole point of normalising the text is
// that these cannot end up in different buckets, which is what would split a
// journal into two chips in the rail.
const VARIANTS: [expected: string, spellings: string[]][] = [
  ['nyt', ['NY Times', 'NYT', 'NYTimes', 'N.Y. Times', 'N. Y. Times', 'New York Times', 'NewYorkTimes']],
  ['la_times', ['LA Times', 'LATimes', 'L.A. Times', 'L. A. Times', 'Los Angeles Times']],
  ['guardian', ['The Guardian', 'Guardian', 'Quiptic']],
  ['universal', ['Universal Crossword', 'Andrews McMeel Universal', 'uclick']],
  ['wsj', ['WSJ', 'The Wall Street Journal', 'Wall Street Journal']],
  ['washington_post', ['Washington Post', 'Wash Post', 'WaPo']],
  ['new_yorker', ['The New Yorker', 'New Yorker', 'NewYorker']],
  ['the_atlantic', ['Atlantic Crossword', 'The Atlantic Crossword']],
  ['the_times', ['The Times', 'Times Cryptic No 1234', 'Sunday Times Cryptic No 5237']],
  ['telegraph', ['The Telegraph', 'The Telwgraph Mini Crossword']],
  ['usa_today', ['USA Today', 'USA TODAY', 'USAToday']],
  ['crossword_club', ['Crossword Club', 'CrosswordClub']],
  ['avcx', ['AVCX', 'AV Club', 'A.V. Club', 'A. V. Club']],
  ['vox', ['Vox Crossword', 'The Vox Crossword']],
  ['minute_cryptic', ['Minute Cryptic Mini', 'Minute Cryptic']],
  ['apple_news', ['Apple News+ Mini', 'Apple News Crossword']],
];

describe('name variants', () => {
  it.each(VARIANTS)('buckets every spelling of %s into one source', (expected, spellings) => {
    for (const spelling of spellings) {
      expect(classifyPuzzleSource({title: spelling}), spelling).toBe(expected);
    }
  });

  it('folds a spelling difference down to one normalised key', () => {
    // This is the mechanism behind the grouping above: compare what the
    // classification actually sees, not the raw text.
    const keys = new Set(
      ['NY Times', 'N.Y. Times', 'NYTimes', 'New York Times'].map((t) => normalizeSourceText(t))
    );
    // "NY Times"/"N.Y. Times" fold together; "NYTimes" and "New York Times" do
    // not, which is exactly why the pattern lists all of them.
    expect([...keys]).toEqual(['ny times', 'nytimes', 'new york times']);
  });

  it('is case-insensitive, which is what makes a rename survive', () => {
    for (const spelling of ['ny times', 'Ny Times', 'NY TIMES', 'NyTiMeS']) {
      expect(classifyPuzzleSource({title: spelling}), spelling).toBe('nyt');
    }
  });
});

describe('normalizeSourceText', () => {
  it('lowercases, drops abbreviation dots and collapses separators', () => {
    expect(normalizeSourceText('N.Y. Times')).toBe('ny times');
    expect(normalizeSourceText('L.A. Times!')).toBe('la times');
    expect(normalizeSourceText('  NYTimes  ')).toBe('nytimes');
    expect(normalizeSourceText('A.V. Club')).toBe('av club');
    expect(normalizeSourceText('Cross Atlantic No 1421')).toBe('cross atlantic no 1421');
    expect(normalizeSourceText('10/10/26 SATURDAY STUMPER')).toBe('10 10 26 saturday stumper');
  });

  it('produces an empty string for empty or punctuation-only input', () => {
    expect(normalizeSourceText('')).toBe('');
    expect(normalizeSourceText('   ---   ')).toBe('');
    expect(normalizeSourceText('.')).toBe('');
  });

  it('keeps digits, so serial-numbered titles stay distinguishable', () => {
    expect(normalizeSourceText('Toughie No 2211')).toBe('toughie no 2211');
  });
});

describe('normalizeSourceFilter', () => {
  it('treats empty, missing and "all" as no restriction', () => {
    expect(normalizeSourceFilter(undefined)).toEqual([]);
    expect(normalizeSourceFilter('')).toEqual([]);
    expect(normalizeSourceFilter('all')).toEqual([]);
  });

  it('accepts a single id, a comma list and an array', () => {
    expect(normalizeSourceFilter('nyt')).toEqual(['nyt']);
    expect(normalizeSourceFilter('nyt,la_times')).toEqual(['nyt', 'la_times']);
    expect(normalizeSourceFilter(['nyt', 'la_times'])).toEqual(['nyt', 'la_times']);
  });

  it('drops unknown ids and de-duplicates', () => {
    expect(normalizeSourceFilter('nyt,nope,nyt')).toEqual(['nyt']);
    expect(normalizeSourceFilter('nope')).toEqual([]);
  });

  it('returns ids in taxonomy order regardless of input order', () => {
    expect(normalizeSourceFilter('la_times,nyt')).toEqual(['nyt', 'la_times']);
  });

  it('is case and whitespace insensitive', () => {
    expect(normalizeSourceFilter(' NYT , la_TIMES ')).toEqual(['nyt', 'la_times']);
  });
});

describe('source taxonomy', () => {
  it('has a unique id for every source', () => {
    const ids = PUZZLE_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only leaves the catch-all bucket without a SQL pattern', () => {
    const withoutPattern = PUZZLE_SOURCES.filter((s) => !sourceSqlPattern(s.id)).map((s) => s.id);
    expect(withoutPattern).toEqual([OTHER_SOURCE_ID]);
  });

  it('spells word boundaries in a way Postgres and JavaScript both understand', () => {
    for (const source of PUZZLE_SOURCES) {
      const pattern = sourceSqlPattern(source.id);
      if (!pattern) continue;
      // \b and \m/\M are not portable across the two engines
      expect(pattern).not.toMatch(/\\[bmM]/);
      // No locale-dependent character classes either: because the haystack is
      // normalised, a "word boundary" is just a space.
      expect(pattern).not.toContain('[^a-z]');
      expect(pattern.startsWith('(^| )') || pattern.startsWith('^(')).toBe(true);
      expect(pattern.endsWith('( |$)')).toBe(true);
    }
  });

  it('writes every pattern in the normalised alphabet', () => {
    for (const source of PUZZLE_SOURCES) {
      if (!source.match) continue;
      // lowercase, and no punctuation that normalisation would strip
      expect(source.match, source.id).toBe(source.match.toLowerCase());
      expect(source.match, source.id).not.toMatch(/[.'’]/);
    }
  });

  it('keeps the catch-all last so chips and CASE arms agree on priority', () => {
    expect(PUZZLE_SOURCES[PUZZLE_SOURCES.length - 1].id).toBe(OTHER_SOURCE_ID);
  });

  it('has a primary rail that covers the publications a solver expects', () => {
    const primary = PUZZLE_SOURCES.filter((s) => s.primary).map((s) => s.id);
    expect(primary).toEqual([
      'nyt',
      'la_times',
      'guardian',
      'universal',
      'wsj',
      'newsday',
      'washington_post',
      'new_yorker',
      'the_atlantic',
    ]);
    // Anything not in the default row must still be reachable from the tray.
    expect(PUZZLE_SOURCES.length).toBeGreaterThan(primary.length + 5);
  });

  it('exposes full names for tooltips', () => {
    expect(getPuzzleSource('nyt')?.fullName).toBe('The New York Times');
    expect(getPuzzleSource('nope')).toBeUndefined();
  });

  it('exports the exact character sets the SQL mirror is built from', () => {
    expect(SOURCE_ABBREVIATION_CHARS).toBe(".'’");
    expect(SOURCE_ALPHANUMERIC).toBe('abcdefghijklmnopqrstuvwxyz0123456789');
    // Spelled out rather than as a range: a Postgres bracket range follows the
    // database collation, so `a-z0-9` is not guaranteed to mean the same set.
    expect(SOURCE_ALPHANUMERIC).not.toContain('-');
  });
});

describe('source groups', () => {
  it('assigns every source to a declared group', () => {
    const groupIds = SOURCE_GROUPS.map((g) => g.id);
    for (const source of PUZZLE_SOURCES) {
      expect(groupIds, `${source.id} has group ${source.group}`).toContain(source.group);
    }
  });

  it('declares the groups in display order', () => {
    expect(SOURCE_GROUPS.map((g) => g.id)).toEqual(['newspapers', 'syndicated', 'independent', 'other']);
  });

  it('keeps the catch-all in a group of its own', () => {
    const inCatchAllGroup = PUZZLE_SOURCES.filter((s) => s.group === 'other').map((s) => s.id);
    expect(inCatchAllGroup).toEqual([OTHER_SOURCE_ID]);
  });

  it('leaves no group empty', () => {
    for (const group of SOURCE_GROUPS) {
      expect(
        PUZZLE_SOURCES.some((s) => s.group === group.id),
        `${group.id} is empty`
      ).toBe(true);
    }
  });
});
