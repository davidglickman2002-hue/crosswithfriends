import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  DISPLAY_NAME_STORAGE_KEY,
  MAX_DISPLAY_NAME_LENGTH,
  getStoredDisplayName,
  sanitizeDisplayName,
  setDisplayName,
  subscribeToDisplayNameChange,
} from '../displayName';

describe('sanitizeDisplayName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(sanitizeDisplayName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
  });

  it('caps the length and drops the whitespace left by the cut', () => {
    const long = `${'a'.repeat(MAX_DISPLAY_NAME_LENGTH - 1)} tail`;
    const result = sanitizeDisplayName(long);
    expect(result.length).toBeLessThanOrEqual(MAX_DISPLAY_NAME_LENGTH);
    expect(result).toBe('a'.repeat(MAX_DISPLAY_NAME_LENGTH - 1));
  });

  it('rejects empty, whitespace-only and non-string input', () => {
    expect(sanitizeDisplayName('')).toBeNull();
    expect(sanitizeDisplayName('   ')).toBeNull();
    expect(sanitizeDisplayName(null)).toBeNull();
    expect(sanitizeDisplayName(42)).toBeNull();
  });
});

describe('setDisplayName / getStoredDisplayName', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no stored name', () => {
    expect(getStoredDisplayName()).toBeNull();
  });

  it('persists the name so it survives a fresh read', () => {
    expect(setDisplayName('Ada Lovelace')).toBe('Ada Lovelace');
    expect(getStoredDisplayName()).toBe('Ada Lovelace');
    expect(localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)).toBe('Ada Lovelace');
  });

  it('refuses to store an empty name', () => {
    setDisplayName('Ada');
    expect(setDisplayName('   ')).toBeNull();
    expect(getStoredDisplayName()).toBe('Ada');
  });

  it('rewrites the current page key so this game picks the name up on reload', () => {
    setDisplayName('Ada');
    expect(localStorage.getItem(`username_${window.location.href}`)).toBe('Ada');
  });

  it('clears other per-game keys so an old name cannot come back', () => {
    localStorage.setItem('username_https://example.com/beta/play/old', 'Grace');
    localStorage.setItem('username_https://example.com/other', 'Grace');
    localStorage.setItem('username_unrelated_key_shape', 'keep me');

    setDisplayName('Ada');

    expect(localStorage.getItem('username_https://example.com/beta/play/old')).toBeNull();
    expect(localStorage.getItem('username_https://example.com/other')).toBeNull();
    expect(localStorage.getItem('username_unrelated_key_shape')).toBe('keep me');
    expect(localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)).toBe('Ada');
  });
});

describe('subscribeToDisplayNameChange', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('notifies subscribers with the sanitized name', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToDisplayNameChange(handler);

    setDisplayName('  Ada   Lovelace ');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('Ada Lovelace');
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToDisplayNameChange(handler);

    unsubscribe();
    setDisplayName('Ada');

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not notify when there was nothing to save', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToDisplayNameChange(handler);

    setDisplayName('   ');

    expect(handler).not.toHaveBeenCalled();
    unsubscribe();
  });
});
