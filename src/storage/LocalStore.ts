import type { z } from 'zod';

/** The subset of the Web Storage API used by the stores (lets tests inject an in-memory implementation). */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserLocalStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // e.g. storage disabled by privacy settings
  }
}

export function browserSessionStorage(): KeyValueStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * One versioned, schema-validated value in browser storage. Corrupted or outdated data is discarded
 * instead of breaking the app, and an unavailable storage simply behaves as empty.
 */
export class LocalStore<Value> {
  constructor(
    readonly key: string,
    private readonly schema: z.ZodType<Value>,
    private readonly storage: KeyValueStorage | null = browserLocalStorage(),
  ) {}

  read(): Value | null {
    const raw = this.safely(() => this.storage?.getItem(this.key) ?? null);
    if (raw === null || raw === undefined) return null;
    try {
      const parsed = this.schema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      // Invalid JSON: fall through and discard.
    }
    this.clear();
    return null;
  }

  /** Returns false when the value could not be persisted (quota, disabled storage). */
  write(value: Value): boolean {
    return (
      this.safely(() => {
        if (!this.storage) return false;
        this.storage.setItem(this.key, JSON.stringify(value));
        return true;
      }) ?? false
    );
  }

  clear(): void {
    this.safely(() => this.storage?.removeItem(this.key));
  }

  private safely<Result>(operation: () => Result): Result | undefined {
    try {
      return operation();
    } catch {
      return undefined;
    }
  }
}

/** In-memory storage for tests and for browsers where storage is unavailable. */
export class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}
