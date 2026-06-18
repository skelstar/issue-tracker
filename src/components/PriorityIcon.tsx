import type { Priority } from '../types';
import { PRIORITY_COLORS, PRIORITIES } from '../types';

function Chevron({ color }: { color: string }) {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,5 4.5,1 8,5" />
    </svg>
  );
}

interface Props {
  priority: Priority;
  size?: 'sm' | 'md';
}

export default function PriorityIcon({ priority, size = 'sm' }: Props) {
  const color = PRIORITY_COLORS[priority];
  const label = PRIORITIES.find(p => p.value === priority)?.label ?? '';
  const count = 4 - priority; // P1→3 chevrons, P2→2, P3→1

  return (
    <span
      className={`priority-icon priority-icon--${size}`}
      title={`${label} priority`}
      aria-label={`${label} priority`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Chevron key={i} color={color} />
      ))}
    </span>
  );
}
