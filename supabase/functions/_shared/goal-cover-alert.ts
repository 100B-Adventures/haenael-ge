import type { SlackAlert } from "./slack.ts";

type AlertSender = (alert: SlackAlert) => Promise<boolean>;
const DEFAULT_ADMIN_ORIGIN = "https://haenael-ge.vercel.app";

export async function notifyGoalCoverPublished(
  send: AlertSender,
  input: { assetId: string; goalId: number; visibility: string; adminUrl: string },
) {
  return send({
    event: "goal_cover_published",
    severity: "info",
    summary: "목표 사진이 자동 파일 검사를 통과해 공개 상태로 반영됐습니다.",
    fields: {
      asset_id: input.assetId,
      goal_id: input.goalId,
      visibility: input.visibility,
      admin_url: input.adminUrl,
    },
  });
}

export function goalCoverAdminUrl(siteUrl?: string) {
  try {
    const url = new URL(siteUrl || DEFAULT_ADMIN_ORIGIN);
    url.pathname = "/admin";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return `${DEFAULT_ADMIN_ORIGIN}/admin`;
  }
}
