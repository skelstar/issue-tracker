import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Ticket, Label, Status } from '../types';
import { STATUSES, LABEL_COLORS } from '../types';
import * as api from '../api/client';
import Swimlane from './Swimlane';
import TicketCard from './TicketCard';
import AddTicketDialog from './AddTicketDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';

export default function Board() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    Promise.all([api.fetchLabels(), api.fetchTickets()]).then(([l, t]) => {
      setLabels(l);
      setTickets(t);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedTicketId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setSelectedTicketId(null);
    const ticket = tickets.find(t => t.id === event.active.id);
    setActiveTicket(ticket ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTicket(null);
    if (!over) return;

    const ticket = tickets.find(t => t.id === active.id);
    if (!ticket) return;

    const [newLabelId, newStatus] = String(over.id).split('__');
    if (newLabelId === ticket.labelId && newStatus === ticket.status) return;

    const updates: Partial<Pick<Ticket, 'status' | 'labelId'>> = {};
    if (newLabelId !== ticket.labelId) updates.labelId = newLabelId;
    if (newStatus !== ticket.status) updates.status = newStatus as Status;

    setTickets(prev =>
      prev.map(t => (t.id === ticket.id ? { ...t, ...updates } : t))
    );

    await api.updateTicket(ticket.id, updates);
  }

  async function handleAddTicket(title: string, labelId: string, newLabelName?: string) {
    let finalLabelId = labelId;

    if (labelId === '__new__' && newLabelName) {
      const color = LABEL_COLORS[labels.length % LABEL_COLORS.length];
      const newLabel = await api.createLabel(newLabelName, color);
      setLabels(prev => [...prev, newLabel]);
      finalLabelId = newLabel.id;
    }

    const ticket = await api.createTicket(title, finalLabelId);
    setTickets(prev => [...prev, ticket]);
    setShowDialog(false);
  }

  async function handleDeleteConfirm() {
    if (!ticketToDelete) return;
    await api.deleteTicket(ticketToDelete.id);
    setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
    setSelectedTicketId(null);
    setTicketToDelete(null);
  }

  if (loading) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="board" onClick={() => setSelectedTicketId(null)}>
        <div className="board-header">
          {STATUSES.map(s => (
            <div key={s.id} className="col-status">
              {s.label}
              <span className="col-count">
                {tickets.filter(t => t.status === s.id).length}
              </span>
            </div>
          ))}
        </div>

        <div className="board-body">
          {labels.length === 0 ? (
            <div className="empty-board">
              <p>No tickets yet.</p>
              <p>Click <strong>+ Add Ticket</strong> to create your first one.</p>
            </div>
          ) : (
            labels.map(label => (
              <Swimlane
                key={label.id}
                label={label}
                tickets={tickets.filter(t => t.labelId === label.id)}
                allLabels={labels}
                selectedTicketId={selectedTicketId}
                onSelectTicket={setSelectedTicketId}
                onDeleteRequest={setTicketToDelete}
              />
            ))
          )}
          <div className="board-add-row">
            <div className="col-add">
              <button className="add-ticket-btn" onClick={e => { e.stopPropagation(); setShowDialog(true); }}>
                + Add Ticket
              </button>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTicket && (
          <TicketCard
            ticket={activeTicket}
            label={labels.find(l => l.id === activeTicket.labelId)}
            isDragOverlay
          />
        )}
      </DragOverlay>

      {showDialog && (
        <AddTicketDialog
          labels={labels}
          onClose={() => setShowDialog(false)}
          onSubmit={handleAddTicket}
        />
      )}

      {ticketToDelete && (
        <DeleteConfirmDialog
          ticket={ticketToDelete}
          onCancel={() => setTicketToDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </DndContext>
  );
}
