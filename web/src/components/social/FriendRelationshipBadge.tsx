import {
  RELATIONSHIP_DIRECTION_LABEL,
  type RelationshipDirection,
} from "@/lib/social/contracts";

export function FriendRelationshipBadge(
  { direction }: { direction: RelationshipDirection | null | undefined },
) {
  const safeDirection = direction ?? "INVITED";
  const label = safeDirection === "INVITED"
    ? "친구로 연결"
    : RELATIONSHIP_DIRECTION_LABEL[safeDirection];
  return (
    <span
      className={`friend-relationship-badge is-${safeDirection.toLowerCase().replace("_", "-")}`}
      data-testid="friend-relationship-direction"
    >
      {label}
    </span>
  );
}
