// 한 줄 의견 → 슬랙. 회장 2026-11-14 "텍스트 하나 적어 넣으면 바로 한마디 코멘트가 우리한테 전달".
// DB 테이블 없이 서버가 슬랙 웹훅(SLACK_FEEDBACK_WEBHOOK_URL)으로 바로 보낸다. 개인정보(이름·연락처)는 받지 않는다.
// 웹훅이 없으면 503 을 돌려주고 화면은 이메일 안내로 대체한다.
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 300;
const RATINGS = new Set(["like", "dislike"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const webhook = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ error: "feedback_unavailable" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  // 봇 차단용 숨은 칸. 사람은 비워 둔다.
  if (clean(body.website, 50)) return NextResponse.json({ ok: true });

  const message = clean(body.message, MAX_LENGTH);
  const rating = RATINGS.has(String(body.rating)) ? String(body.rating) : null;
  // 별점만 눌러도 받는다. 별점이 없으면 두 글자 이상 코멘트가 있어야 한다.
  if (!rating && message.length < 2) return NextResponse.json({ error: "message_too_short" }, { status: 400 });
  const release = clean(body.release, 20) || "-";
  const path = clean(body.path, 80).replace(/[^\w/-]/g, "") || "-";

  let isMember = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    isMember = Boolean(data.user);
  } catch {
    isMember = false;
  }

  const ratingLabel = rating === "like" ? "좋아요" : rating === "dislike" ? "별로예요" : "의견";
  // 운영이 아닌 곳(staging·미리보기)에서 온 의견은 슬랙에서 구분되게 표시한다.
  const envTag = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" ? "[시험] " : "";
  const text = `${envTag}[해낼게 의견] ${ratingLabel} · ${release} · ${isMember ? "회원" : "비회원"} · ${path}${message ? `\n> ${message}` : ""}`;
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return NextResponse.json({ error: "feedback_send_failed" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "feedback_send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
