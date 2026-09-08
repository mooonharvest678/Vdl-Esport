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
    title: 'Một nhân vật duy nhất',
    desc: 'Các trang phục khác nhau vẫn được tính là cùng một Uma. Đây là quy tắc thông thường của các giải đấu.',
  },
  {
    mode: 'outfit',
    title: 'Mỗi phiên bản một nhân vật',
    desc: 'Hai tuyển thủ có thể dùng chung một Uma miễn là họ sử dụng các phiên bản (trang phục) khác nhau.',
  },
  {
    mode: 'off',
    title: 'Không giới hạn',
    desc: 'Ai cũng có thể chọn bất kỳ nhân vật nào. Không có lựa chọn nào bị khóa hay bị cảnh báo.',
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
      !window.confirm('Áp dụng định dạng mới sẽ làm lại bảng và xóa toàn bộ các lựa chọn hiện tại. Bạn có chắc muốn tiếp tục không?')
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
      title="Cài đặt giải đấu"
      onClose={onClose}
      footer={
        <>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {totalSlots(roster)} vị trí trong {roster.lanes.length} nhóm
          </span>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Hoàn tất
          </button>
        </>
      }
    >
      <div className="field">
        <span className="field-label">Quy tắc chọn Uma</span>
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
        <span className="field-label">Danh sách Cự ly</span>
        <div className="lane-editor">
          {roster.lanes.map((lane) => (
            <div className="lane-row" key={lane.id}>
              <input
                type="text"
                value={lane.name}
                onChange={(event) =>
                  dispatch({ type: 'setLaneName', laneId: lane.id, name: event.target.value })
                }
                aria-label="Tên nhóm"
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
                aria-label="Cự ly thi đấu"
              >
                <option value="">Mặc định</option>
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
                  aria-label="Xóa vị trít"
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
                  aria-label="Thêm vị trí"
                >
                  +
                </button>
              </div>
              <button
                className="btn btn-sm btn-ghost btn-danger"
                onClick={() => dispatch({ type: 'removeLane', laneId: lane.id })}
                disabled={roster.lanes.length <= 1}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => dispatch({ type: 'addLane' })}
        >
          + Thêm nhóm
        </button>
        <p className="field-help">
          Việc chọn cự ly sẽ hiển thị độ thích ứng của Uma với cự ly đó. Đây chỉ là một gợi ý, bạn vẫn có thể chọn bất kỳ Uma nào.
        </p>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <span className="field-label">Bắt đầu từ một định dạng có sẵn</span>
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
            Chọn một định dạng giải đấu...
          </button>
        )}
        <p className="field-help">Lưu ý: Việc áp dụng định dạng có sẵn sẽ xóa toàn bộ lựa chọn hiện tại trên bảng.</p>
      </div>
    </Modal>
  );
}
