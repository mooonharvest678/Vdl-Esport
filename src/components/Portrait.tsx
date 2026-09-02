import type { UmaCard } from '../data/catalog';

interface PortraitProps {
  card: UmaCard;
  /** Sizing is left to the caller: `portrait` for list rows, `sprite` for slot cards. */
  className?: string;
}

/** GameTora-hosted stand image, cropped to the head. Hidden rather than broken if it fails. */
export function Portrait({ card, className = 'portrait' }: PortraitProps) {
  if (!card.thumbnail) return <div className={className} />;
  return (
    <img
      className={className}
      src={card.thumbnail}
      alt=""
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.visibility = 'hidden';
      }}
    />
  );
}
