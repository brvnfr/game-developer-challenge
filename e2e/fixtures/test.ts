import { test as base, expect } from '@playwright/test';

/**
 * Base fixture shared by every spec.
 * - Each test runs in a fresh browser context (isolated storage, service worker and cookies).
 * - Unhandled page errors and console errors fail the test (README: "console without unhandled errors").
 *   Tests that deliberately provoke failures allow-list the expected messages with
 *   `test.use({ allowConsoleErrors: { patterns: [/…/] } })`.
 */
/** Console messages a test expects (e.g. failed downloads it provokes on purpose). */
export interface ConsoleAllowList {
  readonly patterns: readonly RegExp[];
}

interface Fixtures {
  allowConsoleErrors: ConsoleAllowList;
  consoleGuard: undefined;
}

export const test = base.extend<Fixtures>({
  allowConsoleErrors: [{ patterns: [] }, { option: true }],
  consoleGuard: [
    async ({ page, allowConsoleErrors }, use) => {
      const problems: string[] = [];
      const isAllowed = (text: string) => allowConsoleErrors.patterns.some((pattern) => pattern.test(text));
      page.on('pageerror', (error) => {
        if (!isAllowed(error.message)) problems.push(`pageerror: ${error.message}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error' && !isAllowed(message.text())) problems.push(`console.error: ${message.text()}`);
      });
      await use(undefined);
      expect(problems, 'Unexpected errors in the browser console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
