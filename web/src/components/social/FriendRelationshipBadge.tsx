import {
  RELATIONSHIP_DIRECTION_LABEL,
  type RelationshipDirection,
} from "@/lib/social/contracts";

export function FriendRelationshipBadge(
  { direction }: { direction: RelationshipDirection | null | undefined },
) {
  const safeDirection = direction ?? "INVITED";
  return (
    <span
      className={`friend-relationship-badge is-${safeDirection.toLowerCase().replace("_", "-")}`}
      data-testid="friend-relationship-direction"
    >
      {RELATIONSHIP_DIRECTION_LABEL[safeDirection]}
    </span>
  );
}
