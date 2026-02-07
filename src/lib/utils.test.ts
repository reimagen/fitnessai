import { describe, expect, it } from 'vitest';
import { cn, toTitleCase } from './utils';

describe('toTitleCase', () => {
  it('capitalizes words and lowercases the remaining letters', () => {
    expect(toTitleCase('hELLo wORLD')).toBe('Hello World');
  });

  it('returns empty string for empty input', () => {
    expect(toTitleCase('')).toBe('');
  });
});

describe('cn', () => {
  it('merges tailwind classes and applies latest precedence', () => {
    expect(cn('p-2 text-sm', 'p-4', false && 'hidden', undefined, 'text-lg')).toBe('p-4 text-lg');
  });
});
