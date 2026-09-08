import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './components/Board';
import { SettingsDialog } from './components/SettingsDialog';
import { ShareDialog } from './components/ShareDialog';
import { UmaPicker } from './components/UmaPicker';
import { defaultRoster } from './config/presets';
import { loadCatalog, type Catalog, type CatalogLoad } from './data/catalog';
import { boardIssues, buildConflictMap } from './state/conflicts';
import { filledSlots, totalSlots, type Roster } from './state/model';
import { RosterStore, useRoster } from './state/rosterStore';
import { LocalStorageAdapter } from './sync/localStorageAdapter';
import { clearHash, readRosterFromHash } from './sync/urlAdapter';

const localAdapter = new LocalStorageAdapter();

interface Boot {
  store: RosterStore;
  catalog: Catalog;
  catalogSource: CatalogLoad['source'];
  /** True when the board came from someone else's share link rather than local autosave. */
  fromShareLink: boolean;
}

function useBoot() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // A share link always wins over local autosave: opening one should show that board.
      const shared = readRosterFromHash();
      let initial: Roster | null = shared;
      if (!initial) initial = await localAdapter.load();

      try {
        const load = await loadCatalog((refreshed) => {
          if (!cancelled) setCatalog(refreshed.catalog);
        });
        if (cancelled) return;
        setCatalog(load.catalog);
        setBoot({
          store: new RosterStore(initial ?? defaultRoster()),
          catalog: load.catalog,
          catalogSource: load.source,
          fromShareLink: shared != null,
        });
      } catch {
        if (!cancelled) setError('Không thể tải danh sách Uma. Vui lòng kiểm tra kết nối mạng và tải lại trang.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { boot, catalog, error };
}

export function App() {
  const { boot, catalog, error } = useBoot();

  if (error) {
    return (
      <div className="app">
        <div className="notice notice-error">{error}</div>
      </div>
    );
  }

  if (!boot || !catalog) {
    return <div className="loading">Đang tải danh sách Uma...</div>;
  }

  return <Picker boot={boot} catalog={catalog} />;
}

function Picker({ boot, catalog }: { boot: Boot; catalog: Catalog }) {
  const { store } = boot;
  const roster = useRoster(store);

  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [sharedBannerOpen, setSharedBannerOpen] = useState(boot.fromShareLink);

  // The board this session started from, so the first real edit can be detected.
  const baselineRoster = useRef(roster);

  // Pasting a share link into the address bar while the app is already open only changes
  // the hash, which never remounts anything, so the new board has to be picked up here.
  useEffect(() => {
    const onHashChange = () => {
      const shared = readRosterFromHash();
      if (!shared) return;
      baselineRoster.current = shared;
      store.dispatch({ type: 'replace', roster: shared });
      setSharedBannerOpen(true);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [store]);

  // Once the board has been edited it is no longer the board that was shared, and leaving
  // the stale link in the address bar would silently discard those edits on reload.
  useEffect(() => {
    if (roster !== baselineRoster.current) clearHash();
  }, [roster]);

  // Autosave. Debounced so typing a player name doesn't hammer localStorage.
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void localAdapter.save(roster), 400);
    return () => window.clearTimeout(saveTimer.current);
  }, [roster]);

  const conflicts = useMemo(() => buildConflictMap(roster, catalog), [roster, catalog]);
  const issues = useMemo(
    () => boardIssues(roster, catalog, conflicts),
    [roster, catalog, conflicts],
  );
  const issueSlotIds = useMemo(() => new Set(issues.map((issue) => issue.slotId)), [issues]);

  const dispatch = store.dispatch;

  const startFresh = useCallback(() => {
    if (!window.confirm('Bạn có chắc muốn xóa dữ liệu bảng hiện tại và tạo một bảng mới không?')) return;
    clearHash();
    setSharedBannerOpen(false);
    dispatch({ type: 'replace', roster: defaultRoster() });
  }, [dispatch]);

  const openSlot = useMemo(() => {
    if (!pickerSlotId) return null;
    for (const lane of roster.lanes) {
      const index = lane.slots.findIndex((slot) => slot.id === pickerSlotId);
      if (index >= 0) return { lane, slot: lane.slots[index], index };
    }
    return null;
  }, [pickerSlotId, roster]);

  // A slot whose row disappeared (deleted while its picker was open) closes itself.
  useEffect(() => {
    if (pickerSlotId && !openSlot) setPickerSlotId(null);
  }, [pickerSlotId, openSlot]);

  const filled = filledSlots(roster);
  const total = totalSlots(roster);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-name">VDL Esport - Uma Picker</span>
          <input
            className="title-input"
            value={roster.title}
            onChange={(event) => dispatch({ type: 'setTitle', title: event.target.value })}
            placeholder="Tên đội"
            aria-label="Tên đội"
          />
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowSettings(true)}>
            Cài đặt
          </button>
          <button className="btn btn-ghost" onClick={startFresh}>
            Tạo mới
          </button>
          <button className="btn btn-primary" onClick={() => setShowShare(true)}>
            Chia sẻ link
          </button>
        </div>
      </header>

      {sharedBannerOpen && (
        <div className="notice notice-info">
          <div className="notice-body">
            Bạn đang xem bảng được chia sẻ. Các thay đổi chỉ lưu trên thiết bị này cho đến khi bạn tạo link chia sẻ mới.
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => setSharedBannerOpen(false)}>
            Toi dong tinh
          </button>
        </div>
      )}

      {boot.catalogSource === 'bundled' && (
        <div className="notice notice-warn">
          <div className="notice-body">
            Không thể kết nối với máy chủ dữ liệu, đang sử dụng danh sách offline. Các Uma mới ra mắt gần đây có thể chưa được cập nhật.
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="notice notice-error">
          <div className="notice-body">
            <strong>
              {issues.length === 1 ? 'Có 1 trường hợp trùng lặp cần xử lý' : `Có ${issues.length} trường hợp trùng lặp cần xử lý`}
            </strong>
            <ul>
              {issues.map((issue) => (
                <li key={issue.slotId}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="meta-row">
        <span className="progress-pill">
          Đã chọn: {filled} / {total}
        </span>
        <span>
          {roster.settings.uniqueMode === 'character'
            ? 'Chỉ 1 Uma mỗi nhân vật (Bao gồm cả các dạng Alt/Trang phục khác)'
            : roster.settings.uniqueMode === 'outfit'
              ? 'Chỉ 1 Uma mỗi trang phục (Được phép dùng dạng Alt)'
              : 'Không giới hạn trùng lặp Uma'}
        </span>
        <span>Chọn nhiều hơn một Uma vào cùng một ô nếu bạn vẫn đang phân vân.</span>
      </div>

      <Board
        roster={roster}
        catalog={catalog}
        conflicts={conflicts}
        issueSlotIds={issueSlotIds}
        dispatch={dispatch}
        onOpenPicker={setPickerSlotId}
      />

      {openSlot && (
        <UmaPicker
          catalog={catalog}
          conflicts={conflicts}
          slotId={openSlot.slot.id}
          slotLabel={
            openSlot.slot.player.trim() || `${openSlot.lane.name} #${openSlot.index + 1}`
          }
          laneTag={openSlot.lane.tag}
          selected={openSlot.slot.picks}
          onToggle={(cardId) =>
            dispatch(
              openSlot.slot.picks.includes(cardId)
                ? { type: 'removePick', slotId: openSlot.slot.id, cardId }
                : { type: 'addPick', slotId: openSlot.slot.id, cardId },
            )
          }
          onClose={() => setPickerSlotId(null)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          roster={roster}
          dispatch={dispatch}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showShare && <ShareDialog roster={roster} onClose={() => setShowShare(false)} />}
    </div>
  );
}
