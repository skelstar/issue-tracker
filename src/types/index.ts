export type Status = 'todo' | 'in-progress' | 'review' | 'done';

export interface StatusDef {
  id: Status;
  label: string;
}

export const STATUSES: StatusDef[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Ticket {
  id: string;
  title: string;
  labelId: string;
  status: Status;
  createdAt: string;
}

export const LABEL_COLORS = [
  '#2563EB',
  '#E11D48',
  '#16A34A',
  '#D97706',
  '#7C3AED',
  '#0891B2',
  '#EA580C',
  '#BE185D',
  '#065F46',
  '#9333EA',
];
