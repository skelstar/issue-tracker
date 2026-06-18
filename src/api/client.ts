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

export async function createLabel(name: string, color: string): Promise<Label> {
  const r = await fetch(`${BASE}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  return r.json();
}

export async function fetchTickets(): Promise<Ticket[]> {
  const r = await fetch(`${BASE}/tickets`);
  return r.json();
}

export async function createTicket(title: string, labelId: string, projectId: string, description?: string): Promise<Ticket> {
  const r = await fetch(`${BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      labelId,
      projectId,
      description,
      status: 'todo' as Status,
      createdAt: new Date().toISOString(),
    }),
  });
  return r.json();
}

export async function updateTicket(
  id: string,
  updates: Partial<Pick<Ticket, 'status' | 'labelId' | 'title' | 'description'>>
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
