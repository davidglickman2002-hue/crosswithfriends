import {describe, it, expect} from 'vitest';
import {
  CHAT_BUBBLE_TTL_MS,
  MAX_CHAT_BUBBLES,
  bubbleExpiryDelayMs,
  isBubbleMessage,
  selectChatBubbles,
} from '../chatBubbles';

const NOW = 1_700_000_000_000;

const users = {
  'user-1': {displayName: 'Ada', color: '#ff0000'},
  'user-2': {displayName: 'Grace', color: '#00ff00'},
};

const message = (overrides = {}) => ({
  text: 'hi',
  senderId: 'user-1',
  sender: 'stale-name',
  timestamp: NOW,
  ...overrides,
});

describe('isBubbleMessage', () => {
  it('accepts messages pinned to an integer cell', () => {
    expect(isBubbleMessage(message({cell: {r: 2, c: 3}}))).toBe(true);
  });

  it('rejects plain chat messages and malformed cells', () => {
    expect(isBubbleMessage(message())).toBe(false);
    expect(isBubbleMessage(message({cell: {r: 2}}))).toBe(false);
    expect(isBubbleMessage(message({cell: {r: '2', c: 3}}))).toBe(false);
    expect(isBubbleMessage(undefined)).toBe(false);
  });
});

describe('selectChatBubbles', () => {
  it('ignores messages without a cell', () => {
    expect(selectChatBubbles([message(), message({cell: {r: 0, c: 0}})], users, NOW)).toHaveLength(1);
  });

  it('resolves the sender name and color from the users map, not the message', () => {
    const [bubble] = selectChatBubbles([message({cell: {r: 1, c: 1}})], users, NOW);
    expect(bubble.sender).toBe('Ada');
    expect(bubble.color).toBe('#ff0000');
    expect(bubble.r).toBe(1);
    expect(bubble.c).toBe(1);
    expect(bubble.text).toBe('hi');
  });

  it('falls back to the stored sender when the user is unknown', () => {
    const [bubble] = selectChatBubbles(
      [message({senderId: 'ghost', sender: 'Ghost', cell: {r: 0, c: 4}})],
      users,
      NOW
    );
    expect(bubble.sender).toBe('Ghost');
    expect(bubble.color).toBeUndefined();
  });

  it('drops bubbles older than the TTL and keeps exactly-TTL ones', () => {
    const messages = [
      message({timestamp: NOW - CHAT_BUBBLE_TTL_MS - 1, cell: {r: 0, c: 0}}),
      message({timestamp: NOW - CHAT_BUBBLE_TTL_MS, cell: {r: 0, c: 1}}),
    ];
    const bubbles = selectChatBubbles(messages, users, NOW);
    expect(bubbles.map((b) => b.c)).toEqual([1]);
  });

  it('caps the number of visible bubbles to the newest ones', () => {
    const messages = Array.from({length: MAX_CHAT_BUBBLES + 3}, (_, i) =>
      message({text: `m${i}`, timestamp: NOW - i * 100, cell: {r: 0, c: i}})
    );
    const bubbles = selectChatBubbles(messages, users, NOW);
    expect(bubbles).toHaveLength(MAX_CHAT_BUBBLES);
    expect(bubbles.map((b) => b.text)).toEqual(['m3', 'm4', 'm5', 'm6']);
  });

  it('tolerates non-array input', () => {
    expect(selectChatBubbles(undefined, users, NOW)).toEqual([]);
  });

  it('gives each bubble a distinct key', () => {
    const bubbles = selectChatBubbles(
      [
        message({cell: {r: 0, c: 0}}),
        message({timestamp: NOW + 1, cell: {r: 0, c: 0}}),
        message({senderId: 'user-2', cell: {r: 0, c: 0}}),
      ],
      users,
      NOW
    );
    expect(new Set(bubbles.map((b) => b.key)).size).toBe(3);
  });
});

describe('bubbleExpiryDelayMs', () => {
  it('returns the time until the earliest visible bubble expires', () => {
    const messages = [
      message({timestamp: NOW - 1000, cell: {r: 0, c: 0}}),
      message({timestamp: NOW - 3000, cell: {r: 1, c: 1}}),
    ];
    expect(bubbleExpiryDelayMs(messages, NOW)).toBe(CHAT_BUBBLE_TTL_MS - 3000);
  });

  it('returns null when nothing is pinned to a cell', () => {
    expect(bubbleExpiryDelayMs([message()], NOW)).toBeNull();
    expect(bubbleExpiryDelayMs(null, NOW)).toBeNull();
  });

  it('ignores already-expired bubbles', () => {
    const messages = [message({timestamp: NOW - CHAT_BUBBLE_TTL_MS - 5, cell: {r: 0, c: 0}})];
    expect(bubbleExpiryDelayMs(messages, NOW)).toBeNull();
  });
});
