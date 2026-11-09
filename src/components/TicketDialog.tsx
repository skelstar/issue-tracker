import { useState, useEffect, useRef } from 'react';
import type { Ticket, Tag, Status, Priority } from '../types';
import { STATUSES, PRIORITIES } from '../types';
import PriorityIcon from './PriorityIcon';
import TagPicker, { isTagChoiceValid, tagChoiceFor, type TagChoice } from './TagPicker';

export interface TicketDraft {
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  label: TagChoice;
  epic: TagChoice;
}

interface Props {
  /** The ticket being edited; omit to create a new one. */
  ticket?: Ticket;
  labels: Tag[];
  epics: Tag[];
  onClose: () => void;
  onSave: (draft: TicketDraft) => Promise<void>;
  onDelete?: (ticket: Ticket) => void;
}

/** Create or edit a ticket. */
export default function TicketDialog({ ticket, labels, epics, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(ticket?.title ?? '');
  const [description, setDescription] = useState(ticket?.description ?? '');
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? 3);
  const [status, setStatus] = useState<Status>(ticket?.status ?? 'todo');
  const [label, setLabel] = useState(tagChoiceFor(ticket?.labelId));
  const [epic, setEpic] = useState(tagChoiceFor(ticket?.epicId));
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

  const canSave = !saving && !!title.trim() && isTagChoiceValid(label, labels) && isTagChoiceValid(epic, epics);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() || undefined, status, priority, label, epic });
    } catch (err) {
      console.error('Failed to save ticket:', err);
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{ticket ? 'Edit Ticket' : 'Create Ticket'}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="ticket-title">Title</label>
            <input
              id="ticket-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
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
            <label htmlFor="ticket-description">Description <span className="form-label-optional">(optional)</span></label>
            <textarea
              id="ticket-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more detail…"
              rows={ticket ? 4 : 3}
            />
          </div>
          <TagPicker kind="epic" id="ticket-epic" tags={epics} choice={epic} onChange={setEpic} />
          <TagPicker kind="label" id="ticket-label" tags={labels} choice={label} onChange={setLabel} />
          {ticket && (
            <div className="form-field">
              <label htmlFor="ticket-status">Status</label>
              <select id="ticket-status" value={status} onChange={e => setStatus(e.target.value as Status)}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          )}
          <div className="dialog-actions">
            {ticket && onDelete && (
              <button type="button" className="btn-danger dialog-actions-left" onClick={() => onDelete(ticket)}>
                Delete
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!canSave}>
              {saving ? 'Saving…' : ticket ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
