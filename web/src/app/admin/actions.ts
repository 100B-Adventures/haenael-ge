"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  getCashoutAccountEncryptionConfig,
} from "@/lib/supabase/service";
import { cashoutBankName } from "@/lib/cashout";

type ActionResult =
  | { ok: true; accountNo?: string }
  | { ok: false; code: string; message: string };

const ADMIN_ERRORS = {
  admin_unauthorized: "관리자 로그인이 필요합니다.",
  admin_forbidden: "관리자 권한이 없습니다.",
  cashout_account_unavailable: "이 요청의 계좌번호는 열람할 수 없습니다.",
  cashout_key_version_unavailable: "해당 계좌의 암호화 키 버전을 찾을 수 없습니다.",
  cashout_account_reveal_required: "전체 계좌를 다시 확인한 뒤 지급 완료 처리해주세요.",
  cashout_already_paid: "이미 지급 완료된 요청입니다.",
  invalid_cashout_status: "이미 처리되었거나 처리할 수 없는 환전 요청입니다.",
  processing_note_required: "반려 사유를 입력해주세요.",
  processing_note_too_long: "처리 메모는 500자 이하로 입력해주세요.",
} as const;

type AdminErrorCode = keyof typeof ADMIN_ERRORS;

function fail(code: AdminErrorCode | "cashout_admin_failed"): ActionResult {
  return {
    ok: false,
    code,
    message: code === "cashout_admin_failed"
      ? "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."
      : ADMIN_ERRORS[code],
  };
}

function safeErrorCode(rawMessage: string | null | undefined): AdminErrorCode | "cashout_admin_failed" {
  return rawMessage && Object.prototype.hasOwnProperty.call(ADMIN_ERRORS, rawMessage)
    ? rawMessage as AdminErrorCode
    : "cashout_admin_failed";
}

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
    callerClient,
  };
}

export async function revealCashoutAccount(
  requestId: number,
): Promise<ActionResult> {
  try {
    const { actorId } = await requireAdmin();
    const serviceClient = createServiceRoleClient();
    const encryption = getCashoutAccountEncryptionConfig();
    const { data, error } = await serviceClient.rpc(
      "admin_reveal_cashout_account" as never,
      {
        p_request_id: requestId,
        p_actor_id: actorId,
        p_account_keys: encryption.keys,
      } as never,
    );
    if (error || typeof data !== "string") {
      return fail(safeErrorCode(error?.message));
    }
    return { ok: true, accountNo: data };
  } catch (error) {
    return fail(safeErrorCode(error instanceof Error ? error.message : null));
  }
}

export async function markCashoutPaid(
  requestId: number,
  processingNote: string,
): Promise<ActionResult> {
  try {
    const { callerClient } = await requireAdmin();
    const { error } = await callerClient.rpc(
      "admin_mark_cashout_paid" as never,
      {
        p_request_id: requestId,
        p_processing_note: processingNote || null,
      } as never,
    );
    if (error) {
      return fail(safeErrorCode(error.message));
    }

    // 지급 완료는 위 RPC 성공 시점에 이미 확정됐다. 이후 조회·알림은
    // best-effort로 격리해 실패해도 지급 완료 결과를 절대 되돌리지 않는다.
    try {
      const serviceClient = createServiceRoleClient();
      const { data: cashout, error: cashoutError } = await serviceClient
        .from("cashout_request")
        .select("member_id, bank_code")
        .eq("id", requestId)
        .maybeSingle();
      if (cashoutError || !cashout) {
        throw new Error(cashoutError?.message ?? "cashout_not_found");
      }

      const { data: recipient, error: recipientError } = await serviceClient
        .from("member")
        .select("phone")
        .eq("id", cashout.member_id)
        .maybeSingle();
      if (recipientError || !recipient) {
        throw new Error(recipientError?.message ?? "recipient_not_found");
      }

      const { error: notifyError } = await serviceClient.functions.invoke(
        "notify",
        {
          body: {
            memberId: cashout.member_id,
            type: "CASHOUT_PAID",
            phone: recipient.phone ?? undefined,
            bankName: cashoutBankName(cashout.bank_code),
          },
        },
      );
      if (notifyError) {
        console.error("[admin-action] paid notification failed", {
          message: notifyError.message,
        });
      }
    } catch (notifyError) {
      console.error("[admin-action] paid notification failed", {
        message: notifyError instanceof Error ? notifyError.message : "unknown",
      });
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return fail(safeErrorCode(error instanceof Error ? error.message : null));
  }
}

export async function rejectCashout(
  requestId: number,
  processingNote: string,
): Promise<ActionResult> {
  if (processingNote.trim().length < 2) {
    return fail("processing_note_required");
  }

  try {
    const { callerClient } = await requireAdmin();
    const { error } = await callerClient.rpc(
      "admin_reject_cashout" as never,
      {
        p_request_id: requestId,
        p_processing_note: processingNote.trim(),
      } as never,
    );
    if (error) {
      return fail(safeErrorCode(error.message));
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return fail(safeErrorCode(error instanceof Error ? error.message : null));
  }
}
