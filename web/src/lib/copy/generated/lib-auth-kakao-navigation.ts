// Centralized user-facing copy for Kakao in-app browser handoff.
// Keep wording exact unless the approved UX-writing contract changes.
export const KAKAO_NAVIGATION_COPY = {
  EXTERNAL_BROWSER_NOTICE: "외부 브라우저에서 이어서 로그인할게요.",
  EXTERNAL_BROWSER_ACTION: "외부 브라우저에서 계속하기",
  DRAFT_WARNING: "작성 중인 내용은 카카오톡 화면에만 남아 외부 브라우저로 옮겨지지 않아요. 로그인 뒤 목표를 다시 입력해야 할 수 있어요.",
  IOS_INSTRUCTION: "열리지 않으면 오른쪽 아래 ···를 누르고 Safari로 열기를 선택해 주세요.",
  ANDROID_INSTRUCTION: "열리지 않으면 오른쪽 위 ⋮를 누르고 다른 브라우저로 열기를 선택해 주세요.",
  FALLBACK_ACTION: "이 화면에서 계속하기",
  SESSION_CHECKING: "로그인 상태를 확인하고 있어요.",
  SESSION_MISSING: "이 화면에는 로그인이 적용되지 않았어요. 외부 브라우저에서 다시 로그인해 주세요.",
} as const;

export const PRODUCT_COPY_SOURCE = "web/src/lib/auth/kakao-navigation.ts";
