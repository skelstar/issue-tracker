import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Ticket, Label } from '../types';

interface Props {
  ticket: Ticket;
  label: Label | undefined;
  isDragOverlay?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onDeleteRequest?: () => void;
}

export default function TicketCard({
  ticket,
  label,
  isDragOverlay = false,
  isSelected = false,
  onSelect,
  onDeleteRequest,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={[
        'ticket-card',
        isDragging ? 'dragging' : '',
        isDragOverlay ? 'overlay' : '',
        isSelected ? 'selected' : '',
      ].filter(Boolean).join(' ')}
      onClick={e => { e.stopPropagation(); onSelect?.(); }}
      {...listeners}
      {...attributes}
    >
      <span className="ticket-title">{ticket.title}</span>
      {label && (
        <span className="ticket-badge" style={{ backgroundColor: label.color }}>
          {label.name}
        </span>
      )}
      {isSelected && !isDragOverlay && (
        <button
          className="ticket-delete-btn"
          onClick={e => { e.stopPropagation(); onDeleteRequest?.(); }}
          aria-label="Delete ticket"
        >
          🗑
        </button>
      )}
    </div>
  );
}
