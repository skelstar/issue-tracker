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

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TICKETS_FILE)) fs.writeFileSync(TICKETS_FILE, '[]');
if (!fs.existsSync(LABELS_FILE)) fs.writeFileSync(LABELS_FILE, '[]');
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, '[]');

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

migrateLabelsToProjects();

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

app.get('/api/labels', (_req, res) => {
  res.json(read(LABELS_FILE));
});

app.post('/api/labels', (req, res) => {
  const { name, color, projectId } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || typeof projectId !== 'string') {
    res.status(400).json({ error: 'name and projectId are required' }); return;
  }
  const labels = read<Record<string, unknown>>(LABELS_FILE);
  const label = { id: uuidv4(), name: name.trim(), color, projectId };
  labels.push(label);
  write(LABELS_FILE, labels);
  res.json(label);
});

// Reorder labels. Body: { ids: string[] } in the desired order; any labels
// not listed keep their relative order at the end.
app.put('/api/labels/order', (req, res) => {
  const ids: unknown = req.body?.ids;
  if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids must be an array' }); return; }
  const labels = read<Record<string, unknown>>(LABELS_FILE);
  const byId = new Map(labels.map(l => [l.id, l]));
  const ordered = ids.filter(id => byId.has(id)).map(id => byId.get(id)!);
  const rest = labels.filter(l => !ids.includes(l.id));
  const result = [...ordered, ...rest];
  write(LABELS_FILE, result);
  res.json(result);
});

app.put('/api/labels/:id', (req, res) => {
  const labels = read<Record<string, unknown>>(LABELS_FILE);
  const idx = labels.findIndex(l => l.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  labels[idx] = { ...labels[idx], ...req.body, id: labels[idx].id };
  write(LABELS_FILE, labels);
  res.json(labels[idx]);
});

// Delete a label. If tickets still use it, ?moveTo=<labelId> (a label in the same
// project) must say where they go; otherwise 409 with the ticket count.
app.delete('/api/labels/:id', (req, res) => {
  const labels = read<Row>(LABELS_FILE);
  const label = labels.find(l => l.id === req.params.id);
  if (!label) { res.status(404).json({ error: 'Not found' }); return; }

  const tickets = read<Row>(TICKETS_FILE);
  const using = tickets.filter(t => t.labelId === label.id);
  if (using.length > 0) {
    const moveTo = req.query.moveTo;
    const target = labels.find(l => l.id === moveTo && l.id !== label.id && l.projectId === label.projectId);
    if (!target) {
      res.status(409).json({ error: 'Label has tickets; pass moveTo with another label in the same project', count: using.length });
      return;
    }
    for (const t of using) t.labelId = target.id;
    write(TICKETS_FILE, tickets);
  }
  write(LABELS_FILE, labels.filter(l => l.id !== label.id));
  res.json({ ok: true, moved: using.length });
});

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
