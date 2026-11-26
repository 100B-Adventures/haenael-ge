import type { createServiceRoleClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

export const WELCOME_CHEER_NOTIFICATION = {
  type: "CHEER_RECEIVED",
  displayName: "해낼게",
} as const;

interface WelcomeCheerNotificationInput {
  memberId: string;
  goalId: number;
  goalTitle: string;
  phone?: string;
}

async function recordWelcomeNotificationFailure(
  serviceClient: ServiceClient,
  input: WelcomeCheerNotificationInput,
): Promise<void> {
  try {
    const { error } = await serviceClient.from("notification").insert({
      member_id: input.memberId,
      type: WELCOME_CHEER_NOTIFICATION.type,
      channel: "INAPP",
      alimtalk_status: "FAILED",
      read: false,
    });
    if (error) {
      console.error("[welcome-cheer-notification] failure record insert failed", {
        goalId: input.goalId,
        dbCode: error.code ?? "unknown",
      });
    }
  } catch (error) {
    console.error("[welcome-cheer-notification] failure record insert threw", {
      goalId: input.goalId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * 목표와 웰컴 응원은 이미 커밋되고 DB claim까지 끝난 뒤 호출된다.
 * notify 실패는 서버 로그와 INAPP/FAILED 기록만 남기고 호출자에게 전파하지 않는다.
 */
export async function deliverWelcomeCheerNotification(
  serviceClient: ServiceClient,
  input: WelcomeCheerNotificationInput,
): Promise<"delivered" | "failed"> {
  try {
    const token = process.env.NOTIFY_INTERNAL_TOKEN?.trim() ?? "";
    if (token.length < 32) throw new Error("notify_internal_token_unavailable");

    const { error } = await serviceClient.functions.invoke("notify", {
      headers: { "x-notify-internal-token": token },
      body: {
        memberId: input.memberId,
        type: WELCOME_CHEER_NOTIFICATION.type,
        phone: input.phone,
        displayName: WELCOME_CHEER_NOTIFICATION.displayName,
        goalTitle: input.goalTitle,
      },
    });
    if (error) throw error;
    return "delivered";
  } catch (error) {
    console.error("[welcome-cheer-notification] notify delivery failed", {
      goalId: input.goalId,
      message: error instanceof Error ? error.message : "unknown",
    });
    await recordWelcomeNotificationFailure(serviceClient, input);
    return "failed";
  }
}
