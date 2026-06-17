import { useEffect } from 'react';
import type { Ticket } from '../types';

interface Props {
  ticket: Ticket;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmDialog({ ticket, onCancel, onConfirm }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Delete ticket?</h2>
          <button className="dialog-close" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <p className="delete-confirm-body">
          <strong>"{ticket.title}"</strong> will be permanently deleted.
        </p>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
