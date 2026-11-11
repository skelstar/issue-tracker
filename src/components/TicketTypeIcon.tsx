import type { TicketType } from '../types';
import { TICKET_TYPES } from '../types';

const SPIKE_GREEN = '#16A34A';
const TASK_BLUE = '#2563EB';
const BUG_RED = '#DC2626';

interface Props {
  type: TicketType;
  size?: 'sm' | 'md';
}

/** Spike: green question mark in a circle. Task: blue ticked checkbox. Bug: white bug on red. */
export default function TicketTypeIcon({ type, size = 'sm' }: Props) {
  const px = size === 'md' ? 16 : 14;
  const label = TICKET_TYPES.find(t => t.value === type)?.label ?? '';

  return (
    <svg
      className="ticket-type-icon"
      width={px}
      height={px}
      viewBox="0 0 16 16"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {type === 'bug' ? (
        <>
          <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill={BUG_RED} />
          {/* legs and antennae */}
          <path
            d="M5.2 7.2 3.4 6.3M5 9.2H3.2M5.3 11.1l-1.8 1M10.8 7.2l1.8-.9M11 9.2h1.8M10.7 11.1l1.8 1M6.8 4.6 5.6 3.2M9.2 4.6l1.2-1.4"
            fill="none"
            stroke="#fff"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          {/* head and body */}
          <circle cx="8" cy="5.4" r="1.6" fill="#fff" />
          <ellipse cx="8" cy="9.3" rx="2.9" ry="3.3" fill="#fff" />
          <path d="M8 6.6v5.9" stroke={BUG_RED} strokeWidth="0.9" />
        </>
      ) : type === 'spike' ? (
        <>
          <circle cx="8" cy="8" r="7.5" fill={SPIKE_GREEN} />
          <path
            d="M5.9 6.1a2.15 2.15 0 1 1 3.1 1.95c-.6.3-1 .75-1 1.45v.3"
            fill="none"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="8" cy="12.1" r="1" fill="#fff" />
        </>
      ) : (
        <>
          <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill={TASK_BLUE} />
          <polyline
            points="4,8.3 6.8,11 12,5.2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
