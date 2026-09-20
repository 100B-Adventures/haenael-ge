import type { MetadataRoute } from "next";

// 홈 화면에 추가할 수 있게 하는 최소 구성이다. 서비스 워커는 일부러 두지 않는다.
// 잔액·환전 상태를 캐시했다가 낡은 값을 보여주면 돈 화면이 거짓말을 한다.
// 최신 크롬은 매니페스트와 HTTPS 만으로 설치를 허용하고, iOS 는 apple 메타로
// 홈 화면에 올린다. 아이콘은 확정된 프로필 심볼(거버넌스 D-006, 쿼트러포일)이다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "해낼게",
    short_name: "해낼게",
    description: "친구의 목표에 조용히 클로버로 응원하세요.",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    // design-token-lint-allow: 매니페스트는 CSS 변수를 못 읽는다. globals.css 의 --background·--primary 값 그대로다.
    background_color: "#FBFAF7",
    theme_color: "#1B8A4F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
