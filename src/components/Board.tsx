import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  pointerWithin,
  type CollisionDetection,
} from '@dnd-kit/core';
import type { Ticket, Label, Project, Status, Priority } from '../types';
import EditTicketDialog from './EditTicketDialog';
import { STATUSES, nextLabelColor } from '../types';
import * as api from '../api/client';
import Swimlane, { SwimlaneHeader, LANE_DRAG_PREFIX, LANE_DROP_PREFIX } from './Swimlane';

// Lane drags may only land on lanes, ticket drags only on cells.
const collisionDetection: CollisionDetection = args => {
  const draggingLane = args.active.data.current?.type === 'lane';
  const droppableContainers = args.droppableContainers.filter(
    c => (c.data.current?.type === 'lane') === draggingLane
  );
  return draggingLane
    ? pointerWithin({ ...args, droppableContainers })
    : rectIntersection({ ...args, droppableContainers });
};
import TicketCard from './TicketCard';
import AddTicketDialog from './AddTicketDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import LabelDialog from './LabelDialog';

export default function Board() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeLane, setActiveLane] = useState<Label | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  // 'new' = creating a label; a Label = editing that one.
  const [labelDialog, setLabelDialog] = useState<Label | 'new' | null>(null);
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
    const id = String(event.active.id);
    if (id.startsWith(LANE_DRAG_PREFIX)) {
      setActiveLane(labels.find(l => l.id === id.slice(LANE_DRAG_PREFIX.length)) ?? null);
      return;
    }
    const ticket = tickets.find(t => t.id === event.active.id);
    setActiveTicket(ticket ?? null);
  }

  async function handleLaneDrop(activeId: string, overId: string) {
    const fromId = activeId.slice(LANE_DRAG_PREFIX.length);
    const toId = overId.slice(LANE_DROP_PREFIX.length);
    if (fromId === toId) return;
    const from = labels.findIndex(l => l.id === fromId);
    const to = labels.findIndex(l => l.id === toId);
    if (from === -1 || to === -1) return;
    const next = [...labels];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLabels(next);
    await api.reorderLabels(next.map(l => l.id));
  }

  async function handleToggleCollapse(label: Label) {
    const collapsed = !label.collapsed;
    setLabels(prev => prev.map(l => (l.id === label.id ? { ...l, collapsed } : l)));
    await api.updateLabel(label.id, { collapsed });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTicket(null);
    setActiveLane(null);
    if (!over) return;

    if (String(active.id).startsWith(LANE_DRAG_PREFIX)) {
      await handleLaneDrop(String(active.id), String(over.id));
      return;
    }

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

  async function handleAddTicket(title: string, labelId: string, newLabelName?: string, description?: string, priority?: Priority) {
    if (!activeProjectId) return;
    let finalLabelId = labelId;

    if (labelId === '__new__' && newLabelName) {
      finalLabelId = (await createProjectLabel(newLabelName)).id;
    }

    const ticket = await api.createTicket(title, finalLabelId, activeProjectId, description, priority);
    setTickets(prev => [...prev, ticket]);
    setShowDialog(false);
  }

  async function createProjectLabel(name: string): Promise<Label> {
    if (!activeProjectId) throw new Error('No active project');
    const label = await api.createLabel(name, nextLabelColor(projectLabels), activeProjectId);
    setLabels(prev => [...prev, label]);
    return label;
  }

  async function handleLabelSave(name: string, color: string) {
    if (labelDialog === 'new') {
      if (!activeProjectId) return;
      const label = await api.createLabel(name, color, activeProjectId);
      setLabels(prev => [...prev, label]);
    } else if (labelDialog) {
      const id = labelDialog.id;
      await api.updateLabel(id, { name, color });
      setLabels(prev => prev.map(l => (l.id === id ? { ...l, name, color } : l)));
    }
    setLabelDialog(null);
  }

  async function handleLabelDelete(moveTo?: string) {
    if (!labelDialog || labelDialog === 'new') return;
    const id = labelDialog.id;
    await api.deleteLabel(id, moveTo);
    if (moveTo) setTickets(prev => prev.map(t => (t.labelId === id ? { ...t, labelId: moveTo } : t)));
    setLabels(prev => prev.filter(l => l.id !== id));
    setLabelDialog(null);
  }

  async function handleCellDoubleClick(labelId: string, _status: Status) {
    if (!activeProjectId) return;
    const ticket = await api.createTicket('New ticket', labelId, activeProjectId, undefined, 3, 'todo');
    setTickets(prev => [...prev, ticket]);
    setEditingTicket(ticket);
  }

  async function handleEditSave(id: string, updates: { title: string; description?: string; labelId: string; status: Status; priority: Priority }, newLabelName?: string) {
    if (updates.labelId === '__new__') {
      if (!newLabelName) return;
      updates = { ...updates, labelId: (await createProjectLabel(newLabelName)).id };
    }
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

  function handleExport() {
    const data = tickets.map(t => ({
      ...t,
      labelName: labels.find(l => l.id === t.labelId)?.name,
      projectName: projects.find(p => p.id === t.projectId)?.name,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tickets.json';
    a.click();
    URL.revokeObjectURL(url);
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
  // A project's labels define its swimlanes, in the user's chosen order, even when empty.
  const projectLabels = labels.filter(l => l.projectId === activeProjectId);

  if (loading) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveTicket(null); setActiveLane(null); }}
    >
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

          <button className="export-btn" onClick={handleExport}>Export JSON</button>
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
              {projectLabels.length === 0 ? (
                <div className="empty-board">
                  <p>No labels yet.</p>
                  <p>Each label is a section on this board. Click <strong>+ Add Label</strong> to create one.</p>
                </div>
              ) : (
                projectLabels.map((label, index) => (
                    <Swimlane
                      key={label.id}
                      label={label}
                      index={index}
                      tickets={projectTickets.filter(t => t.labelId === label.id)}
                      allLabels={labels}
                      onEdit={setEditingTicket}
                      onCellDoubleClick={handleCellDoubleClick}
                      onToggleCollapse={handleToggleCollapse}
                      onEditLabel={setLabelDialog}
                    />
                  ))
              )}
              <div className="board-add-row">
                <div className="col-add">
                  <button className="add-ticket-btn" onClick={e => { e.stopPropagation(); setShowDialog(true); }}>
                    + Add Ticket
                  </button>
                </div>
                <div className="col-add">
                  <button className="add-ticket-btn" onClick={e => { e.stopPropagation(); setLabelDialog('new'); }}>
                    + Add Label
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
        {activeLane && (
          <SwimlaneHeader
            label={activeLane}
            count={projectTickets.filter(t => t.labelId === activeLane.id).length}
            collapsed={!!activeLane.collapsed}
            isOverlay
          />
        )}
      </DragOverlay>

      {showDialog && (
        <AddTicketDialog
          labels={projectLabels}
          onClose={() => setShowDialog(false)}
          onSubmit={handleAddTicket}
        />
      )}

      {editingTicket && (
        <EditTicketDialog
          ticket={editingTicket}
          labels={projectLabels}
          onClose={() => setEditingTicket(null)}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
        />
      )}

      {labelDialog && (
        <LabelDialog
          label={labelDialog === 'new' ? undefined : labelDialog}
          projectLabels={projectLabels}
          ticketCount={labelDialog === 'new' ? 0 : tickets.filter(t => t.labelId === labelDialog.id).length}
          onClose={() => setLabelDialog(null)}
          onSave={handleLabelSave}
          onDelete={handleLabelDelete}
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
