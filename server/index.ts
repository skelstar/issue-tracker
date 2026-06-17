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

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TICKETS_FILE)) fs.writeFileSync(TICKETS_FILE, '[]');
if (!fs.existsSync(LABELS_FILE)) fs.writeFileSync(LABELS_FILE, '[]');

function read<T>(file: string): T[] {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function write<T>(file: string, data: T[]): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.get('/api/labels', (_req, res) => {
  res.json(read(LABELS_FILE));
});

app.post('/api/labels', (req, res) => {
  const labels = read<Record<string, unknown>>(LABELS_FILE);
  const label = { id: uuidv4(), ...req.body };
  labels.push(label);
  write(LABELS_FILE, labels);
  res.json(label);
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
