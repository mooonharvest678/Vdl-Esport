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
      title="Share this board"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-primary" onClick={copy}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, color: 'var(--text-dim)', fontSize: 14 }}>
        The entire board is packed into this link, so anyone who opens it sees exactly what you
        see right now. It's a snapshot rather than a live document &mdash; after you make more
        changes, share a fresh link.
      </p>
      <input
        ref={inputRef}
        className="share-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Share link"
      />
      <p className="share-length">
        {url.length} characters
        {url.length > LONG_URL_THRESHOLD && ' — long enough that some chat apps may cut it off.'}
      </p>
    </Modal>
  );
}
