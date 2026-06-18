import { useDroppable } from '@dnd-kit/core';
import type { Ticket, Label, Status } from '../types';
import { STATUSES } from '../types';
import TicketCard from './TicketCard';

interface CellProps {
  id: string;
  tickets: Ticket[];
  allLabels: Label[];
  onEdit: (ticket: Ticket) => void;
}

function DroppableCell({ id, tickets, allLabels, onEdit }: CellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`swimlane-cell${isOver ? ' drag-over' : ''}`}>
      {tickets.map(ticket => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          label={allLabels.find(l => l.id === ticket.labelId)}
          onEdit={() => onEdit(ticket)}
        />
      ))}
    </div>
  );
}

interface Props {
  label: Label;
  tickets: Ticket[];
  allLabels: Label[];
  onEdit: (ticket: Ticket) => void;
}

export default function Swimlane({ label, tickets, allLabels, onEdit }: Props) {
  return (
    <div className="swimlane">
      <div className="swimlane-header" style={{ borderLeftColor: label.color }}>
        <span className="swimlane-dot" style={{ backgroundColor: label.color }} />
        <span className="swimlane-name">{label.name}</span>
        <span className="swimlane-count">{tickets.length}</span>
      </div>
      <div className="swimlane-row">
        {STATUSES.map(status => (
          <DroppableCell
            key={status.id}
            id={`${label.id}__${status.id}`}
            tickets={tickets.filter(t => t.status === (status.id as Status))}
            allLabels={allLabels}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
