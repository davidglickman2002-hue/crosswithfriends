import {describe, it, expect} from 'vitest';
import {comparePuzzleDates, extractPuzzleDate} from '../puzzle_date';

describe('extractPuzzleDate', () => {
  it('extracts date from NY Times title with full month name', () => {
    expect(extractPuzzleDate('NY Times, Monday, October 19, 2026 Bottom Lines')).toBe(20261019);
    expect(extractPuzzleDate('NY Times, Sunday, October 18, 2026 Withheld Payments')).toBe(20261018);
    expect(extractPuzzleDate('NY Times, Saturday, October 17, 2026 Purple Prose')).toBe(20261017);
  });

  it('extracts date from abbreviated month name with period', () => {
    expect(extractPuzzleDate('Puzzmo (Mon., Oct 19, 2026): Thanks for "dropping in"')).toBe(20261019);
    expect(extractPuzzleDate('L. A. Times, Sun, Oct 18, 2026 - "CALIFORNIA SCHEMIN\'"')).toBe(20261018);
    expect(extractPuzzleDate('Daily Beast: After All These Years, Tues. Oct. 13, 2026')).toBe(20261013);
  });

  it('extracts date from titleOverride or title object', () => {
    expect(
      extractPuzzleDate({
        title: 'Purple Prose',
        titleOverride: 'NY Times Midi, Saturday, October 17, 2026 Purple Prose',
      })
    ).toBe(20261017);
  });

  it('extracts date when title has ordinal suffix (e.g. 19th)', () => {
    expect(extractPuzzleDate('October 19th, 2026 - Special Crossword')).toBe(20261019);
    expect(extractPuzzleDate('19th October 2026 Crossword')).toBe(20261019);
  });

  it('extracts ISO dates', () => {
    expect(extractPuzzleDate('Daily Puzzle 2026-10-19')).toBe(20261019);
  });

  it('extracts slash dates', () => {
    expect(extractPuzzleDate('Crossword 10/19/2026')).toBe(20261019);
    expect(extractPuzzleDate('Crossword 10/19/26')).toBe(20261019);
  });

  it('returns null for undated titles', () => {
    expect(extractPuzzleDate('Untitled Crossword')).toBeNull();
    expect(extractPuzzleDate('Most Ornery Crossword - Wild Clue Yonder Hard Clues')).toBeNull();
    expect(extractPuzzleDate(null)).toBeNull();
    expect(extractPuzzleDate(undefined)).toBeNull();
    expect(extractPuzzleDate('')).toBeNull();
  });

  it('correctly orders October 19 before October 17 and 18', () => {
    const oct19 = extractPuzzleDate('NY Times Midi, Monday, October 19, 2026 Bottom Lines')!;
    const oct18 = extractPuzzleDate('NY Times Midi, Sunday, October 18, 2026 Withheld Payments')!;
    const oct17 = extractPuzzleDate('NY Times Midi, Saturday, October 17, 2026 Purple Prose')!;

    expect(oct19).toBeGreaterThan(oct18);
    expect(oct18).toBeGreaterThan(oct17);
  });
});

describe('comparePuzzleDates', () => {
  it('places October 19 before October 17 and 18 even when October 19 has lower PID', () => {
    const p19 = {
      pid: '100013866',
      info: {titleOverride: 'NY Times Midi, Monday, October 19, 2026 Bottom Lines'},
    };
    const p18 = {
      pid: '100013871',
      info: {titleOverride: 'NY Times Midi, Sunday, October 18, 2026 Withheld Payments'},
    };
    const p17 = {
      pid: '100013870',
      info: {titleOverride: 'NY Times Midi, Saturday, October 17, 2026 Purple Prose'},
    };

    const list = [p17, p18, p19];
    list.sort(comparePuzzleDates);

    expect(list.map((p) => p.pid)).toEqual(['100013866', '100013871', '100013870']);
  });

  it('uses PID descending as tie breaker when dates match', () => {
    const a = {pid: '100', date: 20261019};
    const b = {pid: '200', date: 20261019};
    const list = [a, b];
    list.sort(comparePuzzleDates);
    expect(list.map((p) => p.pid)).toEqual(['200', '100']);
  });

  it('places dated puzzles before undated puzzles', () => {
    const dated = {pid: '1', date: 20261019};
    const undated = {pid: '999999', date: null};
    const list = [undated, dated];
    list.sort(comparePuzzleDates);
    expect(list.map((p) => p.pid)).toEqual(['1', '999999']);
  });
});
