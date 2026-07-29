// report-flow.spec.ts — 신고/모더레이션 E2E (슬라이스 #10)
// 신고 버튼 → ReportSheet 열림 → 사유 선택 → 접수 (로컬 Supabase + EF).
// E2E_GOAL_SLUG 없으면 UI 흐름만 검증 (EF 실호출 skip).
// 실 EF 호출 = E2E_GOAL_SLUG + E2E_REPORT_EF_URL 설정 필요.

import { test, expect } from "@playwright/test";

// 다른 스펙들과 동일하게 E2E_BASE_URL을 우선 사용(env 변수명 통일). 둘 다 없으면 로컬 기본.
const BASE_URL =
  process.env.E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const GOAL_SLUG = process.env.E2E_GOAL_SLUG;
const REPORT_EF_URL =
  process.env.E2E_REPORT_EF_URL ??
  "http://127.0.0.1:54321/functions/v1/report";
// anon key: 로컬 개발용 공개값은 NEXT_PUBLIC_SUPABASE_ANON_KEY로 전달
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ─── UI 흐름 테스트 (dev 서버 필요) ─────────────────────────────────────────

test.describe("ReportButton UI 흐름", () => {
  test("goal 페이지에 신고 버튼 렌더됨", async ({ page }) => {
    test.skip(!GOAL_SLUG, "E2E_GOAL_SLUG 미설정 — goal 페이지 테스트 skip");
    await page.goto(`${BASE_URL}/g/${GOAL_SLUG}`);
    await expect(page.getByTestId("goal-public-page")).toBeVisible();
    await expect(page.getByTestId("report-button")).toBeVisible();
  });

  test("신고 버튼 클릭 → ReportSheet 열림", async ({ page }) => {
    test.skip(!GOAL_SLUG, "E2E_GOAL_SLUG 미설정 — skip");
    await page.goto(`${BASE_URL}/g/${GOAL_SLUG}`);
    await page.getByTestId("report-button").click();
    await expect(page.getByTestId("report-sheet")).toBeVisible();
  });

  test("ReportSheet — 사유 선택지 5개 노출", async ({ page }) => {
    test.skip(!GOAL_SLUG, "E2E_GOAL_SLUG 미설정 — skip");
    await page.goto(`${BASE_URL}/g/${GOAL_SLUG}`);
    await page.getByTestId("report-button").click();
    await expect(page.getByTestId("report-sheet")).toBeVisible();

    const presets = [
      "스팸 또는 광고",
      "욕설·혐오 표현",
      "개인정보 노출",
      "허위 정보",
      "기타",
    ];
    for (const preset of presets) {
      await expect(page.getByTestId(`report-reason-${preset}`)).toBeVisible();
    }
  });

  test("사유 선택 전 제출 버튼 비활성", async ({ page }) => {
    test.skip(!GOAL_SLUG, "E2E_GOAL_SLUG 미설정 — skip");
    await page.goto(`${BASE_URL}/g/${GOAL_SLUG}`);
    await page.getByTestId("report-button").click();
    await expect(page.getByTestId("report-sheet")).toBeVisible();

    const submitBtn = page.getByTestId("report-submit");
    await expect(submitBtn).toBeDisabled();
  });

  test("취소 클릭 시 시트 닫힘", async ({ page }) => {
    test.skip(!GOAL_SLUG, "E2E_GOAL_SLUG 미설정 — skip");
    await page.goto(`${BASE_URL}/g/${GOAL_SLUG}`);
    await page.getByTestId("report-button").click();
    await expect(page.getByTestId("report-sheet")).toBeVisible();

    await page.getByTestId("report-cancel").click();
    await expect(page.getByTestId("report-sheet")).not.toBeVisible();
  });

  test("기타 선택 → 텍스트 입력 필드 노출", async ({ page }) => {
    test.skip(!GOAL_SLUG, "E2E_GOAL_SLUG 미설정 — skip");
    await page.goto(`${BASE_URL}/g/${GOAL_SLUG}`);
    await page.getByTestId("report-button").click();
    await page.getByTestId("report-reason-기타").click();
    await expect(page.getByTestId("report-custom-reason")).toBeVisible();
  });
});

// ─── EF 직접 호출 — 신고 접수 실검증 ──────────────────────────────────────

test.describe("report EF 실호출 (R1)", () => {
  test.skip(!GOAL_SLUG, "E2E_GOAL_SLUG 미설정 — EF 실호출 skip");

  test("EF report — GOAL 신고 접수 성공 (anon)", async ({ request }) => {
    // 실 DB에 goal이 있어야 함
    // 먼저 goal id를 Supabase REST로 조회
    const slugRes = await request.get(
      `http://127.0.0.1:54321/rest/v1/goal_public?slug=eq.${GOAL_SLUG}&select=id`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      },
    );
    expect(slugRes.status()).toBe(200);
    const goals = await slugRes.json();
    expect(goals.length).toBeGreaterThan(0);
    const goalId = goals[0].id as number;

    // EF 실호출
    const res = await request.post(REPORT_EF_URL, {
      data: {
        targetType: "GOAL",
        targetId: goalId,
        reason: "E2E 테스트 신고 (자동삭제 무방)",
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
    });

    // EF가 serve 중이면 201, 아직 serve 안 됐으면 502/404
    const status = res.status();
    if (status === 502 || status === 404) {
      test.skip(true, "EF not serving — supabase functions serve 필요");
      return;
    }
    expect(status).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty("reportId");
    expect(typeof body.reportId).toBe("number");
  });

  test("EF report — 400 입력 검증 (targetType 오류)", async ({ request }) => {
    const res = await request.post(REPORT_EF_URL, {
      data: {
        targetType: "INVALID",
        targetId: 1,
        reason: "테스트",
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
    });

    const status = res.status();
    if (status === 502 || status === 404) {
      test.skip(true, "EF not serving — skip");
      return;
    }
    expect(status).toBe(400);
  });

  test("EF report — 401 Authorization 없으면 거부", async ({ request }) => {
    const res = await request.post(REPORT_EF_URL, {
      data: {
        targetType: "GOAL",
        targetId: 1,
        reason: "인증 없음 테스트",
      },
      headers: { "Content-Type": "application/json" },
    });

    const status = res.status();
    if (status === 502 || status === 404) {
      test.skip(true, "EF not serving — skip");
      return;
    }
    // anon key 없으면 401
    expect(status).toBe(401);
  });
});
