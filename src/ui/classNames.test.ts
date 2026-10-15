import { describe, expect, it } from 'vitest';
import { classNames } from './classNames';

describe('classNames', () => {
  it('keeps the names that apply, in order', () => {
    expect(classNames('panel', false, 'dialog', undefined, null, '', 'network-dialog')).toBe(
      'panel dialog network-dialog',
    );
    expect(classNames()).toBe('');
  });
});
