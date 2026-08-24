"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  getCashoutAccountEncryptionConfig,
  getCashoutAccountFingerprintKey,
  isCashoutEnabled,
} from "@/lib/supabase/service";
import { normalizeKoreanMobilePhone } from "@/lib/phone";
import {
  PUBLIC_ERRORS,
  normalizeCashoutErrorCode,
  normalizeCashoutRpcErrorCode,
} from "@/lib/cashout-errors";

const BANK_CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;
const REQUEST_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const ACCOUNT_NO_PATTERN = /^[0-9]{8,20}$/;

export type CreateCashoutInput = {
  cloverAmount: number;
  bankCode: string;
  accountNo: string;
  accountHolder: string;
  phone: string;
  requestKey: string;
};

type CashoutRow = {
  cashout_request_id: number;
  status: "REQUESTED";
  clover_amount: number;
  gross_krw: number;
  fee_krw: number;
  withholding_krw: number;
  net_krw: number;
  requested_at: string;
  is_replay: boolean;
};

export type CreateCashoutResult =
  | {
      ok: true;
      data: {
        requestId: number;
        status: "REQUESTED";
        cloverAmount: number;
        grossKrw: number;
        feeKrw: number;
        withholdingKrw: number;
        netKrw: number;
        requestedAt: string;
        isReplay: boolean;
      };
    }
  | { ok: false; code: string };

function fail(code: string): CreateCashoutResult {
  return {
    ok: false,
    code: normalizeCashoutErrorCode(code),
  };
}

function normalizeInput(input: CreateCashoutInput) {
  const bankCode = typeof input.bankCode === "string" ? input.bankCode.trim().toUpperCase() : "";
  const accountNo = typeof input.accountNo === "string"
    ? input.accountNo.replace(/[\s-]/g, "")
    : "";
  const accountHolder = typeof input.accountHolder === "string"
    ? input.accountHolder.normalize("NFKC").trim().replace(/\s+/g, " ")
    : "";
  const phone = normalizeKoreanMobilePhone(input.phone);
  const requestKey = typeof input.requestKey === "string" ? input.requestKey.trim() : "";

  return { bankCode, accountNo, accountHolder, phone, requestKey };
}

export async function createCashoutRequest(
  input: CreateCashoutInput,
): Promise<CreateCashoutResult> {
  if (!isCashoutEnabled()) return fail("cashout_disabled");
  if (!input || typeof input !== "object") return fail("invalid_request_key");

  const callerClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await callerClient.auth.getUser();
  if (!user) return fail("unauthorized");

  const { bankCode, accountNo, accountHolder, phone, requestKey } = normalizeInput(input);
  if (!Number.isSafeInteger(input.cloverAmount) || input.cloverAmount < 1) {
    return fail("cashout_below_minimum");
  }
  if (!BANK_CODE_PATTERN.test(bankCode)) return fail("invalid_bank_code");
  if (!ACCOUNT_NO_PATTERN.test(accountNo)) return fail("invalid_account_number");
  if (accountHolder.length < 2 || accountHolder.length > 40) {
    return fail("invalid_account_holder");
  }
  if (!phone) return fail("invalid_phone");
  if (!REQUEST_KEY_PATTERN.test(requestKey)) return fail("invalid_request_key");

  try {
    const { data: updatedMember, error: phoneUpdateError } = await callerClient
      .from("member")
      .update({ phone })
      .eq("id", user.id)
      .select("id, phone")
      .maybeSingle();
    if (phoneUpdateError || !updatedMember) {
      console.error("[cashout-action] phone update failed", {
        dbCode: phoneUpdateError?.code ?? "member_not_found",
      });
      return fail("phone_save_failed");
    }

    const serviceClient = createServiceRoleClient();
    const encryption = getCashoutAccountEncryptionConfig();
    const { data, error } = await serviceClient.rpc(
      "create_cashout_request" as never,
      {
        p_member_id: user.id,
        p_clover_amount: input.cloverAmount,
        p_bank_code: bankCode,
        p_account_no: accountNo,
        p_account_holder: accountHolder,
        p_request_key: requestKey,
        p_account_key_version: encryption.activeVersion,
        p_account_key: encryption.activeKey,
        p_account_fingerprint_key: getCashoutAccountFingerprintKey(),
      } as never,
    );

    const row = (data as CashoutRow[] | null)?.[0];
    if (error || !row) {
      const code = normalizeCashoutRpcErrorCode(error?.message, error?.code);
      console.error("[cashout-action] RPC failed", {
        dbCode: error?.code ?? "unknown",
        publicCode: code,
        knownPublicCode: Object.prototype.hasOwnProperty.call(PUBLIC_ERRORS, code),
      });
      return fail(code);
    }

    // 환전 신청은 이미 DB에서 확정됐다. 알림 호출은 후속 best-effort라서
    // 어떤 실패도 신청 성공 응답을 바꾸거나 재시도시키면 안 된다.
    if (!row.is_replay) {
      try {
        const { error: notifyError } = await serviceClient.functions.invoke(
          "notify",
          {
            body: {
              memberId: user.id,
              type: "CASHOUT_REQUESTED",
              phone: updatedMember.phone ?? phone,
            },
          },
        );
        if (notifyError) {
          console.error("[cashout-action] requested notification failed", {
            message: notifyError.message,
          });
        }
      } catch (notifyError) {
        console.error("[cashout-action] requested notification failed", {
          message: notifyError instanceof Error ? notifyError.message : "unknown",
        });
      }
    }

    revalidatePath("/me");
    revalidatePath("/cashout");
    revalidatePath("/cashout/status");
    revalidatePath("/cashout/history");

    return {
      ok: true,
      data: {
        requestId: row.cashout_request_id,
        status: row.status,
        cloverAmount: row.clover_amount,
        grossKrw: row.gross_krw,
        feeKrw: row.fee_krw,
        withholdingKrw: row.withholding_krw,
        netKrw: row.net_krw,
        requestedAt: row.requested_at,
        isReplay: row.is_replay,
      },
    };
  } catch {
    return fail("cashout_request_failed");
  }
}
