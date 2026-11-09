import type { Label, Project, Ticket, Status } from '../types';

const BASE = '/api';

export async function fetchProjects(): Promise<Project[]> {
  const r = await fetch(`${BASE}/projects`);
  return r.json();
}

export async function createProject(name: string): Promise<Project> {
  const r = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return r.json();
}

export async function fetchLabels(): Promise<Label[]> {
  const r = await fetch(`${BASE}/labels`);
  return r.json();
}

export async function createLabel(name: string, color: string, projectId: string): Promise<Label> {
  const r = await fetch(`${BASE}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color, projectId }),
  });
  if (!r.ok) throw new Error(`Create label failed: ${r.status}`);
  return r.json();
}

/** Deletes a label; moveTo is required when tickets still use it. */
export async function deleteLabel(id: string, moveTo?: string): Promise<void> {
  const query = moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : '';
  const r = await fetch(`${BASE}/labels/${id}${query}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`Delete label failed: ${r.status}`);
}

export async function updateLabel(id: string, updates: Partial<Pick<Label, 'name' | 'color' | 'collapsed'>>): Promise<Label> {
  const r = await fetch(`${BASE}/labels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return r.json();
}

export async function reorderLabels(ids: string[]): Promise<Label[]> {
  const r = await fetch(`${BASE}/labels/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return r.json();
}

export async function fetchTickets(): Promise<Ticket[]> {
  const r = await fetch(`${BASE}/tickets`);
  return r.json();
}

export async function createTicket(title: string, labelId: string, projectId: string, description?: string, priority = 3, status: Status = 'todo'): Promise<Ticket> {
  const r = await fetch(`${BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      labelId,
      projectId,
      description,
      priority,
      status,
      createdAt: new Date().toISOString(),
    }),
  });
  return r.json();
}

export async function updateTicket(
  id: string,
  updates: Partial<Pick<Ticket, 'status' | 'labelId' | 'title' | 'description' | 'priority'>>
): Promise<Ticket> {
  const r = await fetch(`${BASE}/tickets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return r.json();
}

export async function deleteTicket(id: string): Promise<void> {
  await fetch(`${BASE}/tickets/${id}`, { method: 'DELETE' });
}
