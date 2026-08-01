export const CASHOUT_BANKS = [
  ["KB", "KB국민은행"],
  ["SHINHAN", "신한은행"],
  ["WOORI", "우리은행"],
  ["HANA", "하나은행"],
  ["NH", "NH농협은행"],
  ["IBK", "IBK기업은행"],
  ["KAKAO", "카카오뱅크"],
  ["TOSS", "토스뱅크"],
  ["KBANK", "케이뱅크"],
  ["SC", "SC제일은행"],
  ["BUSAN", "부산은행"],
  ["DAEGU", "iM뱅크(대구은행)"],
  ["GWANGJU", "광주은행"],
  ["JEONBUK", "전북은행"],
  ["JEJU", "제주은행"],
] as const;

export type CashoutStatus = "REQUESTED" | "PAID" | "REJECTED";

export type CashoutRecord = {
  id: number;
  status: CashoutStatus;
  clover_amount: number;
  net_krw: number;
  bank_code: string | null;
  account_masked: string | null;
  account_holder: string | null;
  requested_at: string;
  paid_at: string | null;
  rejected_at: string | null;
  processing_note: string | null;
};

export const CASHOUT_STATUS_LABELS: Record<CashoutStatus, string> = {
  REQUESTED: "지급 대기",
  PAID: "지급 완료",
  REJECTED: "반려",
};

export function cashoutBankName(code: string | null) {
  return CASHOUT_BANKS.find(([bankCode]) => bankCode === code)?.[1] ?? code ?? "은행";
}

export function formatCashoutKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function maskAccountNumber(accountNo: string) {
  return `${"*".repeat(Math.max(accountNo.length - 4, 0))}${accountNo.slice(-4)}`;
}
