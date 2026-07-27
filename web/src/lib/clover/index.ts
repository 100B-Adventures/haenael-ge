// clover 환산 — 단일 진실원: 1클로버 = 1,000원.
// 이 상수/함수는 DB(create_cheer_order: cheer.clover_amount = amount_krw/1000),
// EF(cheer-order: cloverAmount = amountKrw/1000), home 원화 등가 표기가 공유하는
// 클로버↔원 환산 규약을 웹 레이어에서 명시·검증 가능하게 한다.
// 근거: min_cashout_clover() 코멘트 "30클로버=30,000원, 1클로버=1,000원 등가".

export const KRW_PER_CLOVER = 1000;

/** 결제 금액(원) → 적립 클로버 개수. 서버(RPC/EF)와 동일 규약(정수 나눗셈). */
export function cloverFromKrw(amountKrw: number): number {
  return Math.floor(amountKrw / KRW_PER_CLOVER);
}

/** 클로버 개수 → 원화 등가(고정 환산 표기치, 실제 환전액 보증 아님). */
export function krwFromClover(cloverCount: number): number {
  return cloverCount * KRW_PER_CLOVER;
}
