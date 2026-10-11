import {test, expect, assertNoFatalErrors, assertPageRendered} from '../fixtures/base';

test.describe('Puzzle list', () => {
  test('loads puzzles from the API', async ({smoke}) => {
    const {page, consoleErrors} = smoke;

    await page.goto('/');
    await assertPageRendered(page);

    // Wait for puzzle entries to appear (API can be slow)
    await expect(page.locator('.entry').first()).toBeVisible({timeout: 15_000});

    // Multiple entries loaded
    const entryCount = await page.locator('.entry').count();
    expect(entryCount).toBeGreaterThan(0);

    assertNoFatalErrors(consoleErrors);
  });

  test('search input filters results by title or author', async ({smoke}) => {
    const {page, consoleErrors} = smoke;

    await page.goto('/');
    await assertPageRendered(page);

    // Wait for initial puzzles to load
    await expect(page.locator('.entry').first()).toBeVisible({timeout: 15_000});

    // Type a search term and wait for the filtered API response
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/puzzle_list') && r.url().includes('mini')
    );
    await page.locator('input.welcome--searchbar').fill('mini');
    await responsePromise;

    // Wait for DOM to actually reflect the filtered results (not stale entries)
    await expect(page.locator('.entry--top--left').first()).toContainText('Mini', {timeout: 10_000});

    // Every visible entry title/author should match 'mini'
    const allText = await page.locator('.entry').allTextContents();
    expect(allText.length).toBeGreaterThan(0);
    for (const text of allText) {
      expect(text.toLowerCase()).toContain('mini');
    }

    assertNoFatalErrors(consoleErrors);
  });

  test('size filter restricts results to selected sizes', async ({smoke}) => {
    const {page, consoleErrors} = smoke;

    await page.goto('/');
    await assertPageRendered(page);

    // Wait for initial puzzles to load
    await expect(page.locator('.entry').first()).toBeVisible({timeout: 15_000});

    // Uncheck Midi checkbox and wait for the filtered API response
    const midiCheckbox = page.locator('input[type="checkbox"][data-header="Size"][data-name="Midi"]');
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/puzzle_list') && r.url().includes('Midi')
    );
    await midiCheckbox.click();
    const response = await responsePromise;

    // Verify the API request sent the correct filter
    expect(response.url()).toContain('filter%5BsizeFilter%5D%5BMidi%5D=false');

    // Verify no Midi puzzles appear in the filtered results
    await expect(page.locator('.entry').first()).toBeVisible({timeout: 10_000});
    const sizes = await page.locator('.entry--top--left').allTextContents();
    expect(sizes.length).toBeGreaterThan(0);
    for (const text of sizes) {
      expect(text).not.toContain('Midi');
    }

    assertNoFatalErrors(consoleErrors);
  });

  test('journal chips filter by publication and round-trip through the URL', async ({smoke}) => {
    const {page, consoleErrors} = smoke;

    await page.goto('/');
    await assertPageRendered(page);

    await expect(page.locator('.entry').first()).toBeVisible({timeout: 15_000});

    // "All journals" is the default: no publication restriction.
    await expect(page.locator('.welcome--chip--all')).toHaveClass(/active/);

    // Selecting a journal asks the API for that publication only...
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/puzzle_list') && r.url().includes('sourceFilter%5D=nyt')
    );
    await page.locator('.welcome--chip[data-source-id="nyt"]').click();
    const response = await responsePromise;
    expect(response.url()).toContain('filter%5BsourceFilter%5D=nyt');

    // ...and the selection is shareable, so the URL carries it.
    expect(page.url()).toContain('source=nyt');
    await expect(page.locator('.welcome--chip[data-source-id="nyt"]')).toHaveClass(/active/);
    await expect(page.locator('.welcome--chip--all')).not.toHaveClass(/active/);

    // "All journals" clears it again.
    const cleared = page.waitForResponse(
      (r) => r.url().includes('/api/puzzle_list') && r.url().includes('sourceFilter%5D=&')
    );
    await page.locator('.welcome--chip--all').click();
    await cleared;
    expect(page.url()).not.toContain('source=nyt');

    assertNoFatalErrors(consoleErrors);
  });

  test('latest/top-rated toggle changes the sort sent to the API', async ({smoke}) => {
    const {page, consoleErrors} = smoke;

    await page.goto('/');
    await assertPageRendered(page);

    await expect(page.locator('.entry').first()).toBeVisible({timeout: 15_000});

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/puzzle_list') && r.url().includes('sortBy%5D=rating_desc')
    );
    await page.getByRole('button', {name: 'Top rated'}).click();
    const response = await responsePromise;
    expect(response.url()).toContain('filter%5BsortBy%5D=rating_desc');

    assertNoFatalErrors(consoleErrors);
  });

  test('puzzle entry links to a play page', async ({smoke}) => {
    const {page, consoleErrors} = smoke;

    await page.goto('/');
    await expect(page.locator('.entry').first()).toBeVisible({timeout: 15_000});

    // First entry link should point to /beta/play/
    const firstEntryLink = page.locator('a[href*="/beta/play/"]').first();
    const href = await firstEntryLink.getAttribute('href');
    expect(href).toMatch(/\/beta\/play\//);

    assertNoFatalErrors(consoleErrors);
  });
});
