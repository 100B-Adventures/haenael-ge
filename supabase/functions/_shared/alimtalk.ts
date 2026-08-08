// alimtalk.ts — 카카오 알림톡 API 어댑터 (정보성·템플릿)
// ⚠️ 정보성만(마케팅/광고성 금지) — architecture §1 표 참조.
// 실발송 = 카카오 비즈채널 개설 + 템플릿 사전심사 + Solapi 계약 필요 (⛔ 회수)
// ENV:
//   KAKAO_ALIMTALK_API_URL      — Solapi REST API URL (예: https://api.solapi.com/messages/v4/send)
//   KAKAO_ALIMTALK_API_KEY      — Solapi API 키
//   KAKAO_ALIMTALK_API_SECRET   — Solapi API 시크릿 (HMAC-SHA256 서명)
//   KAKAO_ALIMTALK_PFID         — Solapi 채널 연동 ID
//   KAKAO_ALIMTALK_FROM         — Solapi에 사전 등록한 발신번호
//   KAKAO_ALIMTALK_TEMPLATE_CHEER_RECEIVED — 검수 승인된 응원 도착 templateId

export interface AlimtalkMessage {
  /** 수신자 전화번호 E.164 (예: "01012345678" or "+821012345678") */
  to: string;
  /** Solapi에 등록·검수된 템플릿 ID */
  templateId: string;
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
 * Solapi messages/v4 JSON 스펙을 사용한다.
 */
export async function sendAlimtalk(
  msg: AlimtalkMessage,
): Promise<AlimtalkResult> {
  const apiUrl = Deno.env.get("KAKAO_ALIMTALK_API_URL");
  const apiKey = Deno.env.get("KAKAO_ALIMTALK_API_KEY");
  const apiSecret = Deno.env.get("KAKAO_ALIMTALK_API_SECRET");
  const pfId = Deno.env.get("KAKAO_ALIMTALK_PFID")?.trim();
  const from = Deno.env.get("KAKAO_ALIMTALK_FROM")?.trim();

  // ENV 미설정 = placeholder 모드 → caller가 INAPP 폴백
  if (!apiUrl || !apiKey || !apiSecret || !pfId || !from || !msg.templateId) {
    console.warn(
      "[alimtalk] ENV 미설정 — placeholder 모드. 카카오 비즈채널 셋업 후 실발송 가능.",
    );
    return {
      messageId: `placeholder-${Date.now()}`,
      status: "FAILED",
      error: "KAKAO_ALIMTALK env not configured",
    };
  }

  const authorization = await createSolapiAuthorization(apiKey, apiSecret);

  // Solapi 알림톡 요청에는 text를 넣지 않는다. 변수는 검수 템플릿에 치환한다.
  const body = {
    message: {
      to: msg.to,
      from,
      kakaoOptions: {
        pfId,
        templateId: msg.templateId,
        variables: msg.variables,
        disableSms: true,
      },
    },
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
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

/** Solapi 규격: HMAC-SHA256(date + salt, apiSecret), lowercase hex. */
export async function generateSolapiSignature(
  apiSecret: string,
  date: string,
  salt: string,
): Promise<string> {
  const sigData = new TextEncoder().encode(`${date}${salt}`);
  const keyData = new TextEncoder().encode(apiSecret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, sigData);
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

interface SolapiAuthorizationOptions {
  date?: string;
  salt?: string;
}

/** 요청별 ISO 8601 date와 고유 salt를 사용한 Solapi Authorization 헤더. */
export async function createSolapiAuthorization(
  apiKey: string,
  apiSecret: string,
  options: SolapiAuthorizationOptions = {},
): Promise<string> {
  const date = options.date ?? new Date().toISOString();
  const salt = options.salt ?? crypto.randomUUID().replaceAll("-", "");
  const signature = await generateSolapiSignature(apiSecret, date, salt);

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

// ─── 템플릿 헬퍼 ────────────────────────────────────────────────────────────

export const TEMPLATE_CODES = {
  /** 응원 도착 (정보성) — Solapi 검수 승인 후 환경변수로 주입 */
  CHEER_RECEIVED:
    Deno.env.get("KAKAO_ALIMTALK_TEMPLATE_CHEER_RECEIVED")?.trim() ?? "",
} as const;

/** 응원 도착 알림톡 메시지 빌더 */
export function buildCheerReceivedMessage(
  to: string,
  opts: { displayName: string; goalTitle: string },
): AlimtalkMessage {
  return {
    to,
    templateId: TEMPLATE_CODES.CHEER_RECEIVED,
    variables: {
      "#{응원자}": opts.displayName,
      "#{목표}": opts.goalTitle.slice(0, 30), // 템플릿 변수 최대 30자
    },
  };
}
