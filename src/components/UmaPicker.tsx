import { useMemo, useState } from 'react';
import {
  aptitudeForLane,
  isStrongAptitude,
  type Catalog,
  type LaneTag,
  type UmaCard,
} from '../data/catalog';
import { statusFor, type ConflictMap, type PickStatus } from '../state/conflicts';
import { AptitudeBadge } from './AptitudeBadge';
import { Modal } from './Modal';
import { Portrait } from './Portrait';

interface UmaPickerProps {
  catalog: Catalog;
  conflicts: ConflictMap;
  slotId: string;
  slotLabel: string;
  laneTag?: LaneTag;
  selected: string[];
  onToggle: (cardId: string) => void;
  onClose: () => void;
}

interface CharacterGroup {
  characterId: string;
  characterName: string;
  outfits: UmaCard[];
  /** Best lane aptitude across the character's outfits, used for the "fits lane" sort. */
  bestGrade: number;
}

const GRADE_ORDER = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

function statusLabel(status: PickStatus): { text: string; className: string } | null {
  switch (status.kind) {
    case 'taken':
      return { text: `${status.by.who}`, className: 'outfit-status status-taken' };
    case 'contested':
      return { text: 'also a maybe', className: 'outfit-status status-contested' };
    case 'mine':
      return { text: 'locked in', className: 'outfit-status status-mine' };
    default:
      return null;
  }
}

export function UmaPicker({
  catalog,
  conflicts,
  slotId,
  slotLabel,
  laneTag,
  selected,
  onToggle,
  onClose,
}: UmaPickerProps) {
  const [query, setQuery] = useState('');
  const [hideTaken, setHideTaken] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'aptitude'>(laneTag ? 'aptitude' : 'name');

  const groups = useMemo<CharacterGroup[]>(() => {
    const needle = query.trim().toLowerCase();
    const terms = needle ? needle.split(/\s+/) : [];
    const byCharacter = new Map<string, CharacterGroup>();

    for (const card of catalog.cards) {
      if (terms.length > 0 && !terms.every((term) => card.searchText.includes(term))) continue;

      const status = statusFor(conflicts, card.cardId, slotId);
      if (hideTaken && status.kind === 'taken') continue;

      const grade = laneTag ? GRADE_ORDER.indexOf(aptitudeForLane(card, laneTag)) : 99;
      const existing = byCharacter.get(card.characterId);
      if (existing) {
        existing.outfits.push(card);
        existing.bestGrade = Math.min(existing.bestGrade, grade);
      } else {
        byCharacter.set(card.characterId, {
          characterId: card.characterId,
          characterName: card.characterName,
          outfits: [card],
          bestGrade: grade,
        });
      }
    }

    const result = [...byCharacter.values()];
    result.sort((a, b) =>
      sortBy === 'aptitude' && laneTag
        ? a.bestGrade - b.bestGrade || a.characterName.localeCompare(b.characterName)
        : a.characterName.localeCompare(b.characterName),
    );
    return result;
  }, [catalog, conflicts, slotId, query, hideTaken, laneTag, sortBy]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toolbar = (
    <div className="search-row">
      <input
        className="search-input"
        placeholder="Search name, outfit, or nickname..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoFocus
      />
      {laneTag && (
        <select
          className="filter-select"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as 'name' | 'aptitude')}
          aria-label="Sort order"
        >
          <option value="aptitude">Best for {laneTag}</option>
          <option value="name">A to Z</option>
        </select>
      )}
    </div>
  );

  const footer = (
    <>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={hideTaken}
          onChange={(event) => setHideTaken(event.target.checked)}
          style={{ accentColor: 'var(--accent)' }}
        />
        Hide taken
      </label>
      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
        {selected.length === 0
          ? 'Nothing picked yet'
          : selected.length === 1
            ? 'Locked in'
            : `${selected.length} maybes`}
      </span>
      <button className="btn btn-primary" onClick={onClose}>
        Done
      </button>
    </>
  );

  return (
    <Modal
      wide
      title={
        <>
          Pick for {slotLabel}
          {laneTag && <span className="modal-sub"> · {laneTag} group</span>}
        </>
      }
      onClose={onClose}
      toolbar={toolbar}
      footer={footer}
    >
      {groups.length === 0 ? (
        <div className="empty-state">
          No uma match that search.
          {hideTaken && ' Try unchecking "Hide taken".'}
        </div>
      ) : (
        <div className="character-list">
          {groups.map((group) => (
            <div className="character-group" key={group.characterId}>
              <div className="character-head">
                <Portrait card={group.outfits[0]} />
                <span className="character-name">{group.characterName}</span>
                {group.outfits.length > 1 && (
                  <span className="character-note">{group.outfits.length} outfits</span>
                )}
                {laneTag && isStrongAptitude(aptitudeForLane(group.outfits[0], laneTag)) && (
                  <AptitudeBadge card={group.outfits[0]} tag={laneTag} />
                )}
              </div>
              <div className="outfit-list">
                {group.outfits.map((card) => {
                  const status = statusFor(conflicts, card.cardId, slotId);
                  const isSelected = selectedSet.has(card.cardId);
                  // Taken means another slot locked it in, so it can't be added here.
                  // Already-selected entries stay clickable so they can be removed.
                  const blocked = status.kind === 'taken' && !isSelected;
                  const label = statusLabel(status);

                  return (
                    <button
                      key={card.cardId}
                      className={[
                        'outfit',
                        isSelected ? 'outfit-selected' : '',
                        blocked ? 'outfit-taken' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={blocked}
                      onClick={() => onToggle(card.cardId)}
                      title={
                        blocked && status.kind === 'taken'
                          ? `Locked in by ${status.by.who}`
                          : undefined
                      }
                    >
                      <Portrait card={card} />
                      <span className="outfit-text">
                        <span className="outfit-name">{card.type || 'Original'}</span>
                        <span className="outfit-sub">{card.costume || card.rarity}</span>
                      </span>
                      {laneTag && <AptitudeBadge card={card} tag={laneTag} />}
                      {label && !isSelected && (
                        <span className={label.className}>{label.text}</span>
                      )}
                      {isSelected && <span className="outfit-status status-mine">picked</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
