// The "name tag" is the display name a player is known by inside a game. It
// lives in localStorage so a guest who never signs up still keeps it, and it is
// what Game/Chat push to the server as the player's name.
//
// Two keys are involved:
//   username_default           - the persistent, cross-game name tag (this file)
//   username_<full page url>   - a per-game value written while playing
// A deliberate name-tag change has to rewrite the per-URL copies too: otherwise
// reloading a game you have already played would resurrect the old name from
// its URL-keyed value and the change would look like it had not stuck.

export const DISPLAY_NAME_STORAGE_KEY = 'username_default';
export const DISPLAY_NAME_CHANGED_EVENT = 'cwf:display-name-changed';
export const MAX_DISPLAY_NAME_LENGTH = 24;

const GAME_NAME_KEY_PREFIX = 'username_';

// Only URL-keyed copies are ours to clear - `username_default` and any other
// key that happens to share the prefix must be left alone.
const GAME_NAME_KEY_PATTERN = /^username_https?:\/\//;

function gameNameKey() {
  return `${GAME_NAME_KEY_PREFIX}${window.location.href}`;
}

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage unavailable (private mode, blocked cookies): no stored name.
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the name still applies to this page's session.
  }
}

function dropStaleGameNames(keepKey) {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key === keepKey) return;
      if (GAME_NAME_KEY_PATTERN.test(key)) localStorage.removeItem(key);
    });
  } catch {
    // Storage unavailable: nothing to clean up.
  }
}

// Trim, collapse runs of whitespace and cap the length so a pasted paragraph
// cannot end up as every player's cursor label.
export function sanitizeDisplayName(rawName) {
  if (typeof rawName !== 'string') return null;
  const collapsed = rawName.replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME_LENGTH).trim();
  return collapsed || null;
}

// The persisted name tag, or null when this device has never set one.
export function getStoredDisplayName() {
  const stored = readStored(DISPLAY_NAME_STORAGE_KEY);
  return typeof stored === 'string' && stored.trim() ? stored : null;
}

// Persist the name tag for this device and tell the mounted game/Chat about it.
// Returns the sanitized name, or null when there was nothing usable to save.
export function setDisplayName(rawName) {
  const displayName = sanitizeDisplayName(rawName);
  if (!displayName) return null;
  writeStored(DISPLAY_NAME_STORAGE_KEY, displayName);
  writeStored(gameNameKey(), displayName);
  dropStaleGameNames(gameNameKey());
  window.dispatchEvent(new CustomEvent(DISPLAY_NAME_CHANGED_EVENT, {detail: {displayName}}));
  return displayName;
}

// Subscribe to name-tag changes and get an unsubscribe function back.
export function subscribeToDisplayNameChange(handler) {
  const listener = (event) => {
    if (typeof event?.detail?.displayName === 'string') handler(event.detail.displayName);
  };
  window.addEventListener(DISPLAY_NAME_CHANGED_EVENT, listener);
  return () => window.removeEventListener(DISPLAY_NAME_CHANGED_EVENT, listener);
}
