import './css/welcome.css';

import React, {Component} from 'react';
import {Helmet} from 'react-helmet-async';
import {
  MdSearch,
  MdCheckBoxOutlineBlank,
  MdCheckBox,
  MdExpandMore,
  MdExpandLess,
  MdFilterList,
  MdClose,
  MdStar,
  MdStarBorder,
  MdPublic,
  MdFiberNew,
  MdTrendingUp,
} from 'react-icons/md';
import _ from 'lodash';

import clsx from 'clsx';
import Nav from '../components/common/Nav';
import Upload from '../components/Upload';
import PuzzleList from '../components/PuzzleList';
import {WelcomeVariantsControl} from '../components/WelcomeVariantsControl';
import {isMobile, colorAverage} from '../lib/jsUtils';
import {PUZZLE_SOURCES, SOURCE_GROUPS, getPuzzleSource, normalizeSourceFilter} from '../shared/puzzle_source';

const BLUE = '#6aa9f4';
const WHITE = '#FFFFFF';

const FILTERS_COLLAPSED_KEY = 'cwf:filtersCollapsed';

// The collapsed state is remembered per device: someone who folds the filters
// away on a phone does not want them expanded again on every visit.
const readFiltersCollapsed = (fallback) => {
  try {
    const stored = localStorage.getItem(FILTERS_COLLAPSED_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    // ignore (private mode, disabled storage)
  }
  return fallback;
};

const SIZE_NAMES = ['Mini', 'Midi', 'Standard', 'Large'];

const ALL_SIZES = {Mini: true, Midi: true, Standard: true, Large: true};
const ALL_TYPES = {Standard: true, Cryptic: true, Contest: true};
const ALL_DAYS = {
  Mon: true,
  Tue: true,
  Wed: true,
  Thu: true,
  Fri: true,
  Sat: true,
  Sun: true,
  Unknown: true,
};

const handleLabelMouseDown = (e) => {
  e.preventDefault();
};

const isEverythingSelected = (group) => !_.isEmpty(group) && _.every(_.values(group), Boolean);

// The rail can't offer all ~24 publications without becoming a wall of chips,
// so the mainstream ones sit in the open rail and the long tail lives behind a
// "More journals" disclosure, sectioned by the group each publication declares
// in shared/puzzle_source.ts. Ordering comes from the taxonomy itself.
const PRIMARY_SOURCES = PUZZLE_SOURCES.filter((source) => source.primary);
const TRAY_SOURCES = PUZZLE_SOURCES.filter((source) => !source.primary);

export default class Welcome extends Component {
  constructor(props) {
    super(props);
    this.mobile = isMobile();
    this.state = {
      collapsedFilters: {},
      mobileSidebarOpen: false,
      uploadedPuzzles: 0,
      // A phone starts folded so the puzzles are the first thing in view;
      // desktop starts open because there is room for the controls.
      filtersCollapsed: readFiltersCollapsed(this.mobile),
    };
    this.loading = false;
    this.searchInput = React.createRef();
    this.nav = React.createRef();
    // Initialize to 0 so the navStyle/navTextStyle/navLinkStyle getters
    // produce real CSS values (0 px translateY, 0 px top, etc.) instead
    // of NaN if the ref hasn't attached yet. Both work in practice (CSS
    // ignores NaN), but 0 is cleaner and avoids React warnings about
    // NaN values in inline style props.
    this.navHeight = 0;
  }

  componentDidMount() {
    // Nav returns null when `hidden` is set, and ref attachment can also
    // race with componentDidMount in dev/strict-mode double-render. Guard
    // the deref so we don't throw a null-pointer error on the homepage.
    if (this.nav.current) {
      this.navHeight = this.nav.current.getBoundingClientRect().height;
      // First render uses navHeight=0 from the constructor, which collapses
      // .welcome--nav to height: 0 on mobile and lets the search bar overlap
      // the nav. Force a re-render now that we have the real measurement.
      this.forceUpdate();
    }
  }

  get showingSidebar() {
    // eventually, allow mobile to toggle sidebar
    return !this.mobile;
  }

  get navStyle() {
    if (!this.mobile) return undefined;
    const motion = this.motion;
    const {searchFocused} = this.state;
    const offset = motion;
    const top = -this.navHeight * offset;
    const height = this.navHeight * (1 - offset);
    return {
      position: 'relative',
      top,
      height,
      opacity: searchFocused && motion === 1 ? 0 : 1,
    };
  }

  get navTextStyle() {
    if (!this.mobile) return undefined;
    const motion = this.motion;
    const opacity = _.clamp(1 - 3 * motion, 0, 1);
    const translateY = this.navHeight * motion;
    return {
      opacity,
      transform: `translateY(${translateY}px)`,
    };
  }

  get navLinkStyle() {
    if (!this.mobile) return undefined;
    const motion = this.motion;
    const translateY = this.navHeight * motion;
    return {
      transform: `translateY(${translateY}px)`,
      zIndex: 2,
    };
  }

  handleScroll = (top) => {
    if (!this.mobile) return;
    const motion = _.clamp(top / 100, 0, 1);
    this.setState({
      motion,
    });
  };

  renderPuzzles() {
    return (
      <PuzzleList
        fencing={this.props.fencing}
        uploadedPuzzles={this.state.uploadedPuzzles}
        userHistory={{}}
        sizeFilter={this.props.sizeFilter}
        statusFilter={this.props.statusFilter}
        typeFilter={this.props.typeFilter}
        dayOfWeekFilter={this.props.dayOfWeekFilter}
        sourceFilter={this.props.sourceFilter}
        minRating={this.props.minRating}
        sortBy={this.props.sortBy}
        search={this.props.search}
        onScroll={this.handleScroll}
      />
    );
  }

  handleCreatePuzzle = () => {
    this.setState((prev) => ({uploadedPuzzles: prev.uploadedPuzzles + 1}));
  };

  handleFilterChange = (header, name, on) => {
    if (header === 'Size') {
      this.props.setSizeFilter({
        ...this.props.sizeFilter,
        [name]: on,
      });
    } else if (header === 'Status') {
      this.props.setStatusFilter({
        ...this.props.statusFilter,
        [name]: on,
      });
    } else if (header === 'Type') {
      this.props.setTypeFilter({
        ...this.props.typeFilter,
        [name]: on,
      });
    } else if (header === 'Day') {
      this.props.setDayOfWeekFilter({
        ...this.props.dayOfWeekFilter,
        [name]: on,
      });
    }
  };

  handleSelectAll = (header) => {
    if (header === 'Day') {
      this.props.setDayOfWeekFilter({...ALL_DAYS});
    }
  };

  handleSelectNone = (header) => {
    if (header === 'Day') {
      this.props.setDayOfWeekFilter({
        Mon: false,
        Tue: false,
        Wed: false,
        Thu: false,
        Fri: false,
        Sat: false,
        Sun: false,
        Unknown: false,
      });
    }
  };

  updateSearch = _.debounce((search) => {
    this.props.setSearch(search);
  }, 250);

  handleSearchInput = (e) => {
    const search = e.target.value;
    this.updateSearch(search);
  };

  handleSearchFocus = () => {
    this.setState({searchFocused: true});
  };

  handleSearchBlur = () => {
    this.setState({searchFocused: false});
  };

  toggleFilterGroup = (header) => {
    this.setState((prev) => ({
      collapsedFilters: {
        ...prev.collapsedFilters,
        [header]: !prev.collapsedFilters[header],
      },
    }));
  };

  toggleMobileSidebar = () => {
    this.setState((prev) => ({mobileSidebarOpen: !prev.mobileSidebarOpen}));
  };

  closeMobileSidebar = () => {
    this.setState({mobileSidebarOpen: false});
  };

  handleCloseSidebarKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.closeMobileSidebar();
    }
  };

  handleMinRatingClick = (e) => {
    const value = Number(e.currentTarget.dataset.value);
    // Click the active star to clear; otherwise set to that level.
    if (this.props.minRating === value) {
      this.props.setMinRating(0);
    } else {
      this.props.setMinRating(value);
    }
  };

  handleMinRatingKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleMinRatingClick(e);
    }
  };

  handleCheckboxChange = (e) => {
    const {header, name} = e.target.dataset;
    this.handleFilterChange(header, name, e.target.checked);
  };

  handleToggleFilterGroupClick = (e) => {
    const {header} = e.currentTarget.dataset;
    this.toggleFilterGroup(header);
  };

  handleToggleFilterGroupKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const {header} = e.currentTarget.dataset;
      this.toggleFilterGroup(header);
    }
  };

  handleSelectAllClick = (e) => {
    const {header} = e.currentTarget.dataset;
    this.handleSelectAll(header);
  };

  handleSelectAllKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const {header} = e.currentTarget.dataset;
      this.handleSelectAll(header);
    }
  };

  handleSelectNoneClick = (e) => {
    const {header} = e.currentTarget.dataset;
    this.handleSelectNone(header);
  };

  handleSelectNoneKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const {header} = e.currentTarget.dataset;
      this.handleSelectNone(header);
    }
  };

  get selectedSources() {
    return normalizeSourceFilter(this.props.sourceFilter);
  }

  get hasActiveFilters() {
    const {sizeFilter, typeFilter, dayOfWeekFilter, minRating} = this.props;
    return (
      this.selectedSources.length > 0 ||
      !isEverythingSelected(sizeFilter) ||
      !isEverythingSelected(typeFilter) ||
      !isEverythingSelected(dayOfWeekFilter) ||
      (minRating || 0) > 0
    );
  }

  // A one-line description of whatever the folded panel is hiding, so a
  // collapsed filter bar still says which slice of the archive is on screen.
  get filtersSummary() {
    const parts = [];

    const selected = this.selectedSources;
    if (selected.length === 1) {
      const [id] = selected;
      parts.push(getPuzzleSource(id)?.label || id);
    } else if (selected.length > 1) {
      parts.push(`${selected.length} journals`);
    }

    const sizeFilter = this.props.sizeFilter || {};
    const activeSizes = SIZE_NAMES.filter((name) => sizeFilter[name]);
    if (activeSizes.length > 0 && activeSizes.length < SIZE_NAMES.length) {
      parts.push(activeSizes.length === 1 ? activeSizes[0] : `${activeSizes.length} sizes`);
    }

    const typeFilter = this.props.typeFilter || {};
    const activeTypes = Object.keys(ALL_TYPES).filter((name) => typeFilter[name]);
    if (activeTypes.length > 0 && activeTypes.length < Object.keys(ALL_TYPES).length) {
      parts.push(activeTypes.join(', '));
    }

    const dayOfWeekFilter = this.props.dayOfWeekFilter || {};
    const activeDays = Object.keys(ALL_DAYS).filter((name) => dayOfWeekFilter[name]);
    if (activeDays.length > 0 && activeDays.length < Object.keys(ALL_DAYS).length) {
      parts.push(activeDays.length === 1 ? activeDays[0] : `${activeDays.length} days`);
    }

    const minRating = this.props.minRating || 0;
    if (minRating > 0) parts.push(`${minRating}+ stars`);

    return parts.length > 0 ? parts.join(' · ') : 'All puzzles';
  }

  // Source chips are a multi-select: clicking a journal adds it to the list,
  // clicking it again removes it. An empty list means "all journals".
  handleToggleSource = (e) => {
    const {sourceId} = e.currentTarget.dataset;
    const selected = this.selectedSources;
    const next = selected.includes(sourceId)
      ? selected.filter((s) => s !== sourceId)
      : [...selected, sourceId];
    this.props.setSourceFilter(next.join(','));
  };

  handleShowAllSources = () => {
    this.props.setSourceFilter('');
  };

  handleSizePreset = (e) => {
    const {sizeName} = e.currentTarget.dataset;
    this.props.setSizeFilter({Mini: false, Midi: false, Standard: false, Large: false, [sizeName]: true});
  };

  handleSizeAll = () => {
    this.props.setSizeFilter({...ALL_SIZES});
  };

  handleSortChange = (e) => {
    this.props.setSortBy(e.currentTarget.dataset.sortBy);
  };

  handleClearFilters = () => {
    this.props.setSourceFilter('');
    this.props.setSizeFilter({...ALL_SIZES});
    this.props.setTypeFilter({...ALL_TYPES});
    this.props.setDayOfWeekFilter({...ALL_DAYS});
    this.props.setMinRating(0);
  };

  handleToggleFilters = () => {
    const filtersCollapsed = !this.state.filtersCollapsed;
    this.setState({filtersCollapsed});
    try {
      localStorage.setItem(FILTERS_COLLAPSED_KEY, filtersCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  };

  renderFilters() {
    const sizeFilter = this.props.sizeFilter;
    const statusFilter = this.props.statusFilter;
    const typeFilter = this.props.typeFilter;
    const dayOfWeekFilter = this.props.dayOfWeekFilter;
    const {collapsedFilters} = this.state;

    const headerStyle = {
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      userSelect: 'none',
    };
    const groupStyle = {
      padding: '8px 20px',
    };
    const inputStyle = {
      margin: 'unset',
    };

    const checkboxGroup = (header, items, showQuickToggle = false) => {
      const collapsed = collapsedFilters[header];
      return (
        <div className="flex--column checkbox-group" style={groupStyle}>
          <span
            role="button"
            tabIndex={0}
            style={headerStyle}
            data-header={header}
            onClick={this.handleToggleFilterGroupClick}
            onKeyDown={this.handleToggleFilterGroupKeyDown}
          >
            {header}
            {collapsed ? (
              <MdExpandMore style={{width: 20, height: 20}} />
            ) : (
              <MdExpandLess style={{width: 20, height: 20}} />
            )}
          </span>
          {!collapsed && showQuickToggle && (
            <div className="filter-quick-toggle">
              <span
                role="button"
                tabIndex={0}
                className="filter-quick-toggle--link"
                data-header={header}
                onClick={this.handleSelectAllClick}
                onKeyDown={this.handleSelectAllKeyDown}
              >
                All
              </span>
              <span className="filter-quick-toggle--separator">/</span>
              <span
                role="button"
                tabIndex={0}
                className="filter-quick-toggle--link"
                data-header={header}
                onClick={this.handleSelectNoneClick}
                onKeyDown={this.handleSelectNoneKeyDown}
              >
                None
              </span>
            </div>
          )}
          {!collapsed &&
            _.keys(items).map((name, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <label key={i} role="presentation" onMouseDown={handleLabelMouseDown}>
                <input
                  type="checkbox"
                  style={inputStyle}
                  checked={items[name]}
                  data-header={header}
                  data-name={name}
                  onChange={this.handleCheckboxChange}
                />
                {items[name] ? (
                  <MdCheckBox className="checkbox-icon" />
                ) : (
                  <MdCheckBoxOutlineBlank className="checkbox-icon" />
                )}
                <span>{name}</span>
              </label>
            ))}
        </div>
      );
    };

    const minRating = this.props.minRating || 0;

    const ratingGroup = (
      <div className="flex--column checkbox-group" style={groupStyle}>
        <span style={{...headerStyle, cursor: 'default'}}>Min rating</span>
        <div className="welcome--min-rating">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= minRating;
            const Icon = filled ? MdStar : MdStarBorder;
            return (
              <span
                key={n}
                role="button"
                tabIndex={0}
                aria-label={`At least ${n} ${n === 1 ? 'star' : 'stars'}`}
                aria-pressed={filled}
                data-value={n}
                onClick={this.handleMinRatingClick}
                onKeyDown={this.handleMinRatingKeyDown}
                className="welcome--min-rating-star"
              >
                <Icon />
              </span>
            );
          })}
          <span className="welcome--min-rating-label">{minRating === 0 ? 'Any' : `${minRating}+`}</span>
        </div>
      </div>
    );

    return (
      <div className="flex--column flex--shrink-0 filters">
        {ratingGroup}
        {checkboxGroup('Size', sizeFilter)}
        {checkboxGroup('Type', typeFilter)}
        {checkboxGroup('Day', dayOfWeekFilter, true)}
        {checkboxGroup('Status', statusFilter)}
      </div>
    );
  }

  // The hero replaces the old search bar + sidebar-only controls: journals and
  // size live here because they are the first two decisions a solver makes.
  //
  // Any selected journal outside the primary set is promoted into the open
  // rail, so a shared link like ?source=avcx still shows *why* the list is
  // narrow instead of hiding the active chip behind a collapsed disclosure.
  renderSourceRail() {
    const selected = this.selectedSources;
    const allActive = selected.length === 0;
    const promoted = TRAY_SOURCES.filter((source) => selected.includes(source.id));
    const tray = TRAY_SOURCES.filter((source) => !selected.includes(source.id));
    const renderChip = (source) => {
      const active = selected.includes(source.id);
      return (
        <button
          key={source.id}
          type="button"
          className={clsx('welcome--chip', {active})}
          aria-pressed={active}
          title={source.fullName}
          data-source-id={source.id}
          onClick={this.handleToggleSource}
        >
          {source.label}
        </button>
      );
    };
    const renderGroup = (group) => (
      <div className="welcome--group" key={group.id}>
        <span className="welcome--group-label">{group.label}</span>
        <div className="flex welcome--rail welcome--rail--tray">{group.sources.map(renderChip)}</div>
      </div>
    );
    // Section the long tail so ~24 journals read as a few short rows rather
    // than one undifferentiated block. A group whose members are all promoted
    // into the open rail (because they are selected) disappears with them.
    const groupedTray = SOURCE_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      sources: tray.filter((source) => source.group === group.id),
    })).filter((group) => group.sources.length > 0);
    return (
      <div className="welcome--rail-wrap">
        <span className="welcome--control-label">Source</span>
        <div className="flex welcome--rail" role="group" aria-label="Filter by publication">
          <button
            type="button"
            className={clsx('welcome--chip', 'welcome--chip--all', {active: allActive})}
            aria-pressed={allActive}
            onClick={this.handleShowAllSources}
          >
            <MdPublic className="welcome--chip-icon" />
            All journals
          </button>
          {PRIMARY_SOURCES.map(renderChip)}
          {promoted.map(renderChip)}
        </div>
        {tray.length > 0 && (
          <details className="welcome--more">
            <summary className="welcome--more-toggle">
              More journals
              <span className="welcome--more-count">{tray.length}</span>
            </summary>
            <div className="welcome--more-body">{groupedTray.map(renderGroup)}</div>
          </details>
        )}
      </div>
    );
  }

  renderSizeControl() {
    const sizeFilter = this.props.sizeFilter || {};
    const activeCount = SIZE_NAMES.filter((name) => sizeFilter[name]).length;
    const allSizes = activeCount === SIZE_NAMES.length;
    return (
      <div className="welcome--control-row">
        <span className="welcome--control-label">Size</span>
        <div className="flex welcome--segmented" role="group" aria-label="Filter by puzzle size">
          <button
            type="button"
            className={clsx('welcome--segmented-option', {active: allSizes})}
            aria-pressed={allSizes}
            onClick={this.handleSizeAll}
          >
            All sizes
          </button>
          {SIZE_NAMES.map((name) => {
            const active = activeCount === 1 && !!sizeFilter[name];
            return (
              <button
                key={name}
                type="button"
                className={clsx('welcome--segmented-option', {active})}
                aria-pressed={active}
                data-size-name={name}
                onClick={this.handleSizePreset}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  renderViewToggle() {
    const sortBy = this.props.sortBy || 'default';
    return (
      <div className="flex welcome--segmented welcome--segmented--view" role="group" aria-label="Sort order">
        <button
          type="button"
          className={clsx('welcome--segmented-option', {active: sortBy === 'default'})}
          aria-pressed={sortBy === 'default'}
          data-sort-by="default"
          onClick={this.handleSortChange}
        >
          <MdFiberNew className="welcome--segmented-icon" />
          Latest
        </button>
        <button
          type="button"
          className={clsx('welcome--segmented-option', {active: sortBy === 'rating_desc'})}
          aria-pressed={sortBy === 'rating_desc'}
          data-sort-by="rating_desc"
          onClick={this.handleSortChange}
        >
          <MdTrendingUp className="welcome--segmented-icon" />
          Top rated
        </button>
      </div>
    );
  }

  renderHero() {
    const collapsed = this.state.filtersCollapsed;
    return (
      <div className="welcome--hero">
        <div className="flex welcome--hero-top">
          <div className="flex--column welcome--hero-heading">
            <h1 className="welcome--hero-title">Find your next crossword</h1>
            {!collapsed && (
              <p className="welcome--hero-subtitle">
                Every journal in one place — pick a source, then a size.
              </p>
            )}
          </div>
          {this.renderViewToggle()}
        </div>
        <div className="flex flex--align-center welcome--filters-bar">
          <button
            type="button"
            className={clsx('welcome--filters-toggle', {active: !collapsed})}
            aria-expanded={!collapsed}
            onClick={this.handleToggleFilters}
          >
            <MdFilterList className="welcome--filters-toggle-icon" />
            Filters
            <span className="welcome--filters-summary">{this.filtersSummary}</span>
            {collapsed ? (
              <MdExpandMore className="welcome--filters-toggle-icon" />
            ) : (
              <MdExpandLess className="welcome--filters-toggle-icon" />
            )}
          </button>
          {this.hasActiveFilters && (
            <button type="button" className="welcome--clear-filters" onClick={this.handleClearFilters}>
              <MdClose className="welcome--clear-filters-icon" />
              Clear all filters
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="welcome--filters-body">
            {this.renderSourceRail()}
            {this.renderSizeControl()}
          </div>
        )}
      </div>
    );
  }

  get motion() {
    const {motion, searchFocused} = this.state;
    if (this.state.motion === undefined) return 0;

    return searchFocused ? Math.round(motion) : motion;
  }

  get colorMotion() {
    if (!this.mobile) return 0;
    // if (this.state.searchFocused) return 0;
    const motion = this.motion;
    const result = _.clamp(motion * 3, 0, 1);
    return result;
  }

  get searchStyle() {
    if (!this.mobile) return {flexGrow: 1};
    const motion = this.motion;
    const color = colorAverage(BLUE, WHITE, this.colorMotion);
    const {searchFocused} = this.state;
    const width = searchFocused ? 1 : _.clamp(1 - motion, 0.1, 1);
    const zIndex = searchFocused ? 3 : 0;
    return {
      color,
      width: `${width * 100}%`,
      zIndex,
    };
  }

  get searchInputStyle() {
    if (!this.mobile) return undefined;
    const color = colorAverage(BLUE, WHITE, this.colorMotion);
    const backgroundColor = colorAverage(WHITE, BLUE, this.colorMotion);
    const paddingTop = (1 - this.motion) * 10;
    const paddingBottom = paddingTop;
    return {
      color,
      backgroundColor,
      paddingTop,
      paddingBottom,
    };
  }

  get searchIconGraphicsStyle() {
    if (!this.mobile) return undefined;
    const stroke = colorAverage(BLUE, WHITE, this.colorMotion);
    return {
      stroke,
    };
  }

  handleSearchIconTouchEnd = (e) => {
    this.searchInput.current && this.searchInput.current.focus();
    e.preventDefault();
    e.stopPropagation();
  };

  renderSearch() {
    const grow = this.mobile ? 0 : 1;
    return (
      <div
        className="flex flex--shrink-0 welcome--searchbar--container"
        style={{justifyContent: this.mobile ? 'flex-end' : 'flex-start'}}
      >
        <div
          className="flex flex--align-center welcome--searchbar--wrapper"
          style={{...this.searchStyle, flexGrow: grow}}
        >
          <MdSearch className="welcome--searchicon" onTouchEnd={this.handleSearchIconTouchEnd} />
          <input
            ref={this.searchInput}
            style={this.searchInputStyle}
            placeholder="Search puzzles or authors"
            aria-label="Search puzzles or authors"
            onFocus={this.handleSearchFocus}
            onBlur={this.handleSearchBlur}
            onInput={this.handleSearchInput}
            defaultValue={this.props.search}
            className="welcome--searchbar"
          />
        </div>
        {this.mobile && (
          <button
            className="mobile-filter-button"
            onClick={this.toggleMobileSidebar}
            aria-label="Open filters"
          >
            <MdFilterList />
          </button>
        )}
      </div>
    );
  }

  renderQuickUpload() {
    return (
      <div className="flex quickplay" style={{width: 200}}>
        <Upload v2 fencing={this.props.fencing} onCreate={this.handleCreatePuzzle} />
      </div>
    );
  }

  renderMobileSidebar() {
    const {mobileSidebarOpen} = this.state;
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          className={clsx('mobile-sidebar-overlay', {open: mobileSidebarOpen})}
          onClick={this.closeMobileSidebar}
          onKeyDown={this.handleCloseSidebarKeyDown}
        />
        <div className={clsx('flex--column mobile-sidebar', {open: mobileSidebarOpen})}>
          <div className="flex flex--align-center mobile-sidebar--header">
            <span>Filters</span>
            <MdClose className="mobile-sidebar--close" onClick={this.closeMobileSidebar} />
          </div>
          <div className="flex--column flex--grow" style={{overflowY: 'auto'}}>
            {this.renderFilters()}
            {this.hasActiveFilters && (
              <button type="button" className="welcome--clear-filters" onClick={this.handleClearFilters}>
                <MdClose className="welcome--clear-filters-icon" />
                Clear all filters
              </button>
            )}
            <WelcomeVariantsControl fencing={this.props.fencing} />
          </div>
          <div className="flex quickplay" style={{width: '100%'}}>
            <Upload v2 fencing={this.props.fencing} onCreate={this.handleCreatePuzzle} />
          </div>
        </div>
      </>
    );
  }

  render() {
    return (
      <div className={clsx('flex--column flex--grow welcome', {mobile: this.mobile})}>
        <Helmet>
          <title>Cross with Friends</title>
        </Helmet>
        <div className="welcome--nav" style={this.navStyle}>
          <Nav
            v2
            mobile={this.mobile}
            textStyle={this.navTextStyle}
            linkStyle={this.navLinkStyle}
            divRef={this.nav}
          />
        </div>
        <div className="flex flex--grow" style={{flexBasis: 1}}>
          {this.showingSidebar && (
            <div className="flex--column flex--shrink-0 welcome--sidebar">
              {this.renderFilters()}
              <WelcomeVariantsControl fencing={this.props.fencing} />
              {!this.mobile && this.renderQuickUpload()}
            </div>
          )}
          <div className="flex--column flex--grow welcome--main">
            {this.renderSearch()}
            {this.renderHero()}
            {this.renderPuzzles()}
          </div>
        </div>
        {this.mobile && this.renderMobileSidebar()}
      </div>
    );
  }
}
