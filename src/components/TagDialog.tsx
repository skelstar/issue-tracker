import { useState, useEffect, useRef } from 'react';
import type { Tag, TagKind } from '../types';
import { LABEL_COLORS, TAG_NOUN, nextTagColor } from '../types';
import { isDuplicateName } from './TagPicker';

interface Props {
  kind: TagKind;
  /** The label/epic being edited; omit to create a new one. */
  tag?: Tag;
  /** All of this kind in the current project (for duplicate names and the move-to list). */
  siblings: Tag[];
  /** Number of tickets using `tag`. */
  ticketCount: number;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
  /** moveTo: where its tickets go; null leaves them without one. */
  onDelete: (moveTo: string | null) => Promise<void>;
}

/** Create, rename/recolour, or delete a label or epic. */
export default function TagDialog({ kind, tag, siblings, ticketCount, onClose, onSave, onDelete }: Props) {
  const noun = TAG_NOUN[kind];
  const [name, setName] = useState(tag?.name ?? '');
  const [color, setColor] = useState(tag?.color ?? nextTagColor(siblings));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const others = siblings.filter(t => t.id !== tag?.id);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = name.trim();
  const duplicate = isDuplicateName(trimmed, siblings, tag?.id);
  const canSave = !!trimmed && !duplicate && !busy;
  const plural = ticketCount === 1 ? 'ticket' : 'tickets';

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSave) run(() => onSave(trimmed, color));
  }

  if (tag && confirmingDelete) {
    return (
      <div className="dialog-backdrop" onClick={onClose}>
        <div className="dialog" onClick={e => e.stopPropagation()}>
          <div className="dialog-header">
            <h2>Delete {noun}?</h2>
            <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <p className="delete-confirm-body">
            <strong>{tag.name}</strong> will be deleted.
          </p>
          {ticketCount > 0 && (
            <div className="form-field">
              <label htmlFor="moveTo">Its {ticketCount} {plural} will get</label>
              <select id="moveTo" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
                <option value="">No {noun}</option>
                {others.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div className="dialog-actions">
            <button className="btn-secondary" onClick={() => setConfirmingDelete(false)}>Back</button>
            <button className="btn-danger" disabled={busy} onClick={() => run(() => onDelete(moveTo || null))}>
              Delete {noun}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{tag ? `Edit ${noun}` : `New ${noun}`}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="tagName">Name</label>
            <input
              id="tagName"
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {duplicate && <span className="form-error">This project already has a {noun} called that.</span>}
          </div>
          <div className="form-field">
            <label>Colour</label>
            <div className="color-picker">
              {LABEL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${c === color ? ' active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  aria-pressed={c === color}
                />
              ))}
            </div>
          </div>
          <div className="dialog-actions">
            {tag && (
              <button type="button" className="btn-danger dialog-actions-left" onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!canSave}>
              {tag ? 'Save' : `Add ${noun}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
