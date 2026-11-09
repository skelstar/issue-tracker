export type Status = 'todo' | 'next' | 'in-progress' | 'review' | 'done';

export interface StatusDef {
  id: Status;
  label: string;
}

export const STATUSES: StatusDef[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'next', label: 'Next/Ready' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export interface Label {
  id: string;
  name: string;
  color: string;
  /** The project whose board shows this label as a swimlane. null = orphaned legacy label. */
  projectId: string | null;
  collapsed?: boolean;
}

export interface Project {
  id: string;
  name: string;
}

export type Priority = 1 | 2 | 3;

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 1, label: 'High' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Low' },
];

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: '#DC2626',
  2: '#D97706',
  3: '#94A3B8',
};

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  labelId: string;
  status: Status;
  priority: Priority;
  projectId: string;
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

/** Colour for a new label: the first palette colour the project isn't using yet. */
export function nextLabelColor(projectLabels: Label[]): string {
  const used = new Set(projectLabels.map(l => l.color));
  return LABEL_COLORS.find(c => !used.has(c)) ?? LABEL_COLORS[projectLabels.length % LABEL_COLORS.length];
}
