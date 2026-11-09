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
import type { Ticket, Tag, TagKind, Project, Status } from '../types';
import { STATUSES, nextTagColor } from '../types';
import * as api from '../api/client';
import Swimlane, { SwimlaneHeader, LANE_DRAG_PREFIX, LANE_DROP_PREFIX, type Section, type CellDropData } from './Swimlane';
import TicketCard from './TicketCard';
import TicketDialog, { type TicketDraft } from './TicketDialog';
import TagDialog from './TagDialog';
import ManageLabelsDialog from './ManageLabelsDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { NEW_TAG, type TagChoice } from './TagPicker';

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

type GroupBy = 'epic' | 'none';
const GROUP_BY_KEY = 'issue-tracker.groupBy';

function loadGroupBy(): GroupBy {
  try {
    return localStorage.getItem(GROUP_BY_KEY) === 'none' ? 'none' : 'epic';
  } catch {
    return 'epic';
  }
}

const TICKET_FIELD: Record<TagKind, 'labelId' | 'epicId'> = { label: 'labelId', epic: 'epicId' };
const NO_EPIC_ID = '__no-epic__';

export default function Board() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [labels, setLabels] = useState<Tag[]>([]);
  const [epics, setEpics] = useState<Tag[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeLane, setActiveLane] = useState<Section | null>(null);
  // 'new' = creating a ticket; a Ticket = editing that one.
  const [ticketDialog, setTicketDialog] = useState<Ticket | 'new' | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  // tag undefined = creating a new label/epic.
  const [tagDialog, setTagDialog] = useState<{ kind: TagKind; tag?: Tag } | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>(loadGroupBy);
  const [noEpicCollapsed, setNoEpicCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    Promise.all([api.fetchProjects(), api.fetchTags('label'), api.fetchTags('epic'), api.fetchTickets()]).then(([p, l, e, t]) => {
      setProjects(p);
      setActiveProjectId(p[0]?.id ?? null);
      setLabels(l);
      setEpics(e);
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
        setAddingProject(false);
        setNewProjectName('');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function changeGroupBy(value: GroupBy) {
    setGroupBy(value);
    try { localStorage.setItem(GROUP_BY_KEY, value); } catch { /* storage unavailable: just don't remember */ }
  }

  const projectTickets = tickets.filter(t => t.projectId === activeProjectId);
  const projectLabels = labels.filter(l => l.projectId === activeProjectId);
  const projectEpics = epics.filter(e => e.projectId === activeProjectId);
  const labelsById = new Map(labels.map(l => [l.id, l]));
  const epicsById = new Map(projectEpics.map(e => [e.id, e]));

  const tagsOf = (kind: TagKind) => (kind === 'label' ? projectLabels : projectEpics);
  const setTagsOf = (kind: TagKind) => (kind === 'label' ? setLabels : setEpics);

  // Sections: one per epic (in the user's order) plus "No epic" when it has tickets,
  // or a single headerless section when ungrouped.
  const ticketsWithoutEpic = projectTickets.filter(t => !t.epicId || !epicsById.has(t.epicId));
  const sections: { section: Section; tickets: Ticket[] }[] = groupBy === 'none'
    ? [{
        section: { id: 'all', name: 'All tickets', color: 'transparent', collapsed: false, epicId: undefined, isEpic: false },
        tickets: projectTickets,
      }]
    : [
        ...projectEpics.map(e => ({
          section: { id: e.id, name: e.name, color: e.color, collapsed: !!e.collapsed, epicId: e.id, isEpic: true },
          tickets: projectTickets.filter(t => t.epicId === e.id),
        })),
        ...(ticketsWithoutEpic.length > 0
          ? [{
              section: { id: NO_EPIC_ID, name: 'No epic', color: 'var(--border)', collapsed: noEpicCollapsed, epicId: null, isEpic: false },
              tickets: ticketsWithoutEpic,
            }]
          : []),
      ];

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith(LANE_DRAG_PREFIX)) {
      const laneId = id.slice(LANE_DRAG_PREFIX.length);
      setActiveLane(sections.find(s => s.section.id === laneId)?.section ?? null);
      return;
    }
    setActiveTicket(tickets.find(t => t.id === id) ?? null);
  }

  async function handleLaneDrop(activeId: string, overId: string) {
    const fromId = activeId.slice(LANE_DRAG_PREFIX.length);
    const toId = overId.slice(LANE_DROP_PREFIX.length);
    if (fromId === toId) return;
    const from = epics.findIndex(e => e.id === fromId);
    const to = epics.findIndex(e => e.id === toId);
    if (from === -1 || to === -1) return;
    const next = [...epics];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setEpics(next);
    await api.reorderTags('epic', next.map(e => e.id));
  }

  async function handleToggleCollapse(section: Section) {
    if (!section.isEpic) { setNoEpicCollapsed(c => !c); return; }
    const collapsed = !section.collapsed;
    setEpics(prev => prev.map(e => (e.id === section.id ? { ...e, collapsed } : e)));
    await api.updateTag('epic', section.id, { collapsed });
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
    const target = over.data.current as CellDropData | undefined;
    if (!ticket || target?.type !== 'cell') return;

    const updates: Partial<api.TicketFields> = {};
    if (target.status !== ticket.status) updates.status = target.status;
    if (target.epicId !== undefined && target.epicId !== (ticket.epicId ?? null)) updates.epicId = target.epicId;
    if (Object.keys(updates).length === 0) return;

    setTickets(prev => prev.map(t => (t.id === ticket.id ? { ...t, ...updates } : t)));
    await api.updateTicket(ticket.id, updates);
  }

  async function createTag(kind: TagKind, name: string, color = nextTagColor(tagsOf(kind))): Promise<Tag> {
    if (!activeProjectId) throw new Error('No active project');
    const tag = await api.createTag(kind, name, color, activeProjectId);
    setTagsOf(kind)(prev => [...prev, tag]);
    return tag;
  }

  /** Turns a picker choice into a tag id, creating the tag if the user asked for a new one. */
  async function resolveTagChoice(kind: TagKind, choice: TagChoice): Promise<string | null> {
    if (choice.value === NEW_TAG) return (await createTag(kind, choice.newName.trim())).id;
    return choice.value || null;
  }

  async function handleTicketSave(draft: TicketDraft) {
    if (!activeProjectId || !ticketDialog) return;
    const fields: api.TicketFields = {
      title: draft.title,
      description: draft.description,
      status: draft.status,
      priority: draft.priority,
      labelId: await resolveTagChoice('label', draft.label),
      epicId: await resolveTagChoice('epic', draft.epic),
    };
    if (ticketDialog === 'new') {
      const ticket = await api.createTicket(activeProjectId, fields);
      setTickets(prev => [...prev, ticket]);
    } else {
      const id = ticketDialog.id;
      setTickets(prev => prev.map(t => (t.id === id ? { ...t, ...fields } : t)));
      await api.updateTicket(id, fields);
    }
    setTicketDialog(null);
  }

  async function handleCellDoubleClick(section: Section, _status: Status) {
    if (!activeProjectId) return;
    const ticket = await api.createTicket(activeProjectId, {
      title: 'New ticket',
      status: 'todo',
      priority: 3,
      labelId: null,
      epicId: section.epicId ?? null,
    });
    setTickets(prev => [...prev, ticket]);
    setTicketDialog(ticket);
  }

  async function handleTagSave(name: string, color: string) {
    if (!tagDialog) return;
    const { kind, tag } = tagDialog;
    if (!tag) {
      await createTag(kind, name, color);
    } else {
      await api.updateTag(kind, tag.id, { name, color });
      setTagsOf(kind)(prev => prev.map(t => (t.id === tag.id ? { ...t, name, color } : t)));
    }
    setTagDialog(null);
  }

  async function handleTagDelete(moveTo: string | null) {
    if (!tagDialog?.tag) return;
    const { kind, tag } = tagDialog;
    const field = TICKET_FIELD[kind];
    await api.deleteTag(kind, tag.id, moveTo);
    setTickets(prev => prev.map(t => (t[field] === tag.id ? { ...t, [field]: moveTo } : t)));
    setTagsOf(kind)(prev => prev.filter(t => t.id !== tag.id));
    setTagDialog(null);
  }

  function handleEditDelete(ticket: Ticket) {
    setTicketDialog(null);
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
      labelName: t.labelId ? labelsById.get(t.labelId)?.name : undefined,
      epicName: epics.find(e => e.id === t.epicId)?.name,
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

  function renderCard(ticket: Ticket) {
    return (
      <TicketCard
        key={ticket.id}
        ticket={ticket}
        label={ticket.labelId ? labelsById.get(ticket.labelId) : undefined}
        epic={groupBy === 'none' && ticket.epicId ? epicsById.get(ticket.epicId) : undefined}
        onEdit={() => setTicketDialog(ticket)}
      />
    );
  }

  if (loading) {
    return <div className="loading">Loading…</div>;
  }

  const tagDialogCount = tagDialog?.tag
    ? tickets.filter(t => t[TICKET_FIELD[tagDialog.kind]] === tagDialog.tag!.id).length
    : 0;

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
              onClick={() => { setActiveProjectId(p.id); setTicketDialog(null); }}
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

          <div className="board-toolbar">
            {activeProjectId && (
              <>
                <div className="segmented" role="group" aria-label="Group by">
                  <span className="segmented-label">Group by</span>
                  {(['epic', 'none'] as const).map(value => (
                    <button
                      key={value}
                      className={`segmented-btn${groupBy === value ? ' active' : ''}`}
                      aria-pressed={groupBy === value}
                      onClick={() => changeGroupBy(value)}
                    >
                      {value === 'epic' ? 'Epic' : 'None'}
                    </button>
                  ))}
                </div>
                <button className="export-btn" onClick={() => setLabelsOpen(true)}>Labels</button>
              </>
            )}
            <button className="export-btn" onClick={handleExport}>Export JSON</button>
          </div>
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
              {sections.length === 0 ? (
                <div className="empty-board">
                  <p>No tickets yet.</p>
                  <p>Click <strong>+ Add Ticket</strong> to create one, or <strong>+ Add Epic</strong> to add a section.</p>
                </div>
              ) : (
                sections.map(({ section, tickets: sectionTickets }, index) => (
                  <Swimlane
                    key={section.id}
                    section={section}
                    index={index}
                    tickets={sectionTickets}
                    headerless={groupBy === 'none'}
                    renderCard={renderCard}
                    onCellDoubleClick={handleCellDoubleClick}
                    onToggleCollapse={handleToggleCollapse}
                    onEdit={s => setTagDialog({ kind: 'epic', tag: epicsById.get(s.id) })}
                  />
                ))
              )}
              <div className="board-add-row">
                <div className="col-add">
                  <button className="add-ticket-btn" onClick={e => { e.stopPropagation(); setTicketDialog('new'); }}>
                    + Add Ticket
                  </button>
                </div>
                <div className="col-add">
                  <button className="add-ticket-btn" onClick={e => { e.stopPropagation(); setTagDialog({ kind: 'epic' }); }}>
                    + Add Epic
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
            label={activeTicket.labelId ? labelsById.get(activeTicket.labelId) : undefined}
            isDragOverlay
          />
        )}
        {activeLane && (
          <SwimlaneHeader
            section={activeLane}
            count={sections.find(s => s.section.id === activeLane.id)?.tickets.length ?? 0}
            isOverlay
          />
        )}
      </DragOverlay>

      {ticketDialog && (
        <TicketDialog
          key={ticketDialog === 'new' ? 'new' : ticketDialog.id}
          ticket={ticketDialog === 'new' ? undefined : ticketDialog}
          labels={projectLabels}
          epics={projectEpics}
          onClose={() => setTicketDialog(null)}
          onSave={handleTicketSave}
          onDelete={handleEditDelete}
        />
      )}

      {labelsOpen && !tagDialog && (
        <ManageLabelsDialog
          labels={projectLabels}
          tickets={projectTickets}
          onClose={() => setLabelsOpen(false)}
          onAdd={() => setTagDialog({ kind: 'label' })}
          onEdit={label => setTagDialog({ kind: 'label', tag: label })}
        />
      )}

      {tagDialog && (
        <TagDialog
          kind={tagDialog.kind}
          tag={tagDialog.tag}
          siblings={tagsOf(tagDialog.kind)}
          ticketCount={tagDialogCount}
          onClose={() => setTagDialog(null)}
          onSave={handleTagSave}
          onDelete={handleTagDelete}
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
