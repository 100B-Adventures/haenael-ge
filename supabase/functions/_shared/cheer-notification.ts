// 결제 확정 후 응원 도착 알림 배선.
// confirm_cheer_payment RPC가 이미 만든 INAPP 알림을 안전망으로 유지하고,
// 수신 전화번호가 있을 때만 notify EF의 ALIMTALK 경로를 추가 호출한다.

export interface CheerReceivedNotificationInput {
  memberId: string;
  displayName: string;
  goalTitle: string;
}

export interface CheerNotificationDeps {
  getMemberPhone: (
    memberId: string,
  ) => Promise<{ phone: string | null; error?: string }>;
  invokeNotify: (input: {
    memberId: string;
    type: "CHEER_RECEIVED";
    phone: string;
    displayName: string;
    goalTitle: string;
  }) => Promise<{ data?: unknown; error?: string }>;
}

export interface CheerNotificationResult {
  channel: "ALIMTALK" | "INAPP";
  reason?: "phone_missing" | "phone_lookup_failed" | "notify_failed";
}

/**
 * 이 함수는 결제 응답을 깨뜨리지 않는다. 모든 외부/DB 오류를 기존 INAPP
 * 알림으로 강등하고 절대 throw하지 않는다.
 */
export async function dispatchCheerReceivedNotification(
  deps: CheerNotificationDeps,
  input: CheerReceivedNotificationInput,
): Promise<CheerNotificationResult> {
  let phoneResult: { phone: string | null; error?: string };
  try {
    phoneResult = await deps.getMemberPhone(input.memberId);
  } catch (error) {
    console.warn(
      "[cheer-notification] member.phone 조회 예외 → INAPP 유지",
      error,
    );
    return { channel: "INAPP", reason: "phone_lookup_failed" };
  }

  if (phoneResult.error) {
    console.warn(
      `[cheer-notification] member.phone 조회 실패 → INAPP 유지. error=${phoneResult.error}`,
    );
    return { channel: "INAPP", reason: "phone_lookup_failed" };
  }

  const phone = phoneResult.phone?.trim();
  if (!phone) {
    return { channel: "INAPP", reason: "phone_missing" };
  }

  try {
    const invoked = await deps.invokeNotify({
      memberId: input.memberId,
      type: "CHEER_RECEIVED",
      phone,
      displayName: input.displayName,
      goalTitle: input.goalTitle,
    });

    if (invoked.error) {
      console.warn(
        `[cheer-notification] notify 호출 실패 → INAPP 유지. error=${invoked.error}`,
      );
      return { channel: "INAPP", reason: "notify_failed" };
    }

    const channel = (invoked.data as { channel?: unknown } | null)?.channel;
    return channel === "ALIMTALK"
      ? { channel: "ALIMTALK" }
      : { channel: "INAPP", reason: "notify_failed" };
  } catch (error) {
    console.warn("[cheer-notification] notify 호출 예외 → INAPP 유지", error);
    return { channel: "INAPP", reason: "notify_failed" };
  }
}
