import type { Catalog, LaneTag } from '../data/catalog';
import { statusFor, type ConflictMap } from '../state/conflicts';
import { isLockedIn, type Slot } from '../state/model';
import type { RosterAction } from '../state/rosterStore';
import { AptitudeBadge } from './AptitudeBadge';
import { Portrait } from './Portrait';

interface SlotCardProps {
  slot: Slot;
  index: number;
  laneTag?: LaneTag;
  catalog: Catalog;
  conflicts: ConflictMap;
  hasIssue: boolean;
  dispatch: (action: RosterAction) => void;
  onOpenPicker: () => void;
  canRemove: boolean;
  onRemove: () => void;
}

export function SlotCard({
  slot,
  index,
  laneTag,
  catalog,
  conflicts,
  hasIssue,
  dispatch,
  onOpenPicker,
  canRemove,
  onRemove,
}: SlotCardProps) {
  const locked = isLockedIn(slot);
  const tentative = slot.picks.length > 1;
  const cards = slot.picks.map((cardId) => catalog.byCardId.get(cardId)).filter((c) => c != null);

  const pickStatuses = slot.picks.map((cardId) => statusFor(conflicts, cardId, slot.id).kind);
  const contestedCount = pickStatuses.filter((kind) => kind === 'contested').length;
  const takenCount = pickStatuses.filter((kind) => kind === 'taken').length;

  const className = [
    'slot',
    hasIssue ? 'slot-conflict' : locked ? 'slot-locked' : tentative ? 'slot-tentative' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="slot-top">
        <span className="slot-index">{index + 1}</span>
        <input
          className="player-input"
          placeholder="Player name"
          value={slot.player}
          onChange={(event) =>
            dispatch({ type: 'setPlayer', slotId: slot.id, player: event.target.value })
          }
        />
        {canRemove && (
          <button className="pick-remove" onClick={onRemove} title="Remove this slot">
            &times;
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="slot-empty">No uma picked</div>
      ) : (
        <div className={cards.length > 1 ? 'picks picks-multi' : 'picks'}>
          {cards.map((card) => {
            const status = statusFor(conflicts, card.cardId, slot.id);
            const conflicted = status.kind === 'taken';
            const pickClass = [
              'pick',
              conflicted
                ? 'pick-conflict'
                : locked
                  ? 'pick-locked'
                  : status.kind === 'contested'
                    ? 'pick-maybe pick-contested'
                    : 'pick-maybe',
            ].join(' ');

            return (
              <div className={pickClass} key={card.cardId}>
                <button
                  className="pick-remove pick-remove-corner"
                  onClick={() =>
                    dispatch({ type: 'removePick', slotId: slot.id, cardId: card.cardId })
                  }
                  title={`Remove ${card.characterName}`}
                >
                  &times;
                </button>
                <Portrait card={card} className="sprite" />
                <span className="pick-name">{card.characterName}</span>
                <span className="pick-meta">
                  {/* Only non-default outfits are worth naming; "Original" is just noise. */}
                  {card.type && card.type !== 'Original' && (
                    <span className="pick-variant">{card.type}</span>
                  )}
                  {laneTag && <AptitudeBadge card={card} tag={laneTag} />}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tentative && contestedCount === 0 && takenCount === 0 && (
        <div className="maybe-hint">Undecided — {cards.length} options listed</div>
      )}
      {tentative && contestedCount > 0 && (
        <div className="maybe-hint">
          {contestedCount === 1 ? 'One option is' : `${contestedCount} options are`} also on
          someone else's maybe list
        </div>
      )}
      {tentative && takenCount > 0 && (
        <div className="conflict-hint">
          {takenCount === 1 ? 'One option has' : `${takenCount} options have`} been locked in by
          someone else
        </div>
      )}
      {hasIssue && <div className="conflict-hint">Clashes with another locked-in pick</div>}

      <div className="slot-actions">
        <button className="btn btn-sm" onClick={onOpenPicker}>
          {cards.length === 0 ? 'Pick uma' : tentative ? 'Edit maybes' : 'Change'}
        </button>
        {cards.length > 0 && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => dispatch({ type: 'setPicks', slotId: slot.id, cardIds: [] })}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
