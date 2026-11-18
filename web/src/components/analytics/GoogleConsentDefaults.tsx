import Script from "next/script";

export const GOOGLE_CONSENT_DEFAULTS_SCRIPT = `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:500});`;

/**
 * D-054. 외부 분석 스크립트를 싣기 전에 Consent Mode v2 기본값을 거부로 고정한다.
 * 이 컴포넌트 자체는 네트워크 요청을 만들지 않는다. Clarity와 Meta는 별도 컴포넌트가
 * 명시 동의 뒤에만 로드한다.
 */
export function GoogleConsentDefaults() {
  return (
    <Script
      id="google-consent-defaults"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: GOOGLE_CONSENT_DEFAULTS_SCRIPT }}
    />
  );
}
