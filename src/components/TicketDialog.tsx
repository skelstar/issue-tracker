import { useState, useEffect, useRef } from 'react';
import type { Ticket, Tag, Status, Priority, TicketType } from '../types';
import { STATUSES, PRIORITIES } from '../types';
import PriorityIcon from './PriorityIcon';
import TicketTypeSelect from './TicketTypeSelect';
import TagPicker, { isTagChoiceValid, tagChoiceFor, type TagChoice } from './TagPicker';
import LabelPicker from './LabelPicker';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadImage } from '../api/client';

/** The image files in a paste or drop, if any. */
function imageFiles(data: DataTransfer): File[] {
  return Array.from(data.files).filter(f => f.type.startsWith('image/'));
}

export interface TicketDraft {
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  type: TicketType;
  labelIds: string[];
  epic: TagChoice;
}

interface Props {
  /** The ticket being edited; omit to create a new one. */
  ticket?: Ticket;
  labels: Tag[];
  epics: Tag[];
  onClose: () => void;
  onSave: (draft: TicketDraft) => Promise<void>;
  onCreateLabel: (name: string) => Promise<Tag>;
  onDelete?: (ticket: Ticket) => void;
}

/** Create or edit a ticket. */
export default function TicketDialog({ ticket, labels, epics, onClose, onSave, onCreateLabel, onDelete }: Props) {
  const [title, setTitle] = useState(ticket?.title ?? '');
  const [description, setDescription] = useState(ticket?.description ?? '');
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? 3);
  const [type, setType] = useState<TicketType>(ticket?.type ?? 'task');
  const [status, setStatus] = useState<Status>(ticket?.status ?? 'todo');
  const [labelIds, setLabelIds] = useState<string[]>(ticket?.labelIds ?? []);
  const [epic, setEpic] = useState(tagChoiceFor(ticket?.epicId));
  const [saving, setSaving] = useState(false);
  // Existing tickets with a description open showing it rendered as Markdown;
  // clicking it switches to the editor.
  const [editingDescription, setEditingDescription] = useState(!ticket?.description?.trim());
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Image from the description shown enlarged over the dialog.
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Insert pasted or dropped images into the description at the cursor. A placeholder
   * is inserted straight away and replaced with the image's Markdown once uploaded.
   */
  function insertImages(files: File[]) {
    const el = descriptionRef.current;
    const start = el?.selectionStart ?? description.length;
    const end = el?.selectionEnd ?? description.length;
    const placeholders = files.map(() => `![Uploading image ${Math.random().toString(36).slice(2, 8)}…]()`);
    const inserted = placeholders.join('\n');
    setDescription(d => d.slice(0, start) + inserted + d.slice(end));
    setUploadError(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + inserted.length, start + inserted.length);
    });
    files.forEach(async (file, i) => {
      setUploading(n => n + 1);
      try {
        const url = await uploadImage(file);
        setDescription(d => d.replace(placeholders[i], `![image](${url})`));
      } catch (err) {
        console.error('Image upload failed:', err);
        setUploadError('Couldn’t upload image (PNG, JPEG, GIF or WebP up to 10 MB).');
        setDescription(d => d.replace(placeholders[i], ''));
      } finally {
        setUploading(n => n - 1);
      }
    });
  }

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Escape closes an enlarged image first, then the dialog.
      if (zoomedImage) setZoomedImage(null);
      else onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomedImage]);

  const canSave = !saving && uploading === 0 && !!title.trim() && isTagChoiceValid(epic, epics);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() || undefined, status, priority, type, labelIds, epic });
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
          <div className="form-row">
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
          <div className="form-field form-field--inline">
            <label>Type</label>
            <TicketTypeSelect value={type} onChange={setType} />
          </div>
          </div>
          <div className="form-field">
            <label htmlFor="ticket-description">Description <span className="form-label-optional">(optional)</span></label>
            {editingDescription ? (
              <textarea
                id="ticket-description"
                ref={descriptionRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onPaste={e => {
                  const files = imageFiles(e.clipboardData);
                  if (!files.length) return;
                  e.preventDefault();
                  insertImages(files);
                }}
                onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
                onDrop={e => {
                  const files = imageFiles(e.dataTransfer);
                  if (!files.length) return;
                  e.preventDefault();
                  insertImages(files);
                }}
                onBlur={() => { if (ticket && description.trim() && uploading === 0) setEditingDescription(false); }}
                onKeyDown={e => {
                  if (e.key === 'Escape' && ticket && description.trim()) {
                    e.stopPropagation();
                    setEditingDescription(false);
                  }
                }}
                autoFocus={!!ticket?.description?.trim()}
                placeholder="Add more detail… (Markdown supported; paste or drop images)"
                rows={ticket ? 6 : 3}
              />
            ) : (
              <div
                className="markdown-preview"
                role="button"
                tabIndex={0}
                title="Click to edit"
                onClick={e => {
                  // Let links inside the description open normally.
                  const target = e.target as HTMLElement;
                  if (target.closest('a')) return;
                  if (target instanceof HTMLImageElement) {
                    setZoomedImage({ src: target.src, alt: target.alt });
                    return;
                  }
                  setEditingDescription(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) {
                    e.preventDefault();
                    setEditingDescription(true);
                  }
                }}
              >
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{ a: props => <a {...props} target="_blank" rel="noreferrer" /> }}
                >
                  {description}
                </Markdown>
              </div>
            )}
            {uploading > 0 && <div className="form-hint">Uploading image…</div>}
            {uploadError && <div className="form-hint form-hint--error">{uploadError}</div>}
          </div>
          <TagPicker kind="epic" id="ticket-epic" tags={epics} choice={epic} onChange={setEpic} />
          <LabelPicker labels={labels} selected={labelIds} onChange={setLabelIds} onCreate={onCreateLabel} />
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
      {zoomedImage && (
        <div
          className="image-zoom"
          role="dialog"
          aria-label="Enlarged image"
          onClick={e => { e.stopPropagation(); setZoomedImage(null); }}
        >
          <img src={zoomedImage.src} alt={zoomedImage.alt} />
          <button className="image-zoom-close" aria-label="Close image">×</button>
        </div>
      )}
    </div>
  );
}
