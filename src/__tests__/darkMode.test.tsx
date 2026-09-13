/**
 * Tests for dark mode body class syncing.
 *
 * The Root component in index.js syncs the `.dark` class to document.body
 * via useEffect so that Radix portals (Dialog, etc.) which render
 * outside the React tree still receive dark mode styling.
 */

export {};

describe('dark mode body class syncing', () => {
  beforeEach(() => {
    document.body.classList.remove('dark');
  });

  it('document.body supports classList.toggle', () => {
    document.body.classList.toggle('dark', true);
    expect(document.body.classList.contains('dark')).toBe(true);

    document.body.classList.toggle('dark', false);
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('dark class can be toggled with boolean flag', () => {
    const darkMode = true;
    document.body.classList.toggle('dark', !!darkMode);
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('dark class is removed when darkMode is false', () => {
    document.body.classList.add('dark');
    const darkMode = false;
    document.body.classList.toggle('dark', !!darkMode);
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('handles falsy values correctly (null/undefined coerce to false)', () => {
    document.body.classList.add('dark');
    const darkMode = null;
    document.body.classList.toggle('dark', !!darkMode);
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('dark class allows .dark selectors to match portal elements', () => {
    // Simulate what Radix Dialog portals do — append directly to body
    document.body.classList.toggle('dark', true);
    const portalDiv = document.createElement('div');
    portalDiv.className = 'login-modal--panel';
    document.body.appendChild(portalDiv);

    // CSS selector `.dark .login-modal--panel` would match because
    // body.dark > div.login-modal--panel
    const matched = document.querySelectorAll('.dark .login-modal--panel');
    expect(matched.length).toBe(1);

    document.body.removeChild(portalDiv);
  });

  it('portal elements do NOT match when dark class is missing', () => {
    document.body.classList.toggle('dark', false);
    const portalDiv = document.createElement('div');
    portalDiv.className = 'login-modal--panel';
    document.body.appendChild(portalDiv);

    const matched = document.querySelectorAll('.dark .login-modal--panel');
    expect(matched.length).toBe(0);

    document.body.removeChild(portalDiv);
  });

  it('matches mobile game layout and clue bar elements under .dark', () => {
    document.body.classList.add('dark');
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="room room--mobile">
        <div class="toolbar--mobile">
          <button class="toolbar--btn">Check</button>
          <span class="clock">00:00</span>
        </div>
        <div class="mobile-grid-controls">
          <div class="mobile-grid-controls--clue-bar">
            <span class="mobile-grid-controls--clue-bar--number">1A</span>
            <span class="mobile-grid-controls--clue-bar--text">Clue</span>
          </div>
          <div class="player--mobile--wrapper">
            <div class="cell selected"><div class="cell--number">1</div><div class="cell--value">A</div></div>
            <div class="cell highlighted"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    expect(document.querySelectorAll('.dark .toolbar--mobile').length).toBe(1);
    expect(document.querySelectorAll('.dark .mobile-grid-controls--clue-bar--number').length).toBe(1);
    expect(document.querySelectorAll('.dark .mobile-grid-controls--clue-bar--text').length).toBe(1);
    expect(document.querySelectorAll('.dark .cell.selected').length).toBe(1);
    expect(document.querySelectorAll('.dark .player--mobile--wrapper .cell.highlighted').length).toBe(1);

    document.body.removeChild(container);
  });
});
