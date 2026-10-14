import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page: Page): Promise<void> {
  // The canvas is decorative for assistive tech (aria-hidden); the HUD exposes the match state semantically.
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude('canvas').analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

test.describe('accessibility audit (T-046)', () => {
  test('menu, name dialog and options have no WCAG A/AA violations', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ captainName: null });
    await expectNoViolations(page);

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('dialog', { name: 'Name your captain' })).toBeVisible();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Options' }).click();
    await page.getByRole('textbox', { name: 'Game session time' }).fill('500');
    await expectNoViolations(page);
  });

  test('match HUD, pause dialog and result screen have no WCAG A/AA violations', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 180, spawnSeconds: 10 });
    await game.startMatch();
    await expectNoViolations(page);

    await page.keyboard.press('Escape');
    await expect(game.pauseDialog()).toBeVisible();
    await expectNoViolations(page);
    await game.pauseDialog().getByRole('button', { name: 'Resume' }).click();

    await game.advanceUntilEnded(180_000);
    await game.advance(2_000);
    await game.waitForResult('Your ship sank');
    await expectNoViolations(page);
  });

  test('menus can be used with the keyboard alone, with a visible focus ring', async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    await expect(page.getByRole('button', { name: 'Play' })).toBeFocused();
    await page.keyboard.press('Tab');
    const optionsButton = page.getByRole('button', { name: 'Options' });
    await expect(optionsButton).toBeFocused();
    const outline = await optionsButton.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).toBe('solid');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Game session time' })).toBeFocused();
  });
});
