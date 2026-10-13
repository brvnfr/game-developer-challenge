import { expect, test } from './fixtures/test';

test('app boots and shows the title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible();
});
