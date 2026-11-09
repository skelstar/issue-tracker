import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

const DATA_DIR = path.join(__dirname, 'data');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const LABELS_FILE = path.join(DATA_DIR, 'labels.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const EPICS_FILE = path.join(DATA_DIR, 'epics.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TICKETS_FILE)) fs.writeFileSync(TICKETS_FILE, '[]');
if (!fs.existsSync(LABELS_FILE)) fs.writeFileSync(LABELS_FILE, '[]');
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, '[]');
if (!fs.existsSync(EPICS_FILE)) fs.writeFileSync(EPICS_FILE, '[]');

function read<T>(file: string): T[] {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function write<T>(file: string, data: T[]): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

type Row = Record<string, unknown>;

// Labels used to be shared by all projects; now each label belongs to one project
// (projectId) and defines that project's swimlanes. Migrate old data once: a label used
// by several projects is kept for the first and copied for the others, with those
// projects' tickets repointed to their copy. A label no ticket uses gets projectId null
// (it was never visible anyway). Backs up both files before changing them.
function migrateLabelsToProjects(): void {
  const labels = read<Row>(LABELS_FILE);
  if (labels.every(l => 'projectId' in l)) return;
  const tickets = read<Row>(TICKETS_FILE);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(LABELS_FILE, `${LABELS_FILE}.${stamp}.bak`);
  fs.copyFileSync(TICKETS_FILE, `${TICKETS_FILE}.${stamp}.bak`);

  const migrated: Row[] = [];
  for (const label of labels) {
    if ('projectId' in label) { migrated.push(label); continue; }
    const projectIds = [...new Set(tickets.filter(t => t.labelId === label.id).map(t => t.projectId))];
    if (projectIds.length === 0) { migrated.push({ ...label, projectId: null }); continue; }
    projectIds.forEach((projectId, i) => {
      const id = i === 0 ? label.id : uuidv4();
      migrated.push({ ...label, id, projectId });
      if (i > 0) {
        for (const t of tickets) if (t.labelId === label.id && t.projectId === projectId) t.labelId = id;
      }
    });
  }
  write(LABELS_FILE, migrated);
  write(TICKETS_FILE, tickets);
  console.log(`Migrated ${labels.length} shared labels to ${migrated.length} per-project labels (backup suffix ${stamp}.bak)`);
}

// Tickets used to have one label (labelId); now they have any number (labelIds).
// Runs after migrateLabelsToProjects, which still reads labelId. Backs up tickets first.
function migrateTicketsToLabelIds(): void {
  const tickets = read<Row>(TICKETS_FILE);
  if (tickets.every(t => Array.isArray(t.labelIds) && !('labelId' in t))) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(TICKETS_FILE, `${TICKETS_FILE}.${stamp}.bak`);
  for (const t of tickets) {
    if (!Array.isArray(t.labelIds)) t.labelIds = t.labelId ? [t.labelId] : [];
    delete t.labelId;
  }
  write(TICKETS_FILE, tickets);
  console.log(`Migrated ${tickets.length} tickets from labelId to labelIds (backup suffix ${stamp}.bak)`);
}

migrateLabelsToProjects();
migrateTicketsToLabelIds();

/** How a ticket refers to labels (many) or epics (one). */
interface TicketRef {
  uses(ticket: Row, id: string): boolean;
  /** Replace id with moveTo on the ticket, or just remove it when moveTo is null. */
  replace(ticket: Row, id: string, moveTo: string | null): void;
}

const LABEL_REF: TicketRef = {
  uses: (t, id) => Array.isArray(t.labelIds) && t.labelIds.includes(id),
  replace: (t, id, moveTo) => {
    const ids = (t.labelIds as string[]).map(x => (x === id ? moveTo : x)).filter((x): x is string => !!x);
    t.labelIds = [...new Set(ids)];
  },
};

const EPIC_REF: TicketRef = {
  uses: (t, id) => t.epicId === id,
  replace: (t, _id, moveTo) => { t.epicId = moveTo; },
};

app.get('/api/projects', (_req, res) => {
  res.json(read(PROJECTS_FILE));
});

app.post('/api/projects', (req, res) => {
  const projects = read<Record<string, unknown>>(PROJECTS_FILE);
  const project = { id: uuidv4(), ...req.body };
  projects.push(project);
  write(PROJECTS_FILE, projects);
  res.json(project);
});

// Labels and epics are both per-project "tags" on a ticket (ticket.labelIds / ticket.epicId),
// stored in file order (the user's chosen order). Both are optional on a ticket.
function registerTagRoutes(route: string, file: string, ref: TicketRef): void {
  app.get(route, (_req, res) => {
    res.json(read(file));
  });

  app.post(route, (req, res) => {
    const { name, color, projectId } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof projectId !== 'string') {
      res.status(400).json({ error: 'name and projectId are required' }); return;
    }
    const tags = read<Row>(file);
    const tag = { id: uuidv4(), name: name.trim(), color, projectId };
    tags.push(tag);
    write(file, tags);
    res.json(tag);
  });

  // Reorder. Body: { ids: string[] } in the desired order; any not listed keep their
  // relative order at the end.
  app.put(`${route}/order`, (req, res) => {
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids must be an array' }); return; }
    const tags = read<Row>(file);
    const byId = new Map(tags.map(t => [t.id, t]));
    const ordered = ids.filter(id => byId.has(id)).map(id => byId.get(id)!);
    const rest = tags.filter(t => !ids.includes(t.id));
    const result = [...ordered, ...rest];
    write(file, result);
    res.json(result);
  });

  app.put(`${route}/:id`, (req, res) => {
    const tags = read<Row>(file);
    const idx = tags.findIndex(t => t.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
    tags[idx] = { ...tags[idx], ...req.body, id: tags[idx].id };
    write(file, tags);
    res.json(tags[idx]);
  });

  // Delete. Tickets using it move to ?moveTo=<id> (same project), or are left without one.
  app.delete(`${route}/:id`, (req, res) => {
    const tags = read<Row>(file);
    const tag = tags.find(t => t.id === req.params.id);
    if (!tag) { res.status(404).json({ error: 'Not found' }); return; }

    let moveTo: string | null = null;
    if (req.query.moveTo) {
      const target = tags.find(t => t.id === req.query.moveTo && t.id !== tag.id && t.projectId === tag.projectId);
      if (!target) { res.status(400).json({ error: 'moveTo must be another one in the same project' }); return; }
      moveTo = target.id as string;
    }

    const tickets = read<Row>(TICKETS_FILE);
    const using = tickets.filter(t => ref.uses(t, tag.id as string));
    for (const t of using) ref.replace(t, tag.id as string, moveTo);
    if (using.length > 0) write(TICKETS_FILE, tickets);
    write(file, tags.filter(t => t.id !== tag.id));
    res.json({ ok: true, moved: using.length });
  });
}

registerTagRoutes('/api/labels', LABELS_FILE, LABEL_REF);
registerTagRoutes('/api/epics', EPICS_FILE, EPIC_REF);

app.get('/api/tickets', (_req, res) => {
  res.json(read(TICKETS_FILE));
});

app.post('/api/tickets', (req, res) => {
  const tickets = read<Record<string, unknown>>(TICKETS_FILE);
  const ticket = { id: uuidv4(), ...req.body };
  tickets.push(ticket);
  write(TICKETS_FILE, tickets);
  res.json(ticket);
});

app.put('/api/tickets/:id', (req, res) => {
  const tickets = read<Record<string, unknown>>(TICKETS_FILE);
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  tickets[idx] = { ...tickets[idx], ...req.body };
  write(TICKETS_FILE, tickets);
  res.json(tickets[idx]);
});

app.delete('/api/tickets/:id', (req, res) => {
  const tickets = read<Record<string, unknown>>(TICKETS_FILE);
  const filtered = tickets.filter(t => t.id !== req.params.id);
  if (filtered.length === tickets.length) { res.status(404).json({ error: 'Not found' }); return; }
  write(TICKETS_FILE, filtered);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
