import { useState, useEffect, useRef } from 'react';
import type { Label } from '../types';

interface Props {
  labels: Label[];
  onClose: () => void;
  onSubmit: (title: string, labelId: string, newLabelName?: string) => Promise<void>;
}

export default function AddTicketDialog({ labels, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [labelChoice, setLabelChoice] = useState<string>(labels[0]?.id ?? '__new__');
  const [newLabelName, setNewLabelName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isNew = labelChoice === '__new__';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (isNew && !newLabelName.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(title.trim(), labelChoice, isNew ? newLabelName.trim() : undefined);
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Create Ticket</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>
          <div className="form-field">
            <label htmlFor="label">Label</label>
            <select
              id="label"
              value={labelChoice}
              onChange={e => setLabelChoice(e.target.value)}
            >
              {labels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
              <option value="__new__">+ Create new label…</option>
            </select>
          </div>
          {isNew && (
            <div className="form-field">
              <label htmlFor="newLabel">New label name</label>
              <input
                id="newLabel"
                type="text"
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                placeholder="e.g. Bug, Feature, Chore…"
              />
            </div>
          )}
          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !title.trim() || (isNew && !newLabelName.trim())}
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
