// Quick chat: a player can send a short message that pops up above the square
// they had selected, visible to everyone in the game for a few seconds.
//
// Messages are ordinary `chat` events (see src/store/game.js `chat()`), so they
// still land in the chat log; the extra `cell` param is what makes them show as
// a bubble. These helpers are pure so the timing rules are unit-testable.

export const CHAT_BUBBLE_TTL_MS = 8000;
export const MAX_CHAT_BUBBLES = 4;

export function isBubbleMessage(message) {
  return !!(message && message.cell && Number.isInteger(message.cell.r) && Number.isInteger(message.cell.c));
}

/**
 * The bubble messages that are still fresh at `now`, oldest first, capped to
 * the most recent MAX_CHAT_BUBBLES. `users` resolves the sender's display name
 * and color at render time, since both can change after the message was sent.
 */
export function selectChatBubbles(messages, users, now, ttl = CHAT_BUBBLE_TTL_MS) {
  if (!Array.isArray(messages)) return [];
  const bubbles = [];
  messages.forEach((message) => {
    if (!isBubbleMessage(message)) return;
    const age = now - (message.timestamp || 0);
    if (age > ttl) return;
    const user = (users || {})[message.senderId] || {};
    bubbles.push({
      key: `${message.senderId}-${message.timestamp}-${message.cell.r}-${message.cell.c}`,
      r: message.cell.r,
      c: message.cell.c,
      text: message.text,
      sender: user.displayName || message.sender || '',
      senderId: message.senderId,
      color: user.color,
      timestamp: message.timestamp,
    });
  });
  return bubbles.slice(-MAX_CHAT_BUBBLES);
}

/**
 * Milliseconds until the earliest still-visible bubble disappears, or null when
 * there is nothing to expire. Used to schedule a single re-render instead of
 * running an interval.
 */
export function bubbleExpiryDelayMs(messages, now, ttl = CHAT_BUBBLE_TTL_MS) {
  if (!Array.isArray(messages)) return null;
  let delay = null;
  messages.forEach((message) => {
    if (!isBubbleMessage(message)) return;
    const remaining = (message.timestamp || 0) + ttl - now;
    if (remaining <= 0) return;
    if (delay === null || remaining < delay) {
      delay = remaining;
    }
  });
  return delay;
}
