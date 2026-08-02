// alimtalk.ts — 카카오 알림톡 API 어댑터 (정보성·템플릿)
// ⚠️ 정보성만(마케팅/광고성 금지) — architecture §1 표 참조.
// 실발송 = 카카오 비즈채널 개설 + 템플릿 사전심사 + 중계업체 계약 필요 (⛔ 회수)
// ENV:
//   KAKAO_ALIMTALK_API_URL      — 중계업체 REST API URL (예: https://api.solapi.com/messages/v4/send)
//   KAKAO_ALIMTALK_API_KEY      — 중계업체 API 키
//   KAKAO_ALIMTALK_API_SECRET   — 중계업체 API 시크릿 (HMAC-SHA256 서명)
//   KAKAO_ALIMTALK_SENDER_KEY   — 카카오 비즈채널 발신프로필 키
//   KAKAO_ALIMTALK_PFID         — 발신프로필 ID (중계업체별 상이)

export interface AlimtalkMessage {
  /** 수신자 전화번호 E.164 (예: "01012345678" or "+821012345678") */
  to: string;
  /** 사전심사 통과 템플릿 코드 */
  templateCode: string;
  /** 템플릿 변수 치환 맵 */
  variables: Record<string, string>;
}

export interface AlimtalkResult {
  messageId: string;
  status: "SENT" | "FAILED";
  error?: string;
}

/**
 * 카카오 알림톡 발송.
 * ENV 미설정 시 → placeholder 모드(FAILED 반환, INAPP 폴백 유도).
 *
 * 중계업체 API는 Solapi-compatible 스펙(multipart/JSON)을 가정.
 * 실제 중계업체 계약 후 KAKAO_ALIMTALK_API_URL을 교체하면 동작.
 */
export async function sendAlimtalk(
  msg: AlimtalkMessage,
): Promise<AlimtalkResult> {
  const apiUrl = Deno.env.get("KAKAO_ALIMTALK_API_URL");
  const apiKey = Deno.env.get("KAKAO_ALIMTALK_API_KEY");
  const apiSecret = Deno.env.get("KAKAO_ALIMTALK_API_SECRET");
  const senderKey = Deno.env.get("KAKAO_ALIMTALK_SENDER_KEY");
  const pfId = Deno.env.get("KAKAO_ALIMTALK_PFID") ?? "";

  // ENV 미설정 = placeholder 모드 → caller가 INAPP 폴백
  if (!apiUrl || !apiKey || !apiSecret || !senderKey) {
    console.warn(
      "[alimtalk] ENV 미설정 — placeholder 모드. 카카오 비즈채널 셋업 후 실발송 가능.",
    );
    return {
      messageId: `placeholder-${Date.now()}`,
      status: "FAILED",
      error: "KAKAO_ALIMTALK env not configured",
    };
  }

  // 서명 생성: HMAC-SHA256(apiKey + ":" + timestamp, apiSecret)
  const timestamp = Date.now().toString();
  const sigData = new TextEncoder().encode(`${apiKey}:${timestamp}`);
  const keyData = new TextEncoder().encode(apiSecret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, sigData);
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // 요청 바디 (Solapi-compatible)
  const body = {
    message: {
      to: msg.to,
      from: pfId,
      kakaoOptions: {
        senderKey,
        templateCode: msg.templateCode,
        variables: msg.variables,
        disableSms: false, // SMS 대체발송 비활성(정보성 알림톡만)
      },
    },
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${Date.now()}, signature=${signature}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.error(`[alimtalk] API error ${res.status}: ${errText}`);
      return {
        messageId: `err-${Date.now()}`,
        status: "FAILED",
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json().catch(() => null);
    const messageId = (data as { messageId?: string })?.messageId ??
      `ok-${Date.now()}`;

    return { messageId, status: "SENT" };
  } catch (err) {
    console.error("[alimtalk] fetch 실패:", err);
    return {
      messageId: `catch-${Date.now()}`,
      status: "FAILED",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── 템플릿 헬퍼 ────────────────────────────────────────────────────────────

export const TEMPLATE_CODES = {
  /** 응원 도착 (정보성) — 사전심사 통과 필요 */
  CHEER_RECEIVED: "CHEER_RECEIVED_V1",
} as const;

/** 응원 도착 알림톡 메시지 빌더 */
export function buildCheerReceivedMessage(
  to: string,
  opts: { displayName: string; goalTitle: string },
): AlimtalkMessage {
  return {
    to,
    templateCode: TEMPLATE_CODES.CHEER_RECEIVED,
    variables: {
      "#{응원자}": opts.displayName,
      "#{목표}": opts.goalTitle.slice(0, 30), // 템플릿 변수 최대 30자
    },
  };
}
