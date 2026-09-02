import type { UmaCard } from '../data/catalog';

interface PortraitProps {
  card: UmaCard;
  large?: boolean;
}

/** GameTora-hosted thumbnail. Hidden rather than broken if the image doesn't load. */
export function Portrait({ card, large }: PortraitProps) {
  if (!card.thumbnail) return <div className={large ? 'portrait portrait-lg' : 'portrait'} />;
  return (
    <img
      className={large ? 'portrait portrait-lg' : 'portrait'}
      src={card.thumbnail}
      alt=""
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.visibility = 'hidden';
      }}
    />
  );
}
