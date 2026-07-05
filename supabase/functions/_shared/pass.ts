// pass.ts — PASS 통합본인인증 어댑터 (실명·나이·CI)
// 슬라이스 #1 scaffold: 타입 stub. 실구현은 슬라이스 #8 (cashout kyc-verify).
// ⚠️ legal 게이트 필요 — KYC·금융데이터 국외이전 이슈 (architecture §2.6).

export interface PassVerifyRequest {
  /** PASS 본인인증 완료 후 전달받은 token */
  token: string;
}

export interface PassVerifyResult {
  /** 실명 */
  name: string;
  /** 생년월일 (YYYYMMDD) */
  birthDate: string;
  /** 만 19세 이상 여부 */
  isAdult: boolean;
  /** 연계정보 CI (고유 식별값) */
  ci: string;
  /** 통신사 */
  carrier: string;
}

/** ⚠️ 슬라이스 #8 kyc-verify EF 에서 실구현 — PASS 벤더 계약·단가 확인 필요 */
export async function verifyPassKyc(
  _req: PassVerifyRequest,
): Promise<PassVerifyResult> {
  throw new Error("Not implemented — 슬라이스 #8 에서 구현 (PASS 벤더 계약 후)");
}
