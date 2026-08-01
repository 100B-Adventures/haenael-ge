"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  getCashoutAccountEncryptionKey,
  isCashoutEnabled,
} from "@/lib/supabase/service";

const BANK_CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;
const REQUEST_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const ACCOUNT_NO_PATTERN = /^[0-9]{8,20}$/;

export type CreateCashoutInput = {
  cloverAmount: number;
  bankCode: string;
  accountNo: string;
  accountHolder: string;
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
  | { ok: false; code: string; message: string };

const PUBLIC_ERRORS: Record<string, string> = {
  cashout_disabled: "환전 기능을 준비하고 있어요.",
  cashout_below_minimum: "최소 30클로버부터 환전할 수 있어요.",
  cashout_insufficient_balance: "지급 가능한 친구 응원분을 다시 확인해주세요.",
  cashout_already_requested: "이미 처리 중인 환전 신청이 있어요.",
  request_key_conflict: "입력값이 바뀌었어요. 다시 확인한 뒤 신청해주세요.",
  invalid_bank_code: "은행을 다시 선택해주세요.",
  invalid_account_number: "계좌번호를 숫자로 정확히 입력해주세요.",
  invalid_account_holder: "예금주명을 정확히 입력해주세요.",
  invalid_request_key: "신청 정보를 새로고침한 뒤 다시 시도해주세요.",
  cashout_encryption_unavailable: "환전 신청 서버를 점검하고 있어요.",
  unauthorized: "로그인 후 다시 시도해주세요.",
};

function fail(code: string): CreateCashoutResult {
  return {
    ok: false,
    code,
    message: PUBLIC_ERRORS[code] ?? "환전 신청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
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
  const requestKey = typeof input.requestKey === "string" ? input.requestKey.trim() : "";

  return { bankCode, accountNo, accountHolder, requestKey };
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

  const { bankCode, accountNo, accountHolder, requestKey } = normalizeInput(input);
  if (!Number.isSafeInteger(input.cloverAmount) || input.cloverAmount < 1) {
    return fail("cashout_below_minimum");
  }
  if (!BANK_CODE_PATTERN.test(bankCode)) return fail("invalid_bank_code");
  if (!ACCOUNT_NO_PATTERN.test(accountNo)) return fail("invalid_account_number");
  if (accountHolder.length < 2 || accountHolder.length > 40) {
    return fail("invalid_account_holder");
  }
  if (!REQUEST_KEY_PATTERN.test(requestKey)) return fail("invalid_request_key");

  try {
    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient.rpc(
      "create_cashout_request" as never,
      {
        p_member_id: user.id,
        p_clover_amount: input.cloverAmount,
        p_bank_code: bankCode,
        p_account_no: accountNo,
        p_account_holder: accountHolder,
        p_request_key: requestKey,
        p_account_key: getCashoutAccountEncryptionKey(),
      } as never,
    );

    const row = (data as CashoutRow[] | null)?.[0];
    if (error || !row) {
      const code = error?.message ?? "cashout_request_failed";
      console.error("[cashout-action] RPC failed", {
        dbCode: error?.code ?? "unknown",
        publicCode: PUBLIC_ERRORS[code] ? code : "cashout_request_failed",
      });
      return fail(code);
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
    return fail("cashout_encryption_unavailable");
  }
}
