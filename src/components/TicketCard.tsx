import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Ticket, Label } from '../types';
import PriorityIcon from './PriorityIcon';

interface Props {
  ticket: Ticket;
  label: Label | undefined;
  isDragOverlay?: boolean;
  onEdit?: () => void;
}

export default function TicketCard({ ticket, label, isDragOverlay = false, onEdit }: Props) {
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
      ].filter(Boolean).join(' ')}
      onClick={e => { e.stopPropagation(); if (!isDragOverlay) onEdit?.(); }}
      {...listeners}
      {...attributes}
    >
      <div className="ticket-header">
        <span className="ticket-title">{ticket.title}</span>
        <PriorityIcon priority={ticket.priority} />
      </div>
      {label && (
        <span className="ticket-badge" style={{ backgroundColor: label.color }}>
          {label.name}
        </span>
      )}
    </div>
  );
}
