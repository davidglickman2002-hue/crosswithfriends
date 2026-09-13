import React, {useCallback} from 'react';
import {MdBackspace, MdSwapHoriz, MdArrowForward, MdArrowDownward} from 'react-icons/md';
import './css/keyboard.css';

export interface KeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace?: () => void;
  onDirectionToggle?: () => void;
  direction?: 'across' | 'down';
  disabled?: boolean;
  className?: string;
}

const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
const ROW_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

export const Keyboard: React.FC<KeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onDirectionToggle,
  direction = 'across',
  disabled = false,
  className = '',
}) => {
  const handleKeyClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (disabled) return;
      const key = e.currentTarget.getAttribute('data-key');
      if (key) onKeyPress(key);
    },
    [disabled, onKeyPress]
  );

  const handleBackspaceClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (disabled) return;
      if (onBackspace) {
        onBackspace();
      } else {
        onKeyPress('BACKSPACE');
      }
    },
    [disabled, onBackspace, onKeyPress]
  );

  const handleDirectionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (disabled) return;
      if (onDirectionToggle) {
        onDirectionToggle();
      } else {
        onKeyPress('TOGGLE_DIRECTION');
      }
    },
    [disabled, onDirectionToggle, onKeyPress]
  );

  return (
    <div
      className={`onscreen-keyboard ${disabled ? 'disabled' : ''} ${className}`.trim()}
      role="region"
      aria-label="On-Screen Keyboard"
    >
      <div className="onscreen-keyboard--row">
        {ROW_1.map((letter) => (
          <button
            key={letter}
            type="button"
            data-key={letter}
            className="onscreen-keyboard--key"
            onClick={handleKeyClick}
            disabled={disabled}
            aria-label={letter}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="onscreen-keyboard--row">
        <div className="onscreen-keyboard--spacer-half" />
        {ROW_2.map((letter) => (
          <button
            key={letter}
            type="button"
            data-key={letter}
            className="onscreen-keyboard--key"
            onClick={handleKeyClick}
            disabled={disabled}
            aria-label={letter}
          >
            {letter}
          </button>
        ))}
        <div className="onscreen-keyboard--spacer-half" />
      </div>

      <div className="onscreen-keyboard--row">
        <button
          type="button"
          className="onscreen-keyboard--key onscreen-keyboard--key-action onscreen-keyboard--key-direction"
          onClick={handleDirectionClick}
          disabled={disabled}
          aria-label={`Toggle direction (currently ${direction})`}
          title={`Toggle direction (currently ${direction})`}
        >
          <span className="onscreen-keyboard--direction-icon">
            {direction === 'across' ? <MdArrowForward /> : <MdArrowDownward />}
          </span>
          <span className="onscreen-keyboard--direction-toggle">
            <MdSwapHoriz />
          </span>
        </button>

        {ROW_3.map((letter) => (
          <button
            key={letter}
            type="button"
            data-key={letter}
            className="onscreen-keyboard--key"
            onClick={handleKeyClick}
            disabled={disabled}
            aria-label={letter}
          >
            {letter}
          </button>
        ))}

        <button
          type="button"
          className="onscreen-keyboard--key onscreen-keyboard--key-action onscreen-keyboard--key-backspace"
          onClick={handleBackspaceClick}
          disabled={disabled}
          aria-label="Backspace"
          title="Backspace"
        >
          <MdBackspace className="onscreen-keyboard--backspace-icon" />
        </button>
      </div>
    </div>
  );
};

export default Keyboard;
