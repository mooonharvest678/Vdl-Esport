import { useEffect, useMemo, useRef, useState } from 'react';
import type { Roster } from '../state/model';
import { buildShareUrl, copyToClipboard } from '../sync/urlAdapter';
import { Modal } from './Modal';

interface ShareDialogProps {
  roster: Roster;
  onClose: () => void;
}

// Browsers and chat clients start truncating well before this, but a full 15-slot board
// compresses to a few hundred characters, so it's only a concern for very large boards.
const LONG_URL_THRESHOLD = 2000;

export function ShareDialog({ roster, onClose }: ShareDialogProps) {
  const url = useMemo(() => buildShareUrl(roster), [roster]);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const copy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      inputRef.current?.select();
    }
  };

  return (
    <Modal
      title="Chia sẻ đội hình"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-primary" onClick={copy}>
            {copied ? 'Đã copy' : 'Sao chép link'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, color: 'var(--text-dim)', fontSize: 14 }}>
        Toàn bộ dữ liệu của bảng được nén vào đường link này, bất kỳ ai mở link cũng sẽ thấy chính xác những gì bạn đang thấy. 
        Đây là một bản lưu tĩnh chứ không cập nhật tự động — vì vậy sau khi bạn thay đổi đội hình, hãy copy và chia sẻ một link mới.
      </p>
      <input
        ref={inputRef}
        className="share-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Link chia sẻ"
      />
      <p className="share-length">
        {url.length} ký tự
        {url.length > LONG_URL_THRESHOLD && '- link khá dài nên một số ứng dụng nhắn tin có thể sẽ cắt bớt.'}
      </p>
    </Modal>
  );
}
