import {useCallback, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import {FaCommentDots} from 'react-icons/fa';
import './css/quickChat.css';

export const MAX_QUICK_CHAT_LENGTH = 140;

/**
 * "Say something" button for the game view: opens a one-line composer and sends
 * the message pinned to the square currently selected, where it pops up for
 * everyone (see src/lib/chatBubbles.js). The message is an ordinary chat
 * message, so it also lands in the chat log.
 */
export default function QuickChat({onSend, onClose, mobile}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setMessage('');
    if (onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, close]);

  const handleToggle = useCallback(() => {
    if (open) {
      close();
    } else {
      setOpen(true);
    }
  }, [open, close]);

  const handleChange = useCallback((event) => {
    setMessage(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    },
    [close]
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const text = message.trim();
      if (!text) return;
      onSend(text);
      close();
    },
    [message, onSend, close]
  );

  return (
    <div ref={containerRef} className={clsx('quick-chat', {'quick-chat--mobile': mobile})}>
      {open && (
        <form className="quick-chat--panel" onSubmit={handleSubmit}>
          <div className="quick-chat--hint">Pops up above your selected square</div>
          <input
            ref={inputRef}
            className="quick-chat--input"
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            maxLength={MAX_QUICK_CHAT_LENGTH}
            placeholder="Say something…"
            aria-label="Quick chat message"
          />
          <div className="quick-chat--actions">
            <button type="button" className="btn btn--small" onClick={close}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--small btn--contained btn--primary"
              disabled={!message.trim()}
            >
              Send
            </button>
          </div>
        </form>
      )}
      <button
        type="button"
        className={clsx('quick-chat--button', {active: open})}
        onClick={handleToggle}
        aria-label={open ? 'Close quick chat' : 'Send a quick message'}
        aria-expanded={open}
        title="Say something"
      >
        <FaCommentDots className="quick-chat--button-icon" />
        <span className="quick-chat--button-label">Say</span>
      </button>
    </div>
  );
}
