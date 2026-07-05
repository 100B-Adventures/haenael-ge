// region.ts — x-region ap-northeast-2 핀 유틸
// 슬라이스 #1 scaffold: stub only. 실구현은 슬라이스 #3+

/**
 * Edge Function 응답에 ap-northeast-2 리전 헤더를 추가한다.
 * architecture §2.6: KYC·금융 데이터 국외이전 방지 목적으로
 * 서울 리전에 핀된 Edge Function에서만 호출.
 */
export function withRegionHeader(headers: Headers = new Headers()): Headers {
  headers.set("x-region", "ap-northeast-2");
  return headers;
}
