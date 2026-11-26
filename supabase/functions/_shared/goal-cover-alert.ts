import type { SlackAlert } from "./slack.ts";

type AlertSender = (alert: SlackAlert) => Promise<boolean>;

export async function notifyGoalCoverPublished(
  send: AlertSender,
  input: { assetId: string; goalId: number; visibility: string },
) {
  return send({
    event: "goal_cover_published",
    severity: "info",
    summary: "목표 사진이 자동 파일 검사를 통과해 공개 상태로 반영됐습니다.",
    fields: {
      asset_id: input.assetId,
      goal_id: input.goalId,
      visibility: input.visibility,
    },
  });
}
