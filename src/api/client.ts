import type { Project, Tag, TagKind, Ticket } from '../types';

const BASE = '/api';

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.url}: ${r.status}`);
  return r.json();
}

function send(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function fetchProjects(): Promise<Project[]> {
  return json(await fetch(`${BASE}/projects`));
}

export async function createProject(name: string): Promise<Project> {
  return json(await fetch(`${BASE}/projects`, send('POST', { name })));
}

// Labels and epics share one API shape.
const TAG_ROUTE: Record<TagKind, string> = { label: `${BASE}/labels`, epic: `${BASE}/epics` };

export async function fetchTags(kind: TagKind): Promise<Tag[]> {
  return json(await fetch(TAG_ROUTE[kind]));
}

export async function createTag(kind: TagKind, name: string, color: string, projectId: string): Promise<Tag> {
  return json(await fetch(TAG_ROUTE[kind], send('POST', { name, color, projectId })));
}

export async function updateTag(kind: TagKind, id: string, updates: Partial<Pick<Tag, 'name' | 'color' | 'collapsed'>>): Promise<Tag> {
  return json(await fetch(`${TAG_ROUTE[kind]}/${id}`, send('PUT', updates)));
}

export async function reorderTags(kind: TagKind, ids: string[]): Promise<Tag[]> {
  return json(await fetch(`${TAG_ROUTE[kind]}/order`, send('PUT', { ids })));
}

/** Deletes a label/epic. Its tickets move to moveTo, or are left without one. */
export async function deleteTag(kind: TagKind, id: string, moveTo?: string | null): Promise<void> {
  const query = moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : '';
  await json(await fetch(`${TAG_ROUTE[kind]}/${id}${query}`, { method: 'DELETE' }));
}

export async function fetchTickets(): Promise<Ticket[]> {
  return json(await fetch(`${BASE}/tickets`));
}

export type TicketFields = Pick<Ticket, 'title' | 'description' | 'status' | 'priority' | 'type' | 'labelIds' | 'epicId'>;

export async function createTicket(projectId: string, fields: TicketFields): Promise<Ticket> {
  return json(await fetch(`${BASE}/tickets`, send('POST', { ...fields, projectId, createdAt: new Date().toISOString() })));
}

export async function updateTicket(id: string, updates: Partial<TicketFields>): Promise<Ticket> {
  return json(await fetch(`${BASE}/tickets/${id}`, send('PUT', updates)));
}

/** Upload an image and return the URL to reference it by. */
export async function uploadImage(file: Blob): Promise<string> {
  const r = await fetch(`${BASE}/uploads`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
  const { url } = await json<{ url: string }>(r);
  return url;
}

export async function deleteTicket(id: string): Promise<void> {
  await json(await fetch(`${BASE}/tickets/${id}`, { method: 'DELETE' }));
}
