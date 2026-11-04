import Image from "next/image";
import type { MySocialGoal } from "@/lib/social/contracts";
import { ClampText } from "@/components/common/ClampText";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-cheersummarybar";

export function CheerSummaryBar({ goal }: { goal: Pick<MySocialGoal, "cheer_count" | "supporter_avatars" | "recent_cheer"> }) {
  const extraCount = Math.max(goal.cheer_count - goal.supporter_avatars.length, 0);
  return (
    <div className="cheer-summary-bar" data-testid="cheer-summary-bar">
      <div className="cheer-summary-avatars" aria-label={`응원한 사람 ${goal.cheer_count}명`}>
        {goal.supporter_avatars.map((supporter, index) => (
          <span key={index} title={supporter.is_anonymous ? PRODUCT_COPY.TEXT_001 : undefined}>
            {!supporter.is_anonymous && supporter.profile_image
              ? <Image src={supporter.profile_image} alt="" fill sizes="28px" unoptimized />
              : <span aria-hidden="true">{supporter.is_anonymous ? "?" : PRODUCT_COPY.TEXT_002}</span>}
          </span>
        ))}
        {extraCount > 0 && <strong>+{extraCount}</strong>}
      </div>
      <p className="cheer-summary-count">{goal.cheer_count}{PRODUCT_COPY.TEXT_003}</p>
      {goal.recent_cheer && (
        <ClampText className="cheer-summary-recent">
          {`${goal.recent_cheer.is_anonymous ? PRODUCT_COPY.TEXT_004 : goal.recent_cheer.supporter_name ?? PRODUCT_COPY.TEXT_005}: ${goal.recent_cheer.message ?? PRODUCT_COPY.TEXT_006}`}
        </ClampText>
      )}
    </div>
  );
}
