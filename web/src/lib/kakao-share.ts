// 카카오톡 공유(Kakao JavaScript SDK). NEXT_PUBLIC_KAKAO_JS_KEY 가 있을 때만 켜진다.
// 키가 없거나 SDK 를 못 불러오면 null 을 돌려주고, 호출한 쪽이 휴대폰 공유창 → 링크 복사 순으로 대신한다.
// SDK 주소는 next.config.ts CSP script-src 에 허용돼 있어야 한다.
const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: { sendDefault: (options: Record<string, unknown>) => void };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let loading: Promise<KakaoSdk | null> | null = null;

export function loadKakao(): Promise<KakaoSdk | null> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key || typeof window === "undefined") return Promise.resolve(null);
  if (window.Kakao?.isInitialized()) return Promise.resolve(window.Kakao);
  loading ??= new Promise<KakaoSdk | null>((resolve) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key);
        resolve(window.Kakao ?? null);
      } catch {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loading;
}

export async function shareToKakao(
  { url, title, description, imageUrl, buttonTitle }: {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    buttonTitle: string;
  },
): Promise<boolean> {
  const kakao = await loadKakao();
  if (!kakao) return false;
  try {
    kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: buttonTitle, link: { mobileWebUrl: url, webUrl: url } }],
    });
    return true;
  } catch {
    return false;
  }
}
