import { createServiceRoleClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

type CashoutNotification =
  | {
    memberId: string;
    type: "CASHOUT_REQUESTED";
    phone?: string;
    cashoutRequestId: number;
    cloverAmount: number;
    netKrw: number;
    requestedAt: string;
    adminUrl: string;
  }
  | {
    memberId: string;
    type: "CASHOUT_PAID";
    phone?: string;
    bankName: string;
    cashoutRequestId: number;
  };

function getNotifyInternalToken(): string {
  const token = process.env.NOTIFY_INTERNAL_TOKEN?.trim() ?? "";
  if (token.length < 32) {
    throw new Error("notify_internal_token_unavailable");
  }
  return token;
}

async function recordNotificationFailure(
  serviceClient: ServiceClient,
  input: CashoutNotification,
): Promise<void> {
  try {
    const { error } = await serviceClient.from("notification").insert({
      member_id: input.memberId,
      type: input.type,
      channel: "INAPP",
      alimtalk_status: "FAILED",
      read: false,
    });

    if (error) {
      console.error("[cashout-notification] failure record insert failed", {
        cashoutRequestId: input.cashoutRequestId,
        type: input.type,
        dbCode: error.code ?? "unknown",
      });
    }
  } catch (error) {
    console.error("[cashout-notification] failure record insert threw", {
      cashoutRequestId: input.cashoutRequestId,
      type: input.type,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * 환전 상태 전이는 이미 확정된 뒤 호출된다. 외부 알림 실패는 원래 성공을
 * 되돌리지 않지만, 서버 로그와 notification(INAPP/FAILED)에는 반드시 남긴다.
 */
export async function deliverCashoutNotification(
  serviceClient: ServiceClient,
  input: CashoutNotification,
): Promise<void> {
  try {
    const token = getNotifyInternalToken();
    const { error } = await serviceClient.functions.invoke("notify", {
      headers: { "x-notify-internal-token": token },
      body: input,
    });
    if (error) throw error;
  } catch (error) {
    console.error("[cashout-notification] notify delivery failed", {
      cashoutRequestId: input.cashoutRequestId,
      type: input.type,
      message: error instanceof Error ? error.message : "unknown",
    });
    await recordNotificationFailure(serviceClient, input);
  }
}
