/**
 * Puzzle "source" (publication) taxonomy.
 *
 * The database has no dedicated source column, so a puzzle's publication is
 * inferred from the text a .puz/.ipuz file already carries: its title, its
 * `titleOverride` (where uploaders usually stamp the paper) and its copyright
 * string. This is the same technique `dayOfWeekExtract` in
 * `server/model/sql_helpers.ts` uses for day-of-week.
 *
 * ## Two engines, one pattern language
 *
 * The SQL CASE and the client badge MUST agree, so both consume the exact same
 * strings. Patterns are therefore written in the POSIX-ERE / JavaScript regex
 * intersection:
 *   - Postgres: `text ~ '<pattern>'`
 *   - Browser:  `new RegExp(pattern)`
 * That rules out `\b` (Postgres has no word-boundary escape) and `\m`/`\M`
 * (JavaScript has no such escape). Boundaries are spelled out as `(^| )` /
 * `( |$)` instead.
 *
 * ## Name variants are handled by normalising, not by enumerating
 *
 * "NY Times", "NYTimes", "N.Y. Times" and "New York Times" are the same
 * publication, and uploads use all of them (plus typos — the live corpus really
 * does contain "The Telwgraph"). Enumerating every spelling is a losing game,
 * so `normalizeSourceText` folds the text first: lowercase, drop abbreviation
 * punctuation, collapse every other separator to a single space. Patterns are
 * then written once, in lowercase, with no punctuation at all:
 *
 *     "N.Y. Times"   -> "ny times"      -> matches `ny times`
 *     "NYTimes"      -> "nytimes"       -> matches `nytimes`
 *     "New York Times" -> "new york times" -> matches `new york times`
 *
 * `server/model/sql_helpers.ts` builds its Postgres equivalent from the same
 * exported constant, so the two normalisations cannot drift apart.
 *
 * ## What the corpus actually looks like
 *
 * Verified against a live census of the production `puzzle_list` API. Titles
 * look like "NY Times, Sunday, October 11, 2026 …", "L. A. Times, Sun, Oct 11,
 * 2026 …" and "Atlantic (Sun., Oct 11, 2026): …". Many Times/Telegraph-family
 * puzzles ("Prize Cryptic No 1755", "Quick Crossword No 31362") carry no
 * publisher text at all in any field and legitimately fall into `other`;
 * guessing their owner would be worse than leaving them unlabelled.
 */

export interface PuzzleSourceDef {
  /** Stable id used in URLs, filter params and badges. */
  id: string;
  /** Short label for chips and badges, e.g. "NY Times". */
  label: string;
  /** Full name for tooltips. */
  fullName: string;
  /** Publication homepage, if there is one worth linking. */
  url?: string;
  /**
   * Bare alternation, written in NORMALISED form (lowercase, no punctuation,
   * space-separated). Matched against the output of `normalizeSourceText`.
   */
  match: string;
  /** Which section of the journal tray this publication belongs to. */
  group: SourceGroupId;
  /** Shown in the always-visible rail row instead of the "More journals" tray. */
  primary?: boolean;
  /**
   * Anchor the match to the start of the haystack. Needed where a publication
   * name is also a common word inside other puzzles' titles: a bounded
   * `atlantic` would match "Cross Atlantic No 1421" (a Times puzzle), while
   * the real form is the title-initial "Atlantic (Sun., Oct 11, 2026): …".
   */
  anchorStart?: boolean;
}

export type SourceGroupId = 'newspapers' | 'syndicated' | 'independent' | 'other';

/** Tray section order and headings. */
export const SOURCE_GROUPS: {id: SourceGroupId; label: string}[] = [
  {id: 'newspapers', label: 'Newspapers'},
  {id: 'syndicated', label: 'Syndicated & apps'},
  {id: 'independent', label: 'Independent & campus'},
  {id: 'other', label: 'Everything else'},
];

/**
 * Punctuation that is dropped outright before matching, rather than treated as
 * a separator. It only ever appears inside abbreviations — "N.Y. Times",
 * "A.V. Club" — where removing it recovers the name everyone else writes
 * without dots.
 */
export const SOURCE_ABBREVIATION_CHARS = ".'’";

/**
 * Characters kept verbatim by normalisation. Spelled out rather than written as
 * the range `a-z0-9`, because Postgres bracket ranges follow the database
 * collation rather than ASCII, so `[^a-z0-9]` is not guaranteed to be the same
 * set as the JavaScript one. The SQL mirror in `server/model/sql_helpers.ts` is
 * built from this exact string.
 */
export const SOURCE_ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

const ABBREVIATION_RE = new RegExp(`[${SOURCE_ABBREVIATION_CHARS}]`, 'g');
const SEPARATOR_RE = new RegExp(`[^${SOURCE_ALPHANUMERIC}]+`, 'g');

/**
 * Folds publication text into a canonical, comparable form: lowercase, minus
 * abbreviation punctuation, with every other run of separators collapsed to a
 * single space.
 *
 * The Postgres mirror in `server/model/sql_helpers.ts` must produce byte-equal
 * output for the same input; `puzzle_source.test.ts` asserts the two use the
 * same character classes.
 */
export function normalizeSourceText(text: string): string {
  return text.toLowerCase().replace(ABBREVIATION_RE, '').replace(SEPARATOR_RE, ' ').trim();
}

/**
 * Wraps a bare alternation in engine-portable word boundaries.
 *
 * Because `normalizeSourceText` reduces every separator to a single space, a
 * "word" boundary is just a space or the end of the string — which both
 * engines spell the same way, with no locale-dependent character class.
 */
export function buildSourcePattern(def: PuzzleSourceDef): string {
  if (!def.match) return '';
  return def.anchorStart ? `^(${def.match})( |$)` : `(^| )(${def.match})( |$)`;
}

/**
 * Ordered, most-specific-first. Order matters twice over: it is the
 * classification priority (first match wins) and the order the chips render in.
 * `primary` sources make up the default rail row; the rest live behind
 * "More journals", sectioned by `group`.
 */
export const PUZZLE_SOURCES: PuzzleSourceDef[] = [
  {
    id: 'nyt',
    label: 'NY Times',
    fullName: 'The New York Times',
    url: 'https://www.nytimes.com/crosswords',
    // Covers "NY Times", "N.Y. Times", "N. Y. Times", "NYTimes", "New York
    // Times" and "NewYorkTimes" after normalisation, in Mini and full-size
    // titles alike. The spaced form is listed because dropping the dots from
    // "N. Y. Times" leaves a space behind, not an adjacency.
    match: 'nyt|nytimes|ny times|n y times|new york times|newyorktimes',
    group: 'newspapers',
    primary: true,
  },
  {
    id: 'la_times',
    label: 'LA Times',
    fullName: 'Los Angeles Times',
    url: 'https://www.latimes.com/games/daily-crossword',
    // "LA Times", "L.A. Times" and "L. A. Times" all normalise to "la times"
    // or "l a times"; both are listed for the same reason as `nyt` above.
    match: 'la times|l a times|latimes|los angeles times|los angeles daily',
    group: 'newspapers',
    primary: true,
  },
  {
    id: 'guardian',
    label: 'The Guardian',
    fullName: 'The Guardian',
    url: 'https://www.theguardian.com/crosswords',
    match: 'guardian|quiptic',
    group: 'newspapers',
    primary: true,
  },
  {
    id: 'universal',
    label: 'Universal',
    fullName: 'Universal Crossword (Andrews McMeel)',
    url: 'https://www.amuniversal.com/ups/',
    match: 'universal|andrews mcmeel|uclick',
    group: 'syndicated',
    primary: true,
  },
  {
    id: 'wsj',
    label: 'WSJ',
    fullName: 'The Wall Street Journal',
    url: 'https://www.wsj.com/news/puzzle',
    match: 'wsj|wall street journal',
    group: 'newspapers',
    primary: true,
  },
  {
    id: 'newsday',
    label: 'Newsday',
    fullName: 'Newsday',
    url: 'https://www.newsday.com/games',
    match: 'newsday|saturday stumper',
    group: 'newspapers',
    primary: true,
  },
  {
    id: 'washington_post',
    label: 'Washington Post',
    fullName: 'The Washington Post',
    url: 'https://www.washingtonpost.com/puzzles/',
    match: 'washington post|wash post|washpost|wapo',
    group: 'newspapers',
    primary: true,
  },
  {
    id: 'new_yorker',
    label: 'New Yorker',
    fullName: 'The New Yorker',
    url: 'https://www.newyorker.com/puzzles-and-games-dept/crossword',
    match: 'new yorker|newyorker',
    group: 'newspapers',
    primary: true,
  },
  {
    id: 'the_atlantic',
    label: 'The Atlantic',
    fullName: 'The Atlantic',
    url: 'https://www.theatlantic.com/newsletters/article/crossword-puzzle/',
    // Start-anchored: "Cross Atlantic No 1421" is a Times-family puzzle.
    match: 'atlantic|the atlantic',
    group: 'newspapers',
    anchorStart: true,
    primary: true,
  },
  {
    id: 'the_times',
    label: 'The Times (UK)',
    fullName: 'The Times of London',
    match:
      'times cryptic|times concise|times jumbo|times quick|times mephisto|times general knowledge|times gk|times monthly club|sunday times|the times',
    group: 'newspapers',
  },
  {
    id: 'telegraph',
    label: 'The Telegraph',
    fullName: 'The Daily Telegraph',
    // "telwgraph" is a real spelling in the corpus, not a typo of mine.
    // "Toughie" and "Herculis" are the Telegraph's own series names, which is
    // the same kind of signal as `quiptic` for The Guardian: several of those
    // uploads carry no publisher text at all, so the series name is all there
    // is to group them by.
    match: 'telegraph|telwgraph|toughie|herculis',
    group: 'newspapers',
  },
  {
    id: 'usa_today',
    label: 'USA Today',
    fullName: 'USA Today',
    url: 'https://games.usatoday.com/games/uclick-crossword',
    match: 'usa today|usatoday',
    group: 'newspapers',
  },
  {
    id: 'seattle_times',
    label: 'Seattle Times',
    fullName: 'The Seattle Times',
    match: 'seattle times',
    group: 'newspapers',
  },
  {
    id: 'smh',
    label: 'SMH',
    fullName: 'The Sydney Morning Herald',
    match: 'sydney morning herald|smh',
    group: 'newspapers',
  },
  {
    id: 'boston_globe',
    label: 'Boston Globe',
    fullName: 'The Boston Globe',
    match: 'boston globe',
    group: 'newspapers',
  },
  {
    id: 'simply_daily',
    label: 'Simply Daily',
    fullName: 'Simply Daily Puzzles',
    match: 'simply daily',
    group: 'syndicated',
  },
  {
    id: 'puzzmo',
    label: 'Puzzmo',
    fullName: 'Puzzmo',
    url: 'https://www.puzzmo.com/',
    match: 'puzzmo',
    group: 'syndicated',
  },
  {
    id: 'crossword_club',
    label: 'Crossword Club',
    fullName: 'Crossword Club',
    url: 'https://www.crosswordclub.com/',
    match: 'crossword club|crosswordclub',
    group: 'syndicated',
  },
  {
    id: 'daily_pop',
    label: 'Daily Pop',
    fullName: 'Daily Pop Crossword',
    match: 'daily pop',
    group: 'syndicated',
  },
  {
    id: 'daily_beast',
    label: 'Daily Beast',
    fullName: 'The Daily Beast',
    match: 'daily beast',
    group: 'syndicated',
  },
  {
    id: 'avcx',
    label: 'AVCX',
    fullName: 'The A.V. Club Crossword',
    url: 'https://avclub.com/crossword',
    // "A.V. Club", "AV Club" and "A. V. Club" all normalise to "av club".
    match: 'avcx|av club|a v club',
    group: 'independent',
  },
  {
    id: 'vox',
    label: 'Vox',
    fullName: 'Vox',
    // Start-anchored so a title that merely contains the word "vox" is not a hit.
    match: 'vox|the vox',
    group: 'independent',
    anchorStart: true,
  },
  {
    id: 'vulture',
    label: 'Vulture',
    fullName: 'Vulture',
    match: 'vulture',
    group: 'independent',
  },
  {
    id: 'the_walrus',
    label: 'The Walrus',
    fullName: 'The Walrus',
    match: 'walrus',
    group: 'independent',
  },
  {
    id: 'princetonian',
    label: 'Princetonian',
    fullName: 'The Daily Princetonian',
    match: 'princetonian',
    group: 'independent',
  },
  {
    id: 'minute_cryptic',
    label: 'Minute Cryptic',
    fullName: 'Minute Cryptic',
    match: 'minute cryptic',
    group: 'syndicated',
  },
  {
    id: 'apple_news',
    label: 'Apple News+',
    fullName: 'Apple News+',
    match: 'apple news',
    group: 'syndicated',
  },
  {
    id: 'other',
    label: 'Other sources',
    fullName: 'Independent, community and other uploads',
    match: '',
    group: 'other',
  },
];

/** Id of the catch-all bucket: puzzles matching no known publication. */
export const OTHER_SOURCE_ID = 'other';

/**
 * Sentinel meaning "no source restriction" — the chips' "All journals" option.
 * Also accepted by the server as an empty string, so old or hand-written URLs
 * stay valid.
 */
export const ALL_SOURCES = 'all';

/** Every id a client is allowed to ask for, in first-match order. */
const KNOWN_SOURCE_IDS = PUZZLE_SOURCES.map((s) => s.id);

/**
 * The text a puzzle is classified on, spelled exactly like the SQL expression
 * in `server/model/sql_helpers.ts`:
 *   COALESCE(titleOverride,'') || ' ' || COALESCE(title,'') || ' ' || COALESCE(copyright,'')
 *
 * `titleOverride` is first because that is where the publisher is usually
 * stamped in practice — the live corpus carries titles like "Prize Cryptic No
 * 3390" with `titleOverride: "The Telegraph Prize Cryptic Sunday, Oct 11, 2026
 * No 3390"`, and "Over and Out - Saturday, October 10, 2026" with
 * `titleOverride: "USA Today - Over and Out - …"`. The raw title is appended
 * rather than replaced so a publication named in only one of the two fields is
 * still found. Order matters for the start-anchored patterns below: the
 * publication name has to be able to appear at the very front of the haystack.
 *
 * `author` is deliberately excluded — it is not in the server's haystack, and
 * including it would let a badge disagree with the filter that selected the row.
 */
export function puzzleSourceHaystack(info: {
  title?: string;
  titleOverride?: string;
  copyright?: string;
}): string {
  return [info.titleOverride, info.title, info.copyright].filter(Boolean).join(' ');
}

/** The normalised haystack both engines actually match against. */
export function puzzleSourceSearchText(info: {
  title?: string;
  titleOverride?: string;
  copyright?: string;
}): string {
  return normalizeSourceText(puzzleSourceHaystack(info));
}

// Compiled once at module load. `other` has no pattern and is handled by the
// caller (it is the complement of every other pattern). No `i` flag: the
// haystack is normalised to lowercase first, exactly as the SQL side does.
const COMPILED: {id: string; regex: RegExp}[] = PUZZLE_SOURCES.filter((s) => s.match).map((s) => ({
  id: s.id,
  regex: new RegExp(buildSourcePattern(s)),
}));

/**
 * Classifies a puzzle by the text it carries. Returns a source id from
 * PUZZLE_SOURCES, falling back to OTHER_SOURCE_ID.
 */
export function classifyPuzzleSource(info: {
  title?: string;
  titleOverride?: string;
  copyright?: string;
}): string {
  const haystack = puzzleSourceSearchText(info);
  if (!haystack) return OTHER_SOURCE_ID;
  for (const {id, regex} of COMPILED) {
    if (regex.test(haystack)) return id;
  }
  return OTHER_SOURCE_ID;
}

export function getPuzzleSource(id: string | undefined | null): PuzzleSourceDef | undefined {
  if (!id) return undefined;
  return PUZZLE_SOURCES.find((s) => s.id === id);
}

/**
 * Normalises a raw `sourceFilter` value (URL param, query string, or API
 * payload) into an ordered, de-duplicated list of known source ids.
 * An empty result means "all sources" — no restriction.
 */
export function normalizeSourceFilter(raw: unknown): string[] {
  if (typeof raw !== 'string' && !Array.isArray(raw)) return [];
  const parts = (Array.isArray(raw) ? raw : raw.split(','))
    .map((p) => String(p).trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const part of parts) {
    if (part === ALL_SOURCES) return [];
    if (KNOWN_SOURCE_IDS.includes(part)) seen.add(part);
  }
  return KNOWN_SOURCE_IDS.filter((id) => seen.has(id));
}

/**
 * The POSIX-ERE pattern that matches `id`, ready for a Postgres `~` test
 * against the normalised haystack. Returns null for ids with no pattern
 * (i.e. `other`).
 */
export function sourceSqlPattern(id: string): string | null {
  const def = getPuzzleSource(id);
  return def ? buildSourcePattern(def) || null : null;
}
