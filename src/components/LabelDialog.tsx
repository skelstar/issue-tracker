import { useState, useEffect, useRef } from 'react';
import type { Label } from '../types';
import { LABEL_COLORS, nextLabelColor } from '../types';

interface Props {
  /** The label being edited; omit to create a new one. */
  label?: Label;
  /** All labels in the current project (used for duplicate names and the move-to list). */
  projectLabels: Label[];
  /** Number of tickets using `label`. */
  ticketCount: number;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
  onDelete: (moveTo?: string) => Promise<void>;
}

export default function LabelDialog({ label, projectLabels, ticketCount, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(label?.name ?? '');
  const [color, setColor] = useState(label?.color ?? nextLabelColor(projectLabels));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const otherLabels = projectLabels.filter(l => l.id !== label?.id);
  const [moveTo, setMoveTo] = useState(otherLabels[0]?.id ?? '');
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
  const duplicate = otherLabels.some(l => l.name.trim().toLowerCase() === trimmed.toLowerCase());
  const canSave = !!trimmed && !duplicate && !busy;

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

  if (label && confirmingDelete) {
    const blocked = ticketCount > 0 && otherLabels.length === 0;
    return (
      <div className="dialog-backdrop" onClick={onClose}>
        <div className="dialog" onClick={e => e.stopPropagation()}>
          <div className="dialog-header">
            <h2>Delete label?</h2>
            <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <p className="delete-confirm-body">
            The <strong>{label.name}</strong> section will be removed from this board.
          </p>
          {ticketCount > 0 && (blocked ? (
            <p className="delete-confirm-body">
              It still has {ticketCount} ticket{ticketCount === 1 ? '' : 's'} and there's no other label to move
              them to. Add another label first, or delete the tickets.
            </p>
          ) : (
            <div className="form-field">
              <label htmlFor="moveTo">Move its {ticketCount} ticket{ticketCount === 1 ? '' : 's'} to</label>
              <select id="moveTo" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
                {otherLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          ))}
          <div className="dialog-actions">
            <button className="btn-secondary" onClick={() => setConfirmingDelete(false)}>Back</button>
            <button
              className="btn-danger"
              disabled={blocked || busy}
              onClick={() => run(() => onDelete(ticketCount > 0 ? moveTo : undefined))}
            >
              Delete label
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
          <h2>{label ? 'Edit label' : 'New label'}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="labelName">Name</label>
            <input
              id="labelName"
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Server, Client, Docs…"
            />
            {duplicate && <span className="form-error">This project already has a label called that.</span>}
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
            {label && (
              <button type="button" className="btn-danger dialog-actions-left" onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!canSave}>
              {label ? 'Save' : 'Add label'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
