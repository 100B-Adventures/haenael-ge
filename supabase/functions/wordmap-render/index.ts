// wordmap-render — G6: 워드맵 SVG 생성 → Storage 업로드 → imageUrl 반환
// 인증: 👤 goal 소유자만 (JWT Authorization 필수)
// 슬라이스 #9 실구현.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── SVG 생성 헬퍼 ───────────────────────────────────────────────────────────

type WordEntry = { word: string; word_count: number };

// 16개 위치 (x, y, rotate°) — 800×500 cloud area
const CLOUD_POSITIONS = [
  { x: 400, y: 200, r: 0 },
  { x: 200, y: 160, r: -4 },
  { x: 580, y: 170, r: 3 },
  { x: 120, y: 270, r: -2 },
  { x: 660, y: 280, r: 4 },
  { x: 310, y: 330, r: -3 },
  { x: 520, y: 320, r: 2 },
  { x: 180, y: 390, r: -5 },
  { x: 590, y: 390, r: 3 },
  { x: 400, y: 420, r: 0 },
  { x: 300, y: 250, r: 3 },
  { x: 510, y: 240, r: -2 },
  { x: 140, y: 185, r: -4 },
  { x: 640, y: 185, r: 4 },
  { x: 370, y: 375, r: 0 },
  { x: 450, y: 290, r: -3 },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function getWordStyle(
  count: number,
  maxCount: number,
): { fontSize: number; fontWeight: string; fill: string } {
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio >= 0.6) {
    return { fontSize: Math.round(30 + ratio * 10), fontWeight: "800", fill: "#1a8150" };
  }
  if (ratio >= 0.3) {
    return { fontSize: Math.round(20 + ratio * 12), fontWeight: "700", fill: "#57a178" };
  }
  return { fontSize: Math.round(13 + ratio * 8), fontWeight: "600", fill: "#8bb79f" };
}

function buildWordmapSvg(
  title: string,
  words: WordEntry[],
  supporterCount: number,
): string {
  const maxCount = words.length > 0 ? Math.max(...words.map((w) => w.word_count)) : 1;
  const visible = words.slice(0, 15);

  const wordElements = visible
    .map((item, i) => {
      const pos = CLOUD_POSITIONS[i % CLOUD_POSITIONS.length];
      const { fontSize, fontWeight, fill } = getWordStyle(item.word_count, maxCount);
      const transformAttr =
        pos.r !== 0 ? ` transform="rotate(${pos.r} ${pos.x} ${pos.y})"` : "";
      return (
        `  <text x="${pos.x}" y="${pos.y}" text-anchor="middle"\n` +
        `    font-family="system-ui,-apple-system,sans-serif"\n` +
        `    font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}"${transformAttr}>${escapeXml(item.word)}</text>`
      );
    })
    .join("\n");

  const displayTitle = escapeXml(
    title.replace(/\s*해낼게\s*$/, "").trim() + " 해낼게",
  );
  const subText =
    supporterCount > 0
      ? escapeXml(`${supporterCount}명이 조용히 응원했어요`)
      : "첫 번째 응원을 기다리고 있어요";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">`,
    `  <defs>`,
    `    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0%" stop-color="#F4EFE6"/>`,
    `      <stop offset="100%" stop-color="#E7F4EC"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="800" height="500" fill="url(#bg)"/>`,
    `  <text x="400" y="62" text-anchor="middle"`,
    `    font-family="system-ui,-apple-system,sans-serif"`,
    `    font-size="22" font-weight="800" fill="#16140F">${displayTitle}</text>`,
    `  <text x="400" y="90" text-anchor="middle"`,
    `    font-family="system-ui,-apple-system,sans-serif"`,
    `    font-size="13" fill="#6F6A60">${subText}</text>`,
    `  <line x1="60" y1="110" x2="740" y2="110" stroke="#E8E4DC" stroke-width="1"/>`,
    wordElements,
    `  <text x="748" y="482" text-anchor="end"`,
    `    font-family="system-ui,-apple-system,sans-serif"`,
    `    font-size="13" font-weight="800" fill="#14613A">해낼게.</text>`,
    `</svg>`,
  ].join("\n");
}

// ─── 응답 헬퍼 ───────────────────────────────────────────────────────────────

function jsonResponse(
  status: number,
  body: unknown,
  extra?: Record<string, string>,
): Response {
  const headers = withRegionHeader(
    new Headers({
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...extra,
    }),
  );
  return new Response(JSON.stringify(body), { status, headers });
}

// ─── EF 진입점 ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withRegionHeader(new Headers(CORS_HEADERS)),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: { code: "method_not_allowed" } });
  }

  // ── 인증 헤더 ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: { code: "unauthorized" } });
  }

  // ── 요청 body 파싱 ────────────────────────────────────────────────────────
  let body: { goal_id?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: { code: "invalid_json" } });
  }

  const goalId = Number(body.goal_id);
  if (!goalId || !Number.isInteger(goalId) || goalId <= 0) {
    return jsonResponse(400, { error: { code: "goal_id_required" } });
  }

  // ── Supabase 클라이언트 초기화 ────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // 유저 클라이언트 (goal 소유자 검증 — RLS 통과)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // 서비스롤 클라이언트 (Storage + cache write — RLS 우회 허용)
  const svcClient = createClient(supabaseUrl, serviceKey);

  // ── goal 소유자 검증 ──────────────────────────────────────────────────────
  const { data: goal, error: goalErr } = await userClient
    .from("goal")
    .select("id, title, member_id")
    .eq("id", goalId)
    .single();

  if (goalErr || !goal) {
    return jsonResponse(403, { error: { code: "forbidden" } });
  }

  // ── 워드맵 단어 조회 ──────────────────────────────────────────────────────
  const { data: wordmapRaw } = await svcClient.rpc("get_wordmap", {
    p_goal_id: goalId,
  });

  const words: WordEntry[] = (wordmapRaw ?? []).map(
    (w: { word: string; word_count: number }) => ({
      word: w.word,
      word_count: Number(w.word_count),
    }),
  );

  // 응원자 수
  const { count: supporterCount } = await svcClient
    .from("cheer")
    .select("*", { count: "exact", head: true })
    .eq("goal_id", goalId)
    .eq("status", "CONFIRMED")
    .is("deleted_at", null);

  // ── SVG 생성 ──────────────────────────────────────────────────────────────
  const svg = buildWordmapSvg(goal.title ?? "해낼게", words, supporterCount ?? 0);
  const svgBytes = new TextEncoder().encode(svg);

  // ── Storage 업로드 (goal 단위 덮어쓰기) ──────────────────────────────────
  const storagePath = `goal-${goalId}/wordmap.svg`;

  const { error: uploadErr } = await svcClient.storage
    .from("wordmap-images")
    .upload(storagePath, svgBytes, {
      contentType: "image/svg+xml",
      upsert: true,
    });

  if (uploadErr) {
    console.error("[wordmap-render] Storage upload failed:", uploadErr);
    return jsonResponse(500, {
      error: { code: "upload_failed", detail: uploadErr.message },
    });
  }

  const {
    data: { publicUrl },
  } = svcClient.storage.from("wordmap-images").getPublicUrl(storagePath);

  // ── wordmap_render_cache 갱신 (DELETE → INSERT) ───────────────────────────
  await svcClient.from("wordmap_render_cache").delete().eq("goal_id", goalId);
  await svcClient.from("wordmap_render_cache").insert({
    goal_id: goalId,
    image_url: publicUrl,
    word_count: words.length,
    rendered_at: new Date().toISOString(),
  });

  return jsonResponse(200, {
    imageUrl: publicUrl,
    wordCount: words.length,
    fromCache: false,
  });
});
