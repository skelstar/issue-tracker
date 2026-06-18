import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Ticket, Label, Project, Status } from '../types';
import EditTicketDialog from './EditTicketDialog';
import { STATUSES, LABEL_COLORS } from '../types';
import * as api from '../api/client';
import Swimlane from './Swimlane';
import TicketCard from './TicketCard';
import AddTicketDialog from './AddTicketDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';

export default function Board() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    Promise.all([api.fetchProjects(), api.fetchLabels(), api.fetchTickets()]).then(([p, l, t]) => {
      setProjects(p);
      setActiveProjectId(p[0]?.id ?? null);
      setLabels(l);
      setTickets(t);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (addingProject) newProjectInputRef.current?.focus();
  }, [addingProject]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEditingTicket(null);
        setAddingProject(false);
        setNewProjectName('');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setEditingTicket(null);
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

  async function handleAddTicket(title: string, labelId: string, newLabelName?: string, description?: string) {
    if (!activeProjectId) return;
    let finalLabelId = labelId;

    if (labelId === '__new__' && newLabelName) {
      const color = LABEL_COLORS[labels.length % LABEL_COLORS.length];
      const newLabel = await api.createLabel(newLabelName, color);
      setLabels(prev => [...prev, newLabel]);
      finalLabelId = newLabel.id;
    }

    const ticket = await api.createTicket(title, finalLabelId, activeProjectId, description);
    setTickets(prev => [...prev, ticket]);
    setShowDialog(false);
  }

  async function handleEditSave(id: string, updates: { title: string; description?: string; labelId: string; status: Status }) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setEditingTicket(null);
    await api.updateTicket(id, updates);
  }

  function handleEditDelete(ticket: Ticket) {
    setEditingTicket(null);
    setTicketToDelete(ticket);
  }

  async function handleDeleteConfirm() {
    if (!ticketToDelete) return;
    await api.deleteTicket(ticketToDelete.id);
    setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
    setTicketToDelete(null);
  }

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) { setAddingProject(false); return; }
    const project = await api.createProject(name);
    setProjects(prev => [...prev, project]);
    setActiveProjectId(project.id);
    setNewProjectName('');
    setAddingProject(false);
  }

  const projectTickets = tickets.filter(t => t.projectId === activeProjectId);

  if (loading) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="board">

        <div className="project-tabs" onClick={e => e.stopPropagation()}>
          {projects.map(p => (
            <button
              key={p.id}
              className={`project-tab${p.id === activeProjectId ? ' active' : ''}`}
              onClick={() => { setActiveProjectId(p.id); setEditingTicket(null); }}
            >
              {p.name}
            </button>
          ))}

          {addingProject ? (
            <form
              className="project-tab-new-form"
              onSubmit={e => { e.preventDefault(); handleCreateProject(); }}
            >
              <input
                ref={newProjectInputRef}
                className="project-tab-input"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name"
              />
              <button type="submit" className="project-tab-confirm">✓</button>
              <button type="button" className="project-tab-cancel" onClick={() => { setAddingProject(false); setNewProjectName(''); }}>✕</button>
            </form>
          ) : (
            <button className="project-tab-add" onClick={() => setAddingProject(true)}>
              + New Project
            </button>
          )}
        </div>

        {activeProjectId === null ? (
          <div className="empty-board">
            <p>No projects yet.</p>
            <p>Click <strong>+ New Project</strong> to get started.</p>
          </div>
        ) : (
          <>
            <div className="board-header">
              {STATUSES.map(s => (
                <div key={s.id} className="col-status">
                  {s.label}
                  <span className="col-count">
                    {projectTickets.filter(t => t.status === s.id).length}
                  </span>
                </div>
              ))}
            </div>

            <div className="board-body">
              {labels.filter(l => projectTickets.some(t => t.labelId === l.id)).length === 0 ? (
                <div className="empty-board">
                  <p>No tickets yet.</p>
                  <p>Click <strong>+ Add Ticket</strong> to create your first one.</p>
                </div>
              ) : (
                labels
                  .filter(l => projectTickets.some(t => t.labelId === l.id))
                  .map(label => (
                    <Swimlane
                      key={label.id}
                      label={label}
                      tickets={projectTickets.filter(t => t.labelId === label.id)}
                      allLabels={labels}
                      onEdit={setEditingTicket}
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
          </>
        )}
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

      {editingTicket && (
        <EditTicketDialog
          ticket={editingTicket}
          labels={labels}
          onClose={() => setEditingTicket(null)}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
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
