import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const PERFORMANCE_REPORT_DIR = path.resolve('docs/reports/performance');

/** Writes one evidence file (JSON or text) under docs/reports/performance/. */
export function writeReport(fileName: string, content: unknown): string {
  mkdirSync(PERFORMANCE_REPORT_DIR, { recursive: true });
  const filePath = path.join(PERFORMANCE_REPORT_DIR, fileName);
  writeFileSync(filePath, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  return filePath;
}

/** Short label of the current platform for file names (e.g. "linux", "win32"). */
export const PLATFORM_LABEL = process.platform;
