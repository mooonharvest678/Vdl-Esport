import type { Catalog } from '../data/catalog';
import type { ConflictMap } from '../state/conflicts';
import type { Roster } from '../state/model';
import type { RosterAction } from '../state/rosterStore';
import { SlotCard } from './SlotCard';

interface BoardProps {
  roster: Roster;
  catalog: Catalog;
  conflicts: ConflictMap;
  /** Slot ids flagged by the board-level issue scan. */
  issueSlotIds: Set<string>;
  dispatch: (action: RosterAction) => void;
  onOpenPicker: (slotId: string) => void;
}

export function Board({
  roster,
  catalog,
  conflicts,
  issueSlotIds,
  dispatch,
  onOpenPicker,
}: BoardProps) {
  return (
    <div className="board">
      {roster.lanes.map((lane) => (
        <section className="lane" key={lane.id}>
          <div className="lane-header">
            <input
              className="lane-name-input"
              value={lane.name}
              onChange={(event) =>
                dispatch({ type: 'setLaneName', laneId: lane.id, name: event.target.value })
              }
              aria-label="Group name"
            />
            {lane.tag && <span className="lane-tag">{lane.tag}</span>}
          </div>

          <div className="lane-slots">
            {lane.slots.map((slot, index) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                index={index}
                laneTag={lane.tag}
                catalog={catalog}
                conflicts={conflicts}
                hasIssue={issueSlotIds.has(slot.id)}
                dispatch={dispatch}
                onOpenPicker={() => onOpenPicker(slot.id)}
                canRemove={lane.slots.length > 1}
                onRemove={() => dispatch({ type: 'removeSlot', laneId: lane.id, slotId: slot.id })}
              />
            ))}
          </div>

          <button
            className="btn btn-sm btn-ghost"
            style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
            onClick={() => dispatch({ type: 'addSlot', laneId: lane.id })}
          >
            + Add player
          </button>
        </section>
      ))}
    </div>
  );
}
