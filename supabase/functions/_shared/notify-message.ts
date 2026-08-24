import {
  type AlimtalkMessage,
  buildCashoutPaidMessage,
  buildCashoutRequestedMessage,
  buildCheerReceivedMessage,
} from "./alimtalk.ts";

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
