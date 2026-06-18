import { useState, useEffect, useRef } from 'react';
import type { Ticket, Label, Status, Priority } from '../types';
import { STATUSES, PRIORITIES } from '../types';
import PriorityIcon from './PriorityIcon';

interface Props {
  ticket: Ticket;
  labels: Label[];
  onClose: () => void;
  onSave: (id: string, updates: { title: string; description?: string; labelId: string; status: Status; priority: Priority }) => Promise<void>;
  onDelete: (ticket: Ticket) => void;
}

export default function EditTicketDialog({ ticket, labels, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description ?? '');
  const [priority, setPriority] = useState<Priority>(ticket.priority ?? 3);
  const [labelId, setLabelId] = useState(ticket.labelId);
  const [status, setStatus] = useState<Status>(ticket.status);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(ticket.id, { title: title.trim(), description: description.trim() || undefined, labelId, status, priority });
    } catch (err) {
      console.error('Failed to save ticket:', err);
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Edit Ticket</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="form-field form-field--inline">
            <label>Priority</label>
            <div className="priority-picker">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`priority-pick-btn${priority === p.value ? ' active' : ''}`}
                  onClick={() => setPriority(p.value)}
                  title={p.label}
                >
                  <PriorityIcon priority={p.value} size="md" />
                </button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="edit-description">Description <span className="form-label-optional">(optional)</span></label>
            <textarea
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more detail…"
              rows={4}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-label">Label</label>
            <select
              id="edit-label"
              value={labelId}
              onChange={e => setLabelId(e.target.value)}
            >
              {labels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="edit-status">Status</label>
            <select
              id="edit-status"
              value={status}
              onChange={e => setStatus(e.target.value as Status)}
            >
              {STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn-danger"
              onClick={() => onDelete(ticket)}
              style={{ marginRight: 'auto' }}
            >
              Delete
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
