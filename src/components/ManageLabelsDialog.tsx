import { useEffect } from 'react';
import type { Tag, Ticket } from '../types';

interface Props {
  labels: Tag[];
  tickets: Ticket[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (label: Tag) => void;
}

/** Lists the project's labels, with add and edit (rename/recolour/delete). */
export default function ManageLabelsDialog({ labels, tickets, onClose, onAdd, onEdit }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Labels</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {labels.length === 0 ? (
          <p className="tag-list-empty">No labels in this project yet.</p>
        ) : (
          <ul className="tag-list">
            {labels.map(l => {
              const count = tickets.filter(t => t.labelId === l.id).length;
              return (
                <li key={l.id}>
                  <button className="tag-list-row" onClick={() => onEdit(l)} title="Edit label">
                    <span className="ticket-badge" style={{ backgroundColor: l.color }}>{l.name}</span>
                    <span className="tag-list-count">{count} ticket{count === 1 ? '' : 's'}</span>
                    <span className="tag-list-edit" aria-hidden>✎</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="dialog-actions">
          <button className="btn-secondary dialog-actions-left" onClick={onAdd}>+ Add label</button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
