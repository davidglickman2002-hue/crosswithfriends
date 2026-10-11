import {useCallback, useEffect, useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {FaTag} from 'react-icons/fa';
import './css/displayNameDialog.css';
import {MAX_DISPLAY_NAME_LENGTH, sanitizeDisplayName} from '../../lib/displayName';

// Persistent name tag editor. Opened from the account menu so a player who
// never signs up can still choose the name other players see, and keep it
// across every game.
export default function DisplayNameDialog({open, onOpenChange, initialName, onSave}) {
  const [value, setValue] = useState(initialName || '');

  // Re-seed on every open so a cancelled edit does not stick around.
  useEffect(() => {
    if (open) setValue(initialName || '');
  }, [open, initialName]);

  const handleChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = useCallback(
    (e) => {
      e.preventDefault();
      const displayName = sanitizeDisplayName(value);
      if (!displayName) return;
      onSave(displayName);
      onOpenChange(false);
    },
    [onOpenChange, onSave, value]
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="confirm-dialog--overlay" />
        <Dialog.Content className="confirm-dialog--panel">
          <Dialog.Title className="confirm-dialog--title">Name tag</Dialog.Title>
          <Dialog.Description className="name-tag-dialog--description">
            The name other players see next to your cursor. It is saved on this device and used in every game
            &mdash; no account needed.
          </Dialog.Description>
          <form onSubmit={handleSave}>
            <div className="name-tag-dialog--field">
              <FaTag className="name-tag-dialog--field-icon" aria-hidden="true" />
              <input
                className="name-tag-dialog--input"
                type="text"
                value={value}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                placeholder="Your name tag"
                aria-label="Name tag"
                onChange={handleChange}
              />
            </div>
            <div className="name-tag-dialog--hint">{`${value.trim().length}/${MAX_DISPLAY_NAME_LENGTH}`}</div>
            <div className="confirm-dialog--actions">
              <button type="button" className="btn btn--small" onClick={handleCancel}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--small btn--contained btn--primary"
                disabled={!sanitizeDisplayName(value)}
              >
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
