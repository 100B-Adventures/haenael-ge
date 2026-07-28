"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  getCashoutAccountEncryptionKey,
} from "@/lib/supabase/service";

type ActionResult =
  | { ok: true; accountNo?: string }
  | { ok: false; message: string };

async function requireAdmin() {
  const callerClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await callerClient.auth.getUser();
  if (!user) throw new Error("admin_unauthorized");

  const { data: isAdmin, error } = await callerClient.rpc("is_admin" as never);
  if (error || !isAdmin) throw new Error("admin_forbidden");

  return {
    actorId: user.id,
    serviceClient: createServiceRoleClient(),
  };
}

export async function revealCashoutAccount(
  requestId: number,
): Promise<ActionResult> {
  try {
    const { actorId, serviceClient } = await requireAdmin();
    const { data, error } = await serviceClient.rpc(
      "admin_reveal_cashout_account" as never,
      {
        p_request_id: requestId,
        p_actor_id: actorId,
        p_account_key: getCashoutAccountEncryptionKey(),
      } as never,
    );
    if (error || typeof data !== "string") {
      return { ok: false, message: "계좌번호를 불러오지 못했습니다." };
    }
    return { ok: true, accountNo: data };
  } catch {
    return { ok: false, message: "관리자 인증 또는 암호화 설정을 확인해주세요." };
  }
}

export async function markCashoutPaid(
  requestId: number,
  processingNote: string,
): Promise<ActionResult> {
  try {
    const { actorId, serviceClient } = await requireAdmin();
    const { error } = await serviceClient.rpc(
      "admin_mark_cashout_paid" as never,
      {
        p_request_id: requestId,
        p_actor_id: actorId,
        p_processing_note: processingNote || null,
      } as never,
    );
    if (error) {
      return {
        ok: false,
        message:
          error.message === "cashout_already_paid"
            ? "이미 지급 완료된 요청입니다."
            : "지급 완료 처리에 실패했습니다.",
      };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, message: "관리자 인증 또는 서버 설정을 확인해주세요." };
  }
}

export async function rejectCashout(
  requestId: number,
  processingNote: string,
): Promise<ActionResult> {
  if (processingNote.trim().length < 2) {
    return { ok: false, message: "반려 사유를 2자 이상 입력해주세요." };
  }

  try {
    const { actorId, serviceClient } = await requireAdmin();
    const { error } = await serviceClient.rpc(
      "admin_reject_cashout" as never,
      {
        p_request_id: requestId,
        p_actor_id: actorId,
        p_processing_note: processingNote.trim(),
      } as never,
    );
    if (error) {
      return { ok: false, message: "반려 처리에 실패했습니다." };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, message: "관리자 인증 또는 서버 설정을 확인해주세요." };
  }
}
