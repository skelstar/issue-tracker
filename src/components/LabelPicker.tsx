import { useState } from 'react';
import type { Tag } from '../types';
import { isDuplicateName } from './TagPicker';

interface Props {
  labels: Tag[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Creates a label in the current project; it's then selected. */
  onCreate: (name: string) => Promise<Tag>;
}

/** Toggleable label chips plus an inline "+ New label" field. */
export default function LabelPicker({ labels, selected, onChange, onCreate }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const duplicate = isDuplicateName(name, labels);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || duplicate || creating) return;
    setCreating(true);
    try {
      const label = await onCreate(trimmed);
      onChange([...selected, label.id]);
      setName('');
      setAdding(false);
    } catch (err) {
      console.error('Failed to create label:', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="form-field">
      <label>Labels</label>
      <div className="label-picker">
        {labels.map(l => {
          const on = selected.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              className={`label-chip${on ? ' on' : ''}`}
              style={on ? { backgroundColor: l.color, borderColor: l.color } : { borderColor: l.color, color: l.color }}
              aria-pressed={on}
              onClick={() => toggle(l.id)}
            >
              {on && <span aria-hidden>✓ </span>}{l.name}
            </button>
          );
        })}
        {adding ? (
          <span className="label-chip-new">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                // Enter would otherwise submit the ticket form.
                if (e.key === 'Enter') { e.preventDefault(); create(); }
              }}
              placeholder="Label name"
              aria-label="New label name"
              autoFocus
            />
            <button type="button" className="label-chip-add" onClick={create} disabled={!name.trim() || duplicate || creating}>
              Add
            </button>
            <button type="button" className="label-chip-cancel" onClick={() => { setAdding(false); setName(''); }} aria-label="Cancel new label">
              ×
            </button>
          </span>
        ) : (
          <button type="button" className="label-chip label-chip--add" onClick={() => setAdding(true)}>
            + New label
          </button>
        )}
      </div>
      {adding && duplicate && <span className="form-error">This project already has a label called that.</span>}
    </div>
  );
}
