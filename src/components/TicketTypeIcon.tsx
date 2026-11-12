import type { TicketType } from '../types';
import { TICKET_TYPES } from '../types';

const SPIKE_GREEN = '#16A34A';
const TASK_BLUE = '#2563EB';
const BUG_RED = '#DC2626';

interface Props {
  type: TicketType;
  size?: 'sm' | 'md';
}

/** Spike: green question mark in a circle. Task: blue outlined checkbox with tick. Bug: red outlined beetle. */
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
        // Outlined beetle, after Flaticon's "bug" icon #7322297.
        <g fill="none" stroke={BUG_RED} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          {/* head and antennae */}
          <path d="M5.5 5.5a2.5 2.5 0 0 1 5 0" />
          <path d="M5.9 1.4 6.6 2.7M10.1 1.4 9.4 2.7" />
          {/* body, split down the middle */}
          <path d="M5.2 5.5h5.6c1.5 0 1.7 2.5 1.7 3.8 0 2.9-2 4.9-4.5 4.9s-4.5-2-4.5-4.9c0-1.3.2-3.8 1.7-3.8z" />
          <path d="M8 5.5V14" />
          {/* legs */}
          <path d="M2.4 5.4 3.9 6.4M1.5 9.4h1.9M2.5 13.3 3.9 12M13.6 5.4 12.1 6.4M14.5 9.4h-1.9M13.5 13.3 12.1 12" />
        </g>
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
        // Outlined checkbox, after Flaticon's "check-box" icon #9222555.
        <g fill="none" stroke={TASK_BLUE} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.6" y="1.6" width="12.8" height="12.8" rx="1.6" />
          <polyline points="4.5,8.5 6.5,10.5 11.5,5.5" />
        </g>
      )}
    </svg>
  );
}
