import { aptitudeForLane, isStrongAptitude, type LaneTag, type UmaCard } from '../data/catalog';

interface AptitudeBadgeProps {
  card: UmaCard;
  tag: LaneTag;
}

/** The uma's grade for the lane's race category. Advisory only; it never blocks a pick. */
export function AptitudeBadge({ card, tag }: AptitudeBadgeProps) {
  const grade = aptitudeForLane(card, tag);
  const weak = grade === 'E' || grade === 'F' || grade === 'G';
  const className = isStrongAptitude(grade) ? 'apt apt-strong' : weak ? 'apt apt-weak' : 'apt';
  return (
    <span className={className} title={`${tag} aptitude: ${grade}`}>
      {grade}
    </span>
  );
}
