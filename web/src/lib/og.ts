// 링크 미리보기(카카오톡·메신저·SNS) 기본 이미지. 1200×630, public/og/haenael-og.png.
// 페이지가 openGraph 를 덮어쓰면 부모 이미지가 따라오지 않으므로 각 페이지에서 이 상수를 함께 넣는다.
export const DEFAULT_OG_IMAGE = {
  url: "/og/haenael-og.png",
  width: 1200,
  height: 630,
  alt: "해낼게. 응원은 돈으로 하는 겁니다.",
} as const;
