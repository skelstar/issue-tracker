import { useEffect, useRef, useState } from 'react';
import type { TicketType } from '../types';
import { TICKET_TYPES } from '../types';
import TicketTypeIcon from './TicketTypeIcon';

interface Props {
  value: TicketType;
  onChange: (type: TicketType) => void;
}

/** A drop-down for ticket type that shows each type's icon (a native select can't). */
export default function TicketTypeSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = TICKET_TYPES.find(t => t.value === value) ?? TICKET_TYPES[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function openMenu() {
    setHighlight(Math.max(0, TICKET_TYPES.findIndex(t => t.value === value)));
    setOpen(true);
  }

  function choose(type: TicketType) {
    onChange(type);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlight(h => (h + 1) % TICKET_TYPES.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight(h => (h - 1 + TICKET_TYPES.length) % TICKET_TYPES.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(TICKET_TYPES[highlight].value);
        break;
      case 'Escape':
        // Close just the menu, not the whole dialog.
        e.stopPropagation();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }

  return (
    <div className={`type-select${open ? ' open' : ''}`} ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className="type-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Type: ${current.label}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <TicketTypeIcon type={current.value} size="md" />
        <span>{current.label}</span>
        <svg className="type-select-caret" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,1 5,5 9,1" />
        </svg>
      </button>
      {open && (
        <ul className="type-select-menu" role="listbox" aria-label="Type">
          {TICKET_TYPES.map((t, i) => (
            <li
              key={t.value}
              role="option"
              aria-selected={t.value === value}
              className={[
                'type-select-option',
                i === highlight ? 'highlighted' : '',
                t.value === value ? 'selected' : '',
              ].filter(Boolean).join(' ')}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(t.value)}
            >
              <TicketTypeIcon type={t.value} size="md" />
              <span>{t.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
