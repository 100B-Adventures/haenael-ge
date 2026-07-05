// alimtalk.ts — 카카오 알림톡 API 어댑터 (정보성·템플릿)
// 슬라이스 #1 scaffold: 타입 + 인터페이스 stub. 실구현은 슬라이스 #10 (notify EF).
// ⚠️ 정보성만(마케팅 금지) — architecture §1 표 참조.

export interface AlimtalkMessage {
  /** 카카오 비즈채널 발신 프로필 키 */
  senderKey: string;
  /** 사전심사 통과 템플릿 코드 */
  templateCode: string;
  /** 수신자 전화번호 (E.164) */
  to: string;
  variables: Record<string, string>;
}

export interface AlimtalkResult {
  messageId: string;
  status: "SENT" | "FAILED";
  failedAt?: string;
}

/** ⚠️ 슬라이스 #10 notify EF 에서 실구현. 카카오 비즈채널 심사 완료 필요. */
export async function sendAlimtalk(
  _msg: AlimtalkMessage,
): Promise<AlimtalkResult> {
  throw new Error("Not implemented — 슬라이스 #10 에서 구현 (카카오 비즈채널 심사 완료 후)");
}
