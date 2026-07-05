// e2e/goal-flow.spec.ts — 슬라이스 #4 E2E 테스트
// happy path: 목표 작성 → 저장(로컬 로그인) → 내 링크 → ② 페이지 확인
// edge: 비로그인 ② 열람 가능 / 입력검증 실패 / 404
//
// ⚠️  이 테스트는 로컬 Supabase + dev 서버 가동 상태에서만 완전 실행 가능.
//     CI에서는 SKIP 마크. 로컬 E2E 검증은 browse 스킬로 수동 확인(§3).

import { test, expect } from "@playwright/test";

// ─── 랜딩 페이지 ─────────────────────────────────────────────────────────────

test("landing: 브랜드명·슬로건·CTA 렌더", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/해낼게/);
  await expect(page.getByTestId("landing-cta")).toBeVisible();
  await expect(page.getByTestId("landing-cta")).toHaveText("시작하기");
});

test("landing: CTA 클릭 → /onboarding 이동", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-cta").click();
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByTestId("onboarding-page")).toBeVisible();
});

// ─── 온보딩 폼 ───────────────────────────────────────────────────────────────

test("onboarding: 폼 렌더 (testID 확인)", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByTestId("onboarding-form")).toBeVisible();
  await expect(page.getByTestId("goal-title-input")).toBeVisible();
  await expect(page.getByTestId("goal-due-date-input")).toBeVisible();
  await expect(page.getByTestId("goal-reason-input")).toBeVisible();
  await expect(page.getByTestId("save-goal-button")).toBeVisible();
});

test("onboarding edge: 빈 title로 저장 → 인라인 에러", async ({ page }) => {
  await page.goto("/onboarding");
  // 제목 비운 채로 저장 시도
  await page.getByTestId("save-goal-button").click();
  await expect(page.getByText("목표를 입력해 주세요.")).toBeVisible();
  // 폼이 그대로 남아있어야 함 (dead-end 아님)
  await expect(page.getByTestId("onboarding-form")).toBeVisible();
});

test("onboarding edge: 제목 입력 후 에러 해소", async ({ page }) => {
  await page.goto("/onboarding");
  // 에러 유발
  await page.getByTestId("save-goal-button").click();
  await expect(page.getByText("목표를 입력해 주세요.")).toBeVisible();
  // 입력하면 에러 사라짐
  await page.getByTestId("goal-title-input").fill("편입 평점 4.0");
  await expect(page.getByText("목표를 입력해 주세요.")).not.toBeVisible();
});

test("onboarding: 저장 버튼 클릭 시 미인증 → LoginSheet 표시", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByTestId("goal-title-input").fill("편입 평점 4.0");
  await page.getByTestId("save-goal-button").click();
  // LoginSheet 등장 확인
  await expect(page.getByTestId("login-sheet-overlay")).toBeVisible();
  await expect(page.getByTestId("login-sheet-panel")).toBeVisible();
});

test("onboarding: LoginSheet에 목표 제목 표시 (draft 안심)", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByTestId("goal-title-input").fill("내 소중한 목표");
  await page.getByTestId("save-goal-button").click();
  // LoginSheet가 &ldquo;...&rdquo; 따옴표로 감싸므로 contains 사용
  await expect(page.getByTestId("login-sheet-goal-title")).toContainText("내 소중한 목표");
});

test("onboarding: LoginSheet ESC로 닫기 → draft 유지", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByTestId("goal-title-input").fill("ESC 테스트 목표");
  await page.getByTestId("save-goal-button").click();
  // ESC로 닫기
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("login-sheet-overlay")).not.toBeVisible();
  // 폼 여전히 보임
  await expect(page.getByTestId("onboarding-form")).toBeVisible();
  // 입력값 유지
  await expect(page.getByTestId("goal-title-input")).toHaveValue("ESC 테스트 목표");
});

// ─── ② 목표 페이지 (비로그인 접근) ──────────────────────────────────────────

test("goal page: 존재하지 않는 slug → not-found 렌더", async ({ page }) => {
  await page.goto("/g/slug-that-does-not-exist-xyz");
  await expect(page.getByTestId("goal-not-found")).toBeVisible();
  await expect(page.getByTestId("not-found-home-link")).toBeVisible();
});

test("goal not-found: 홈 링크 → 랜딩으로 이동", async ({ page }) => {
  await page.goto("/g/nonexistent-abc123");
  await page.getByTestId("not-found-home-link").click();
  await expect(page).toHaveURL("/");
});

// ─── happy path: 실 DB 연동 (로컬 Supabase + seeded goal) ────────────────────
// NOTE: 아래 테스트는 E2E_GOAL_SLUG 환경변수가 있을 때만 실행.
// 시드: supabase db seed 또는 수동으로 slug를 설정해야 함.

const E2E_SLUG = process.env.E2E_GOAL_SLUG;

test.describe("goal page (실 DB, slug 있을 때만)", () => {
  test.skip(!E2E_SLUG, "E2E_GOAL_SLUG 미설정 — 시드 후 재실행");

  test("goal page: 비로그인으로 ② 목표 페이지 열람 가능", async ({ page }) => {
    await page.goto(`/g/${E2E_SLUG}`);
    await expect(page.getByTestId("goal-public-page")).toBeVisible();
    await expect(page.getByTestId("goal-card")).toBeVisible();
  });

  test("goal page: 금액 비노출 — ₩ 없음", async ({ page }) => {
    await page.goto(`/g/${E2E_SLUG}`);
    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toMatch(/₩|[0-9]+원/);
  });

  test("goal page: 결제 CTA 비활성 ('곧' 표시)", async ({ page }) => {
    await page.goto(`/g/${E2E_SLUG}`);
    const cta = page.getByTestId("cheer-cta-disabled");
    await expect(cta).toBeVisible();
    await expect(cta).toBeDisabled();
    await expect(cta).toContainText("곧");
  });

  test("goal page: role-transition '나도 해낼게 만들래' 링크", async ({ page }) => {
    await page.goto(`/g/${E2E_SLUG}`);
    await expect(page.getByTestId("role-transition-link")).toBeVisible();
    await expect(page.getByTestId("role-transition-link")).toHaveAttribute("href", "/");
  });
});
