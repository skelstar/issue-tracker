import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Ticket, Tag } from '../types';
import PriorityIcon from './PriorityIcon';
import TicketTypeIcon from './TicketTypeIcon';

interface Props {
  ticket: Ticket;
  labels: Tag[];
  /** Shown only in the ungrouped view, where the section doesn't already say it. */
  epic?: Tag;
  isDragOverlay?: boolean;
  onEdit?: () => void;
}

export default function TicketCard({ ticket, labels, epic, isDragOverlay = false, onEdit }: Props) {
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
      onDoubleClick={e => e.stopPropagation()}
      {...listeners}
      {...attributes}
    >
      <div className="ticket-header">
        <span className="ticket-title">
          {ticket.title}
          <TicketTypeIcon type={ticket.type ?? 'task'} />
        </span>
        <PriorityIcon priority={ticket.priority} />
      </div>
      {(labels.length > 0 || epic) && (
        <div className="ticket-tags">
          {labels.map(label => (
            <span key={label.id} className="ticket-badge" style={{ backgroundColor: label.color }}>
              {label.name}
            </span>
          ))}
          {epic && (
            <span className="ticket-epic" style={{ borderLeftColor: epic.color }}>
              {epic.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
