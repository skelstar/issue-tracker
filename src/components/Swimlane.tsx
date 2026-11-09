import type { ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Ticket, Status } from '../types';
import { STATUSES } from '../types';

export const LANE_DRAG_PREFIX = 'lane:';
export const LANE_DROP_PREFIX = 'lane-drop:';

/** One horizontal band of the board. */
export interface Section {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  /**
   * The epic a ticket gets when dropped or created here: an epic id, null for "No epic",
   * or undefined in the ungrouped view (dropping keeps the ticket's epic).
   */
  epicId: string | null | undefined;
  /** Real epics can be dragged to reorder and edited; "No epic" can't. */
  isEpic: boolean;
}

/** Data on every cell droppable, read by the board's drag-end handler. */
export interface CellDropData {
  type: 'cell';
  epicId: string | null | undefined;
  status: Status;
}

interface CellProps {
  section: Section;
  status: Status;
  tickets: Ticket[];
  renderCard: (ticket: Ticket) => ReactNode;
  onDoubleClick: () => void;
}

function DroppableCell({ section, status, tickets, renderCard, onDoubleClick }: CellProps) {
  const data: CellDropData = { type: 'cell', epicId: section.epicId, status };
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${section.id}:${status}`, data });

  const cards = [...tickets].sort((a, b) => (a.priority ?? 4) - (b.priority ?? 4)).map(renderCard);

  return (
    <div ref={setNodeRef} className={`swimlane-cell swimlane-cell--${status}${isOver ? ' drag-over' : ''}`} onDoubleClick={onDoubleClick}>
      {status === 'done' ? <div className="swimlane-cell-scroll">{cards}</div> : cards}
    </div>
  );
}

interface HeaderProps {
  section: Section;
  count: number;
  isOverlay?: boolean;
  onToggleCollapse?: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
  handleRef?: (el: HTMLElement | null) => void;
  headerRef?: (el: HTMLElement | null) => void;
}

export function SwimlaneHeader({ section, count, isOverlay, onToggleCollapse, onAdd, onEdit, dragHandle, handleRef, headerRef }: HeaderProps) {
  return (
    <div ref={headerRef} className={`swimlane-header${isOverlay ? ' overlay' : ''}${section.isEpic ? '' : ' swimlane-header--none'}`} style={{ borderLeftColor: section.color }}>
      {section.isEpic ? (
        <button
          ref={handleRef}
          className="swimlane-grip"
          title="Drag to reorder"
          aria-label={`Reorder ${section.name}`}
          {...dragHandle}
        >
          ⋮⋮
        </button>
      ) : (
        <span className="swimlane-grip-spacer" />
      )}
      <button
        className={`swimlane-toggle${section.collapsed ? ' collapsed' : ''}`}
        onClick={onToggleCollapse}
        aria-expanded={!section.collapsed}
        title={section.collapsed ? 'Expand' : 'Collapse'}
      >
        <span className="swimlane-chevron">▾</span>
        <span className="swimlane-dot" style={{ backgroundColor: section.color }} />
        <span className="swimlane-name">{section.name}</span>
      </button>
      <span className="swimlane-count">{count}</span>
      <button className="swimlane-add-btn" onClick={onAdd} title="Add ticket" aria-label={`Add ticket to ${section.name}`}>+</button>
      {section.isEpic && (
        <button className="swimlane-add-btn swimlane-edit-btn" onClick={onEdit} title="Edit epic" aria-label={`Edit epic ${section.name}`}>✎</button>
      )}
    </div>
  );
}

interface Props {
  section: Section;
  index: number;
  tickets: Ticket[];
  /** Ungrouped view: no header, just the cells. */
  headerless?: boolean;
  renderCard: (ticket: Ticket) => ReactNode;
  onCellDoubleClick: (section: Section, status: Status) => void;
  onToggleCollapse: (section: Section) => void;
  onEdit: (section: Section) => void;
}

export default function Swimlane({ section, index, tickets, headerless, renderCard, onCellDoubleClick, onToggleCollapse, onEdit }: Props) {
  const reorderable = section.isEpic && !headerless;
  const collapsed = section.collapsed && !headerless;

  const drag = useDraggable({
    id: `${LANE_DRAG_PREFIX}${section.id}`,
    data: { type: 'lane', index },
    disabled: !reorderable,
  });
  const drop = useDroppable({
    id: `${LANE_DROP_PREFIX}${section.id}`,
    data: { type: 'lane', index },
    disabled: !reorderable,
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
      {!headerless && (
        <SwimlaneHeader
          section={section}
          count={tickets.length}
          onToggleCollapse={() => onToggleCollapse(section)}
          onAdd={() => onCellDoubleClick(section, 'todo')}
          onEdit={() => onEdit(section)}
          headerRef={drag.setNodeRef}
          handleRef={drag.setActivatorNodeRef}
          dragHandle={{ ...drag.listeners, ...drag.attributes }}
        />
      )}
      {!collapsed && (
        <div className="swimlane-row">
          {STATUSES.map(status => (
            <DroppableCell
              key={status.id}
              section={section}
              status={status.id}
              tickets={tickets.filter(t => t.status === status.id)}
              renderCard={renderCard}
              onDoubleClick={() => onCellDoubleClick(section, status.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
