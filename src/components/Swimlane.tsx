import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Ticket, Label, Status } from '../types';
import { STATUSES } from '../types';
import TicketCard from './TicketCard';

export const LANE_DRAG_PREFIX = 'lane:';
export const LANE_DROP_PREFIX = 'lane-drop:';

interface CellProps {
  id: string;
  status: Status;
  tickets: Ticket[];
  allLabels: Label[];
  onEdit: (ticket: Ticket) => void;
  onDoubleClick: () => void;
}

function DroppableCell({ id, status, tickets, allLabels, onEdit, onDoubleClick }: CellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const sorted = [...tickets].sort((a, b) => (a.priority ?? 4) - (b.priority ?? 4));

  const cards = sorted.map(ticket => (
    <TicketCard
      key={ticket.id}
      ticket={ticket}
      label={allLabels.find(l => l.id === ticket.labelId)}
      onEdit={() => onEdit(ticket)}
    />
  ));

  return (
    <div ref={setNodeRef} className={`swimlane-cell swimlane-cell--${status}${isOver ? ' drag-over' : ''}`} onDoubleClick={onDoubleClick}>
      {status === 'done' ? <div className="swimlane-cell-scroll">{cards}</div> : cards}
    </div>
  );
}

interface HeaderProps {
  label: Label;
  count: number;
  collapsed: boolean;
  isOverlay?: boolean;
  onToggleCollapse?: () => void;
  onAdd?: () => void;
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
  handleRef?: (el: HTMLElement | null) => void;
  headerRef?: (el: HTMLElement | null) => void;
}

export function SwimlaneHeader({ label, count, collapsed, isOverlay, onToggleCollapse, onAdd, dragHandle, handleRef, headerRef }: HeaderProps) {
  return (
    <div ref={headerRef} className={`swimlane-header${isOverlay ? ' overlay' : ''}`} style={{ borderLeftColor: label.color }}>
      <button
        ref={handleRef}
        className="swimlane-grip"
        title="Drag to reorder"
        aria-label={`Reorder ${label.name}`}
        {...dragHandle}
      >
        ⋮⋮
      </button>
      <button
        className={`swimlane-toggle${collapsed ? ' collapsed' : ''}`}
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <span className="swimlane-chevron">▾</span>
        <span className="swimlane-dot" style={{ backgroundColor: label.color }} />
        <span className="swimlane-name">{label.name}</span>
      </button>
      <span className="swimlane-count">{count}</span>
      <button className="swimlane-add-btn" onClick={onAdd}>+</button>
    </div>
  );
}

interface Props {
  label: Label;
  index: number;
  tickets: Ticket[];
  allLabels: Label[];
  onEdit: (ticket: Ticket) => void;
  onCellDoubleClick: (labelId: string, status: Status) => void;
  onToggleCollapse: (label: Label) => void;
}

export default function Swimlane({ label, index, tickets, allLabels, onEdit, onCellDoubleClick, onToggleCollapse }: Props) {
  const collapsed = !!label.collapsed;

  const drag = useDraggable({
    id: `${LANE_DRAG_PREFIX}${label.id}`,
    data: { type: 'lane', index },
  });
  const drop = useDroppable({
    id: `${LANE_DROP_PREFIX}${label.id}`,
    data: { type: 'lane', index },
  });

  // Show where the dragged lane will land: above this lane when moving up, below when moving down.
  const activeIndex = drop.active?.data.current?.type === 'lane' ? drop.active.data.current.index as number : null;
  const dropClass = drop.isOver && activeIndex !== null && activeIndex !== index
    ? (activeIndex > index ? ' drop-before' : ' drop-after')
    : '';

  return (
    <div
      ref={drop.setNodeRef}
      className={`swimlane${collapsed ? ' collapsed' : ''}${drag.isDragging ? ' dragging' : ''}${dropClass}`}
    >
      <SwimlaneHeader
        label={label}
        count={tickets.length}
        collapsed={collapsed}
        onToggleCollapse={() => onToggleCollapse(label)}
        onAdd={() => onCellDoubleClick(label.id, 'todo')}
        headerRef={drag.setNodeRef}
        handleRef={drag.setActivatorNodeRef}
        dragHandle={{ ...drag.listeners, ...drag.attributes }}
      />
      {!collapsed && (
        <div className="swimlane-row">
          {STATUSES.map(status => (
            <DroppableCell
              key={status.id}
              id={`${label.id}__${status.id}`}
              status={status.id as Status}
              tickets={tickets.filter(t => t.status === (status.id as Status))}
              allLabels={allLabels}
              onEdit={onEdit}
              onDoubleClick={() => onCellDoubleClick(label.id, status.id as Status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
