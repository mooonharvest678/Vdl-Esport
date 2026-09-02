import { useState } from 'react';
import { LANE_TAGS, type LaneTag } from '../data/catalog';
import { PRESETS, rosterFromPreset } from '../config/presets';
import { totalSlots, type Roster, type UniqueMode } from '../state/model';
import type { RosterAction } from '../state/rosterStore';
import { Modal } from './Modal';

interface SettingsDialogProps {
  roster: Roster;
  dispatch: (action: RosterAction) => void;
  onClose: () => void;
}

const UNIQUE_MODE_OPTIONS: { mode: UniqueMode; title: string; desc: string }[] = [
  {
    mode: 'character',
    title: 'One per character',
    desc: 'Alternate outfits count as the same uma. This is the usual tournament rule.',
  },
  {
    mode: 'outfit',
    title: 'One per outfit',
    desc: 'Two players may run the same uma as long as they use different versions.',
  },
  {
    mode: 'off',
    title: 'No restriction',
    desc: 'Anyone can run anything. Nothing is locked out and nothing is flagged.',
  },
];

export function SettingsDialog({ roster, dispatch, onClose }: SettingsDialogProps) {
  const [showPresets, setShowPresets] = useState(false);

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    const filled = roster.lanes.some((lane) =>
      lane.slots.some((slot) => slot.picks.length > 0 || slot.player.trim()),
    );
    if (
      filled &&
      !window.confirm('Applying a format rebuilds the board and clears every pick. Continue?')
    ) {
      return;
    }
    dispatch({
      type: 'replace',
      roster: {
        ...rosterFromPreset(preset, roster.title),
        settings: roster.settings,
      },
    });
    setShowPresets(false);
  };

  return (
    <Modal
      title="Tournament settings"
      onClose={onClose}
      footer={
        <>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {totalSlots(roster)} slots across {roster.lanes.length}{' '}
            {roster.lanes.length === 1 ? 'group' : 'groups'}
          </span>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="field">
        <span className="field-label">Unique uma rule</span>
        <div className="mode-options">
          {UNIQUE_MODE_OPTIONS.map((option) => (
            <label
              key={option.mode}
              className={
                roster.settings.uniqueMode === option.mode
                  ? 'mode-option mode-option-active'
                  : 'mode-option'
              }
            >
              <input
                type="radio"
                name="unique-mode"
                checked={roster.settings.uniqueMode === option.mode}
                onChange={() => dispatch({ type: 'setUniqueMode', mode: option.mode })}
              />
              <span>
                <span className="mode-option-title">{option.title}</span>
                <span className="mode-option-desc" style={{ display: 'block' }}>
                  {option.desc}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Groups</span>
        <div className="lane-editor">
          {roster.lanes.map((lane) => (
            <div className="lane-row" key={lane.id}>
              <input
                type="text"
                value={lane.name}
                onChange={(event) =>
                  dispatch({ type: 'setLaneName', laneId: lane.id, name: event.target.value })
                }
                aria-label="Group name"
              />
              <select
                value={lane.tag ?? ''}
                onChange={(event) =>
                  dispatch({
                    type: 'setLaneTag',
                    laneId: lane.id,
                    tag: (event.target.value || undefined) as LaneTag | undefined,
                  })
                }
                aria-label="Race category"
              >
                <option value="">No category</option>
                {LANE_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <div className="count-control">
                <button
                  onClick={() =>
                    dispatch({
                      type: 'setLaneSlotCount',
                      laneId: lane.id,
                      count: lane.slots.length - 1,
                    })
                  }
                  disabled={lane.slots.length <= 1}
                  aria-label="Remove a slot"
                >
                  &minus;
                </button>
                <span className="count-value">{lane.slots.length}</span>
                <button
                  onClick={() =>
                    dispatch({
                      type: 'setLaneSlotCount',
                      laneId: lane.id,
                      count: lane.slots.length + 1,
                    })
                  }
                  aria-label="Add a slot"
                >
                  +
                </button>
              </div>
              <button
                className="btn btn-sm btn-ghost btn-danger"
                onClick={() => dispatch({ type: 'removeLane', laneId: lane.id })}
                disabled={roster.lanes.length <= 1}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => dispatch({ type: 'addLane' })}
        >
          + Add group
        </button>
        <p className="field-help">
          A category makes each slot show that uma's aptitude grade for the distance. It's a hint
          only and never blocks a pick.
        </p>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <span className="field-label">Start from a format</span>
        {showPresets ? (
          <div className="preset-list">
            {PRESETS.map((preset) => (
              <button
                className="preset-option"
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
              >
                <span className="preset-title" style={{ display: 'block' }}>
                  {preset.label}
                </span>
                <span className="preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <button className="btn btn-sm" onClick={() => setShowPresets(true)}>
            Choose a format...
          </button>
        )}
        <p className="field-help">Applying a format rebuilds the board and clears every pick.</p>
      </div>
    </Modal>
  );
}
