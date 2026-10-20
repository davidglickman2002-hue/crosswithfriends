import * as Sentry from '@sentry/react';
import _ from 'lodash';
import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {PuzzleJson, PuzzleStatsJson, ListPuzzleRequestFilters} from '../../shared/types';
import {fetchPuzzleList} from '../../api/puzzle_list';
import {getUserStats} from '../../api/user_stats';
import {fetchGuestPuzzleStatuses} from '../../api/user_games';
import getLocalId from '../../localAuth';
import AuthContext from '../../lib/AuthContext';
import './css/puzzleList.css';
import Entry, {EntryProps} from './Entry';
import {classifyPuzzleSource, normalizeSourceFilter} from '../../shared/puzzle_source';
import {comparePuzzleDates, extractPuzzleDate} from '../../shared/puzzle_date';

interface PuzzleStatuses {
  [pid: string]: 'solved' | 'started';
}
interface NewPuzzleListProps {
  filter: ListPuzzleRequestFilters;
  statusFilter: {
    Complete: boolean;
    'In progress': boolean;
    New: boolean;
  };
  puzzleStatuses: PuzzleStatuses;
  uploadedPuzzles: number;
  fencing?: boolean;
}

// A narrow filter (one journal, one size) can match only a handful of the
// newest fifty puzzles, which would look like a broken, almost-empty list.
// When that happens we keep pulling pages until the list has something to
// scroll, up to a bound so a truly empty filter cannot spin forever.
const MIN_VISIBLE_ENTRIES = 12;
const AUTO_FILL_MAX_PAGES = 8;

const NewPuzzleList: React.FC<NewPuzzleListProps> = (props) => {
  const {accessToken, user, preferences} = useContext(AuthContext) as {
    accessToken: string | null;
    user: {id: string} | null;
    preferences: {zenMode?: boolean} | null;
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch puzzle statuses from PostgreSQL (with localStorage cache for instant rendering)
  const statusCacheKey = user?.id ? `puzzleStatuses:${user.id}` : 'puzzleStatuses:guest';
  const [pgStatuses, setPgStatuses] = useState<PuzzleStatuses>({});
  useEffect(() => {
    // Immediately load cached statuses for this user/guest key
    try {
      const cached = localStorage.getItem(statusCacheKey);
      if (cached) setPgStatuses(JSON.parse(cached));
    } catch {
      // ignore
    }
    let stale = false;
    const updateStatuses = (statuses: PuzzleStatuses) => {
      if (stale) return;
      setPgStatuses(statuses);
      try {
        localStorage.setItem(statusCacheKey, JSON.stringify(statuses));
      } catch {
        // localStorage full or unavailable — ignore
      }
    };
    if (user?.id && accessToken) {
      // Authenticated: fetch from user stats endpoint
      getUserStats(user.id, accessToken)
        .then((stats) => {
          if (stale || !stats) return;
          // If the server couldn't produce solvedPids (transient failure), skip
          // the status update entirely. Falling through with an empty solved
          // set would persist authoritative-looking "no solves" data to
          // localStorage and the user would lose their Complete badges until
          // the next successful fetch.
          if (stats.solvedPids === undefined) return;
          const statuses: PuzzleStatuses = {};
          // Apply snapshot-based statuses first (fallback from game_snapshots)
          if (stats.snapshotStatuses) {
            Object.assign(statuses, stats.snapshotStatuses);
          }
          // Overlay in-progress (only if not already marked)
          (stats.inProgress || []).forEach((item) => {
            if (!statuses[item.pid]) statuses[item.pid] = 'started';
          });
          // Overlay solved from puzzle_solves (highest priority). solvedPids is
          // the full distinct-pid set; history is capped and was silently
          // dropping the Complete badge for users with many solves.
          stats.solvedPids.forEach((pid) => {
            statuses[pid] = 'solved';
          });
          updateStatuses(statuses);
        })
        .catch((err: unknown) => console.warn('Failed to fetch user stats:', err));
    } else {
      // Guest: fetch by dfac_id
      const dfacId = getLocalId();
      fetchGuestPuzzleStatuses(dfacId)
        .then((statuses) => {
          if (stale) return;
          updateStatuses(statuses);
        })
        .catch((err: unknown) => console.warn('Failed to fetch guest puzzle statuses:', err));
    }
    return () => {
      stale = true;
    };
  }, [user?.id, accessToken, statusCacheKey]);
  const [fullyLoaded, setFullyLoaded] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const pageSize = 50;
  const [puzzles, setPuzzles] = useState<
    {
      pid: string;
      content: PuzzleJson;
      stats: PuzzleStatsJson;
      isPublic?: boolean;
    }[]
  >([]);
  const fullyScrolled = useCallback((): boolean => {
    if (!containerRef.current) return false;
    const {scrollTop, scrollHeight, clientHeight} = containerRef.current;
    const buffer = 600; // 600 pixels of buffer, i guess?
    return scrollTop + clientHeight + buffer > scrollHeight;
  }, []);

  // Identity of the active filter: which puzzle list is on screen, and a token
  // that invalidates responses from a filter that has since been superseded.
  const filterKey = JSON.stringify(props.filter);
  const generationRef = useRef(0);
  const autoFillPagesRef = useRef(0);
  const inFlightRef = useRef(0);
  const reloadKeyRef = useRef<string | null>(null);
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);
  const [pendingFilterKey, setPendingFilterKey] = useState<string>(filterKey);

  // filterKey already carries every filter field, so it stands in for
  // props.filter in the dependency list below.
  const performFetch = React.useCallback(
    async (
      currentPuzzles: {
        pid: string;
        content: PuzzleJson;
        stats: PuzzleStatsJson;
        isPublic?: boolean;
      }[],
      currentPage: number,
      options?: {reload?: boolean}
    ) => {
      const reload = options?.reload === true;
      // Appending has to wait for the pages before it. A reload does not: it is
      // for a brand new filter, and whatever is in flight is discarded below.
      if (!reload && inFlightRef.current > 0) return;
      if (reload) {
        if (reloadKeyRef.current === filterKey && inFlightRef.current > 0) return;
        reloadKeyRef.current = filterKey;
      }
      const generation = generationRef.current;
      inFlightRef.current += 1;
      setLoading(true);
      try {
        setError(null);
        const nextPage = await fetchPuzzleList(
          {page: currentPage, pageSize, filter: props.filter},
          accessToken
        );
        // A filter change while this request was in flight means the answer
        // belongs to a list nobody is looking at any more.
        if (generation !== generationRef.current) return;
        if (reload) {
          setPuzzles(nextPage.puzzles);
          setLoadedFilterKey(filterKey);
        } else {
          setPuzzles([...currentPuzzles, ...nextPage.puzzles]);
        }
        setPage(currentPage + 1);
        setFullyLoaded(_.size(nextPage.puzzles) < pageSize);
      } catch (err) {
        Sentry.captureException(err);
        setError(
          import.meta.env.VITE_MAINTENANCE_MESSAGE ||
            'Cross with Friends backend is currently unavailable. Please try again later.'
        );
      } finally {
        inFlightRef.current -= 1;
        if (inFlightRef.current === 0) {
          setLoading(false);
          reloadKeyRef.current = null;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, accessToken]
  );

  // Scroll and auto-fill appends are throttled, but the reload that follows a
  // filter change deliberately is not: going through the throttle is what used
  // to make a filter change get swallowed while another page was loading.
  const fetchMore = React.useMemo(() => _.throttle(performFetch, 500, {trailing: true}), [performFetch]);

  useEffect(() => {
    generationRef.current += 1;
    autoFillPagesRef.current = 0;
    // Force the effect below to load the list again: the filter changed, or the
    // signed-in account did, which can change which puzzles are visible.
    setPendingFilterKey(filterKey);
    setLoadedFilterKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, props.uploadedPuzzles, !!accessToken]);

  // Loading the first page of the current filter is separate from the effect
  // above so that a filter change made while a request is still in flight is
  // retried once the list is idle instead of being silently dropped.
  useEffect(() => {
    if (pendingFilterKey === loadedFilterKey) return;
    performFetch([], 0, {reload: true});
  }, [pendingFilterKey, loadedFilterKey, performFetch]);

  const handleScroll = useCallback(async () => {
    if (fullyLoaded) return;
    if (fullyScrolled()) {
      await fetchMore(puzzles, page);
    }
  }, [fullyLoaded, fullyScrolled, fetchMore, puzzles, page]);
  const handleRetry = useCallback(() => {
    reloadKeyRef.current = null;
    performFetch([], 0, {reload: true});
  }, [performFetch]);
  const handleTouchEnd = useCallback(async () => {
    if (containerRef.current) return;
    await handleScroll();
  }, [handleScroll]);

  const selectedSources = normalizeSourceFilter(props.filter?.sourceFilter);
  const isDefaultSort = !props.filter?.sortBy || props.filter.sortBy === 'default';
  const mappedPuzzles: {
    entryProps: EntryProps;
    date: number | null;
  }[] = puzzles
    .map((puzzle) => ({
      entryProps: {
        info: {
          type: puzzle.content.info.type!, // XXX not the best form
        },
        grid: puzzle.content.grid,
        title: puzzle.content.info.titleOverride || puzzle.content.info.title,
        author: puzzle.content.info.authorOverride || puzzle.content.info.author,
        originalTitle: puzzle.content.info.titleOverride ? puzzle.content.info.title : undefined,
        originalAuthor: puzzle.content.info.authorOverride ? puzzle.content.info.author : undefined,
        pid: puzzle.pid,
        stats: puzzle.stats,
        status: pgStatuses[puzzle.pid],
        fencing: props.fencing,
        isPublic: puzzle.isPublic,
        contest: puzzle.content.contest,
        source: classifyPuzzleSource(puzzle.content.info),
        // Zen mode is account-only — a guest must not inherit a stale
        // localStorage flag left over from a previous logged-in session.
        zenMode: !!user && preferences?.zenMode,
      },
      date: extractPuzzleDate(puzzle.content.info),
    }))
    .filter((data) => {
      const mappedStatus = {
        undefined: 'New' as const,
        solved: 'Complete' as const,
        started: 'In progress' as const,
      }[data.entryProps.status];
      return props.statusFilter[mappedStatus];
    })
    // Journal filtering is also applied here, not only on the server, so the
    // list stays correct against a backend that predates the sourceFilter
    // query param. When the server does honor it this is a no-op.
    .filter(
      (data) => selectedSources.length === 0 || selectedSources.includes(data.entryProps.source as string)
    );

  const puzzleData = isDefaultSort
    ? [...mappedPuzzles].sort((a, b) =>
        comparePuzzleDates({date: a.date, pid: a.entryProps.pid}, {date: b.date, pid: b.entryProps.pid})
      )
    : mappedPuzzles;

  // Pull further pages while the filtered list would otherwise look empty.
  useEffect(() => {
    if (fullyLoaded || loading) return;
    if (puzzles.length === 0) return; // the reload effect owns the first page
    if (puzzleData.length >= MIN_VISIBLE_ENTRIES) return;
    if (autoFillPagesRef.current >= AUTO_FILL_MAX_PAGES) return;
    autoFillPagesRef.current += 1;
    fetchMore(puzzles, page);
  }, [puzzleData.length, fullyLoaded, loading, puzzles, page, fetchMore]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        overflowY: 'auto',
      }}
      className="puzzlelist"
      onScroll={handleScroll}
      onTouchEnd={handleTouchEnd}
    >
      {error && (
        <div className="puzzlelist--error">
          <p className="puzzlelist--error--message">{error}</p>
          <p className="puzzlelist--error--discord">
            Reach out on{' '}
            <a href="https://discord.gg/RmjCV8EZ73" target="_blank" rel="noopener noreferrer">
              Discord
            </a>{' '}
            for more info.
          </p>
          <button type="button" className="puzzlelist--error--retry" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )}
      {puzzleData.map(({entryProps}) => (
        <div className="entry--container" key={entryProps.pid}>
          <Entry
            info={entryProps.info}
            grid={entryProps.grid}
            title={entryProps.title}
            author={entryProps.author}
            originalTitle={entryProps.originalTitle}
            originalAuthor={entryProps.originalAuthor}
            pid={entryProps.pid}
            stats={entryProps.stats}
            status={entryProps.status}
            fencing={entryProps.fencing}
            isPublic={entryProps.isPublic}
            contest={entryProps.contest}
            source={entryProps.source}
            zenMode={entryProps.zenMode}
          />
        </div>
      ))}
    </div>
  );
};

export default NewPuzzleList;
