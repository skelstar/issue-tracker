import type { Tag, TagKind } from '../types';
import { TAG_NOUN } from '../types';

export const NEW_TAG = '__new__';

/** What the user picked: '' = none, NEW_TAG = create one called newName, otherwise a tag id. */
export interface TagChoice {
  value: string;
  newName: string;
}

export function tagChoiceFor(id: string | null | undefined): TagChoice {
  return { value: id ?? '', newName: '' };
}

export function isDuplicateName(name: string, tags: Tag[], exceptId?: string): boolean {
  const n = name.trim().toLowerCase();
  return tags.some(t => t.id !== exceptId && t.name.trim().toLowerCase() === n);
}

export function isTagChoiceValid(choice: TagChoice, tags: Tag[]): boolean {
  if (choice.value !== NEW_TAG) return true;
  return !!choice.newName.trim() && !isDuplicateName(choice.newName, tags);
}

interface Props {
  kind: TagKind;
  id: string;
  tags: Tag[];
  choice: TagChoice;
  onChange: (choice: TagChoice) => void;
}

/** A label/epic dropdown with "None" and "+ Create new …" options. */
export default function TagPicker({ kind, id, tags, choice, onChange }: Props) {
  const noun = TAG_NOUN[kind];
  const isNew = choice.value === NEW_TAG;
  const duplicate = isNew && isDuplicateName(choice.newName, tags);

  return (
    <>
      <div className="form-field">
        <label htmlFor={id}>{noun[0].toUpperCase() + noun.slice(1)}</label>
        <select id={id} value={choice.value} onChange={e => onChange({ ...choice, value: e.target.value })}>
          <option value="">No {noun}</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option value={NEW_TAG}>+ Create new {noun}…</option>
        </select>
      </div>
      {isNew && (
        <div className="form-field">
          <label htmlFor={`${id}-new`}>New {noun} name</label>
          <input
            id={`${id}-new`}
            type="text"
            value={choice.newName}
            onChange={e => onChange({ ...choice, newName: e.target.value })}
            autoFocus
          />
          {duplicate && <span className="form-error">This project already has a {noun} called that.</span>}
        </div>
      )}
    </>
  );
}
