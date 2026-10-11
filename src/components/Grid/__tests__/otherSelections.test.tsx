/* eslint-disable react/jsx-props-no-spreading */
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import React, {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import Cell from '../Cell';
import GridWrapper from '../../../lib/wrappers/GridWrapper';
import {getTranslucentColor, getContrastTextColor} from '../../../lib/colors';
import {OtherSelection} from '../types';
import {getSelectionWashStyle, SELECTED_OVERLAP_OPACITY, SHARED_SELECTION_OPACITY} from '../selectionWash';

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

  it('renders cursor borders and does not render floating name badges inside cells', async () => {
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
    expect(badgeContainer).toBeNull();

    const cursorOutline = container.querySelector('.cell--cursor');
    expect(cursorOutline).not.toBeNull();
    expect(cursorOutline?.getAttribute('style')).toContain('border-color: rgb(59, 130, 246)');
  });

  it('renders multiple cursor outlines with offset insets when players overlap', async () => {
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
    expect(badges).toHaveLength(0);

    const cursorOutlines = container.querySelectorAll('.cell--cursor');
    expect(cursorOutlines).toHaveLength(2);
    expect(cursorOutlines[0].getAttribute('style')).toContain('inset: 0px');
    expect(cursorOutlines[1].getAttribute('style')).toContain('inset: 2px');
  });

  it('no longer treats a cell selected by the local player as clear of other selections', async () => {
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
    expect(wash).not.toBeNull();
  });

  it('stripes an overlapping selection instead of hiding it under the local fill', async () => {
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
    expect(wash).not.toBeNull();

    // Diagonal bands: the local player's own band is unpainted (their selected
    // fill already is that colour), and the other player is laid over it.
    const style = wash?.getAttribute('style') || '';
    expect(style).toContain('linear-gradient(135deg');
    expect(style).toContain('transparent 0.0%');
    expect(style).toContain(`${SELECTED_OVERLAP_OPACITY})`);
    expect(style).not.toContain(`${SHARED_SELECTION_OPACITY})`);
    expect(wash?.getAttribute('title')).toBe('Also selected by Alice');
  });

  it('gives every overlapping player a band when the local player shares the square', async () => {
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

    await renderComponent(<Cell {...baseProps} selected={true} otherSelections={otherSelections} />);
    const style = container.querySelector('.cell--other-selection')?.getAttribute('style') || '';
    expect(style).toContain('linear-gradient(135deg');
    expect(style).toContain('transparent 0.0%, transparent 33.3%');
    // Two other players plus the local band: a third of the square each.
    expect(style).toContain(`${SELECTED_OVERLAP_OPACITY}) 33.3%`);
    expect(style).toContain(`${SELECTED_OVERLAP_OPACITY}) 66.7%`);
    expect(style).toContain('100.0%');
  });

  it('leaves a solo selected cell unstriped', async () => {
    await renderComponent(<Cell {...baseProps} selected={true} otherSelections={[]} />);
    expect(container.querySelector('.cell--other-selection')).toBeNull();
  });
});

describe('getSelectionWashStyle', () => {
  it('returns nothing for an empty player list', () => {
    expect(getSelectionWashStyle([], SELECTED_OVERLAP_OPACITY)).toBeNull();
  });

  it('paints a flat wash for a single colour', () => {
    expect(getSelectionWashStyle(['#3b82f6'], SHARED_SELECTION_OPACITY)).toEqual({
      backgroundColor: 'rgba(59, 130, 246, 0.22)',
    });
  });

  it('skips a null band so the square below shows through', () => {
    const style = getSelectionWashStyle([null, '#ef4444'], SELECTED_OVERLAP_OPACITY);
    expect(style?.backgroundImage).toContain('transparent 0.0%, transparent 50.0%');
    expect(style?.backgroundImage).toContain(`rgba(239, 68, 68, ${SELECTED_OVERLAP_OPACITY}) 50.0%`);
  });

  it('splits the square evenly between every colour', () => {
    const style = getSelectionWashStyle(['#111111', '#222222', '#333333'], SELECTED_OVERLAP_OPACITY);
    expect(style?.backgroundImage).toContain('33.3%');
    expect(style?.backgroundImage).toContain('66.7%');
    expect(style?.backgroundImage).toContain('100.0%');
  });
});
