import {
  type AlimtalkMessage,
  buildCashoutPaidMessage,
  buildCashoutRequestedMessage,
  buildCheerReceivedMessage,
} from "./alimtalk.ts";
import type { SlackAlert } from "./slack.ts";

export const NOTIFY_TYPES = [
  "CHEER_RECEIVED",
  "CASHOUT_REQUESTED",
  "CASHOUT_PAID",
] as const;

export type NotifyType = typeof NOTIFY_TYPES[number];

export interface NotifyInput {
  memberId: string;
  type: NotifyType;
  phone?: string;
  displayName?: string;
  goalTitle?: string;
  bankName?: string;
  cashoutRequestId?: number;
  cloverAmount?: number;
  netKrw?: number;
  requestedAt?: string;
  adminUrl?: string;
}

function isSafePositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isValidAdminUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
    return url.pathname === "/admin" && !url.search && !url.hash &&
      (url.protocol === "https:" || localHttp);
  } catch {
    return false;
  }
}

export function validateNotifyInput(
  body: unknown,
): { data: NotifyInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "body must be JSON object" };
  }
  const input = body as Record<string, unknown>;

  if (typeof input.memberId !== "string" || !input.memberId.trim()) {
    return { error: "memberId required (string)" };
  }
  if (
    typeof input.type !== "string" ||
    !NOTIFY_TYPES.includes(input.type as NotifyType)
  ) {
    return { error: `type must be one of: ${NOTIFY_TYPES.join(", ")}` };
  }

  const type = input.type as NotifyType;
  if (type === "CHEER_RECEIVED") {
    if (typeof input.displayName !== "string" || !input.displayName.trim()) {
      return {
        error: "displayName required (string) for CHEER_RECEIVED",
      };
    }
    if (typeof input.goalTitle !== "string" || !input.goalTitle.trim()) {
      return { error: "goalTitle required (string) for CHEER_RECEIVED" };
    }
  }
  if (
    type === "CASHOUT_PAID" &&
    (typeof input.bankName !== "string" || !input.bankName.trim())
  ) {
    return { error: "bankName required (string) for CASHOUT_PAID" };
  }
  if (type === "CASHOUT_REQUESTED") {
    if (!isSafePositiveInteger(input.cashoutRequestId)) {
      return {
        error:
          "cashoutRequestId required (positive integer) for CASHOUT_REQUESTED",
      };
    }
    if (!isSafePositiveInteger(input.cloverAmount)) {
      return {
        error: "cloverAmount required (positive integer) for CASHOUT_REQUESTED",
      };
    }
    if (
      !Number.isSafeInteger(input.netKrw) || Number(input.netKrw) < 0
    ) {
      return {
        error: "netKrw required (non-negative integer) for CASHOUT_REQUESTED",
      };
    }
    if (
      typeof input.requestedAt !== "string" ||
      !input.requestedAt.trim() ||
      Number.isNaN(Date.parse(input.requestedAt))
    ) {
      return {
        error: "requestedAt required (ISO datetime) for CASHOUT_REQUESTED",
      };
    }
    if (!isValidAdminUrl(input.adminUrl)) {
      return {
        error: "adminUrl required (/admin URL) for CASHOUT_REQUESTED",
      };
    }
  }

  return {
    data: {
      memberId: input.memberId.trim(),
      type,
      phone: typeof input.phone === "string" && input.phone.trim()
        ? input.phone.trim()
        : undefined,
      displayName: typeof input.displayName === "string"
        ? input.displayName.trim()
        : undefined,
      goalTitle: typeof input.goalTitle === "string"
        ? input.goalTitle.trim()
        : undefined,
      bankName: typeof input.bankName === "string"
        ? input.bankName.trim()
        : undefined,
      cashoutRequestId: typeof input.cashoutRequestId === "number"
        ? input.cashoutRequestId
        : undefined,
      cloverAmount: typeof input.cloverAmount === "number"
        ? input.cloverAmount
        : undefined,
      netKrw: typeof input.netKrw === "number" ? input.netKrw : undefined,
      requestedAt: typeof input.requestedAt === "string"
        ? input.requestedAt.trim()
        : undefined,
      adminUrl: typeof input.adminUrl === "string"
        ? input.adminUrl.trim()
        : undefined,
    },
  };
}

export function buildCashoutRequestedSlackAlert(
  input: NotifyInput,
): SlackAlert {
  return {
    event: "cashout_requested",
    severity: "info",
    summary: "새 환전 신청이 접수되었습니다.",
    fields: {
      "신청 ID": input.cashoutRequestId!,
      "클로버 수": `${input.cloverAmount!.toLocaleString("ko-KR")}개`,
      "입금 예정액": `${input.netKrw!.toLocaleString("ko-KR")}원`,
      "신청 시각": input.requestedAt!,
      "관리자 화면": input.adminUrl!,
    },
  };
}

export function buildNotifyMessage(
  input: NotifyInput,
  phone: string,
): AlimtalkMessage {
  switch (input.type) {
    case "CHEER_RECEIVED":
      return buildCheerReceivedMessage(phone, {
        displayName: input.displayName!,
        goalTitle: input.goalTitle!,
      });
    case "CASHOUT_REQUESTED":
      return buildCashoutRequestedMessage(phone);
    case "CASHOUT_PAID":
      return buildCashoutPaidMessage(phone, { bankName: input.bankName! });
  }
}
