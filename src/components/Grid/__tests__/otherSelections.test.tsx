/* eslint-disable react/jsx-props-no-spreading */
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import React, {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import Cell from '../Cell';
import GridWrapper from '../../../lib/wrappers/GridWrapper';
import {getTranslucentColor, getContrastTextColor} from '../../../lib/colors';
import {OtherSelection} from '../types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('multiplayer selection and badge helpers', () => {
  it('computes translucent colors for hsl, hex, and rgb', () => {
    expect(getTranslucentColor('hsl(207,90%,54%)', 0.22)).toBe('hsla(207,90%,54%, 0.22)');
    expect(getTranslucentColor('#3b82f6', 0.25)).toBe('rgba(59, 130, 246, 0.25)');
    expect(getTranslucentColor('rgb(100, 150, 200)', 0.18)).toBe('rgba(100, 150, 200, 0.18)');
  });

  it('determines contrast text color based on luminance', () => {
    expect(getContrastTextColor('#ffffff')).toBe('#000000');
    expect(getContrastTextColor('#ffff00')).toBe('#000000');
    expect(getContrastTextColor('#000000')).toBe('#ffffff');
    expect(getContrastTextColor('hsl(262,52%,47%)')).toBe('#ffffff');
  });
});

describe('otherSelectionsMap grid computation', () => {
  function makeGrid() {
    const rawGrid = [
      [
        {value: 'A', black: false},
        {value: 'B', black: false},
        {value: 'C', black: false},
      ],
      [
        {value: 'D', black: false},
        {value: '', black: true},
        {value: 'E', black: false},
      ],
      [
        {value: 'F', black: false},
        {value: 'G', black: false},
        {value: 'H', black: false},
      ],
    ];
    const wrapper = new GridWrapper(rawGrid);
    wrapper.assignNumbers();
    return wrapper;
  }

  it('correctly maps single player clue word selection', () => {
    const grid = makeGrid();
    const cursor = {
      id: 'p1',
      r: 0,
      c: 0,
      direction: 'across' as const,
      color: 'hsl(207,90%,54%)',
      displayName: 'Alice',
      timestamp: Date.now(),
      active: true,
    };

    const dir = cursor.direction;
    const clueNum = grid.getParent(cursor.r, cursor.c, dir);
    expect(clueNum).toBeGreaterThan(0);

    const selections: Record<string, OtherSelection[]> = {};
    for (const [r, c] of grid.items()) {
      if (grid.isWhite(r, c) && grid.getParent(r, c, dir) === clueNum) {
        const key = `${r}_${c}`;
        if (!selections[key]) selections[key] = [];
        selections[key].push({
          id: cursor.id,
          color: cursor.color,
          displayName: cursor.displayName,
          direction: dir,
          isActiveSquare: cursor.r === r && cursor.c === c,
        });
      }
    }

    expect(selections['0_0']).toHaveLength(1);
    expect(selections['0_0'][0].isActiveSquare).toBe(true);
    expect(selections['0_1']).toHaveLength(1);
    expect(selections['0_1'][0].isActiveSquare).toBe(false);
    expect(selections['0_2']).toHaveLength(1);
    expect(selections['0_2'][0].isActiveSquare).toBe(false);
    expect(selections['1_0']).toBeUndefined();
  });

  it('correctly maps overlapping selections from multiple players', () => {
    const grid = makeGrid();
    const cursor1 = {
      id: 'p1',
      r: 0,
      c: 0,
      direction: 'across' as const,
      color: 'hsl(207,90%,54%)',
      displayName: 'Alice',
      timestamp: Date.now(),
      active: true,
    };
    const cursor2 = {
      id: 'p2',
      r: 1,
      c: 2,
      direction: 'down' as const,
      color: 'hsl(4,90%,58%)',
      displayName: 'Bob',
      timestamp: Date.now(),
      active: true,
    };

    const selections: Record<string, OtherSelection[]> = {};
    for (const cursor of [cursor1, cursor2]) {
      const dir = cursor.direction;
      const clueNum = grid.getParent(cursor.r, cursor.c, dir);
      for (const [r, c] of grid.items()) {
        if (grid.isWhite(r, c) && grid.getParent(r, c, dir) === clueNum) {
          const key = `${r}_${c}`;
          if (!selections[key]) selections[key] = [];
          selections[key].push({
            id: cursor.id,
            color: cursor.color,
            displayName: cursor.displayName,
            direction: dir,
            isActiveSquare: cursor.r === r && cursor.c === c,
          });
        }
      }
    }

    expect(selections['0_2']).toHaveLength(2);
    expect(selections['0_2'].map((s) => s.displayName)).toEqual(['Alice', 'Bob']);
  });
});

describe('Cell component otherSelections and badges rendering', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const renderComponent = async (element: React.ReactElement) => {
    await act(async () => {
      root.render(element);
    });
  };

  const baseProps = {
    r: 1,
    c: 1,
    value: 'A',
    cursors: [],
    pings: [],
    solvedByIconSize: 3,
    selected: false,
    highlighted: false,
    frozen: false,
    circled: false,
    shaded: false,
    referenced: false,
    canFlipColor: false,
    attributionColor: '',
    cellStyle: {
      selected: {backgroundColor: ''},
      highlighted: {backgroundColor: ''},
      frozen: {backgroundColor: ''},
    },
    myColor: '#000',
    onClick: () => {},
    onContextMenu: () => {},
  };

  it('renders a soft translucent wash for a single other player selection', async () => {
    const otherSelections: OtherSelection[] = [
      {
        id: 'p1',
        color: 'hsl(207,90%,54%)',
        displayName: 'Alice',
        direction: 'across',
        isActiveSquare: false,
      },
    ];

    await renderComponent(<Cell {...baseProps} otherSelections={otherSelections} />);
    const wash = container.querySelector('.cell--other-selection');
    expect(wash).not.toBeNull();
    expect(wash?.getAttribute('style')).toContain('0.22');
    expect(wash?.getAttribute('title')).toBe('Selected by Alice');
  });

  it('renders a multi-stop linear-gradient for overlapping other player selections', async () => {
    const otherSelections: OtherSelection[] = [
      {
        id: 'p1',
        color: 'hsl(207,90%,54%)',
        displayName: 'Alice',
        direction: 'across',
        isActiveSquare: false,
      },
      {
        id: 'p2',
        color: 'hsl(4,90%,58%)',
        displayName: 'Bob',
        direction: 'down',
        isActiveSquare: false,
      },
    ];

    await renderComponent(<Cell {...baseProps} otherSelections={otherSelections} />);
    const wash = container.querySelector('.cell--other-selection');
    expect(wash).not.toBeNull();
    expect(wash?.getAttribute('style')).toContain('linear-gradient(135deg');
    expect(wash?.getAttribute('style')).toContain('0.22');
    expect(wash?.getAttribute('title')).toBe('Selected by Alice, Bob');
  });

  it('renders a floating name badge for active cursor squares', async () => {
    const cursors = [
      {
        id: 'p1',
        r: 1,
        c: 1,
        timestamp: Date.now(),
        color: '#3b82f6',
        displayName: 'Charlie',
        active: true,
      },
    ];

    await renderComponent(<Cell {...baseProps} cursors={cursors} />);
    const badgeContainer = container.querySelector('.cell--cursor-badges');
    expect(badgeContainer).not.toBeNull();
    expect(badgeContainer?.classList.contains('top-row')).toBe(false);

    const badge = container.querySelector('.cell--cursor-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('Charlie');
    expect(badge?.getAttribute('style')).toContain('background-color: rgb(59, 130, 246)');
  });

  it('applies top-row class to badges when r === 0', async () => {
    const cursors = [
      {
        id: 'p1',
        r: 0,
        c: 2,
        timestamp: Date.now(),
        color: '#3b82f6',
        displayName: 'Charlie',
        active: true,
      },
    ];

    await renderComponent(<Cell {...baseProps} r={0} c={2} cursors={cursors} />);
    const badgeContainer = container.querySelector('.cell--cursor-badges');
    expect(badgeContainer).not.toBeNull();
    expect(badgeContainer?.classList.contains('top-row')).toBe(true);
  });

  it('renders multiple badges side-by-side when players overlap on the same square', async () => {
    const cursors = [
      {
        id: 'p1',
        r: 1,
        c: 1,
        timestamp: Date.now(),
        color: '#3b82f6',
        displayName: 'Alice',
        active: true,
      },
      {
        id: 'p2',
        r: 1,
        c: 1,
        timestamp: Date.now(),
        color: '#ef4444',
        displayName: 'Bob',
        active: true,
      },
    ];

    await renderComponent(<Cell {...baseProps} cursors={cursors} />);
    const badges = container.querySelectorAll('.cell--cursor-badge');
    expect(badges).toHaveLength(2);
    expect(badges[0].textContent).toBe('Alice');
    expect(badges[1].textContent).toBe('Bob');

    const cursorOutlines = container.querySelectorAll('.cell--cursor');
    expect(cursorOutlines).toHaveLength(2);
    expect(cursorOutlines[0].getAttribute('style')).toContain('inset: 0px');
    expect(cursorOutlines[1].getAttribute('style')).toContain('inset: 2px');
  });

  it('does not render other-selection wash when cell is selected by local player', async () => {
    const otherSelections: OtherSelection[] = [
      {
        id: 'p1',
        color: 'hsl(207,90%,54%)',
        displayName: 'Alice',
        direction: 'across',
        isActiveSquare: false,
      },
    ];

    await renderComponent(<Cell {...baseProps} selected={true} otherSelections={otherSelections} />);
    const wash = container.querySelector('.cell--other-selection');
    expect(wash).toBeNull();
  });
});
