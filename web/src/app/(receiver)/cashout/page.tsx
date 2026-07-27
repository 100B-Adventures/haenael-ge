// (receiver)/cashout/page.tsx — 환전 화면: 정직한 분해표(친구분/웰컴제외) + 실수령 미리보기
// 웰컴 클로버 성장훅(2026-07-18 회장·컨트롤러 확정):
//   도달판정(홈 진입 허용)=웰컴 포함, 실제 지급 계산=웰컴 제외(친구 응원분만).
// 실제 지급 EF(cashout)는 여전히 CASHOUT_ENABLED kill switch로 게이트(PASS KYC 등 미완).
// 이 화면은 그 전까지도 "정직한 분해"를 먼저 보여준다(DESIGN.md §6c).

import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const KRW_PER_CLOVER = 1000;
const WITHHOLDING_RATE = 0.033; // 원천징수 3.3%(architecture.md §2.3 — 별풍선 선례)

function formatKrw(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export default async function CashoutPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: eligibilityRaw } = await supabase.rpc("clover_eligibility", {
    p_member_id: user.id,
  });
  const eligibility = Array.isArray(eligibilityRaw) ? eligibilityRaw[0] : eligibilityRaw;

  const totalBalance = eligibility?.total_balance ?? 0;
  const welcomeAmount = eligibility?.welcome_amount ?? 0;
  const payableAmount = eligibility?.payable_amount ?? 0;
  const minCashoutClover = eligibility?.min_cashout_clover ?? 30;
  const reachedThreshold = eligibility?.reached_threshold ?? false;
  const remaining = Math.max(minCashoutClover - totalBalance, 0);

  const cashoutEnabled = process.env.NEXT_PUBLIC_CASHOUT_ENABLED === "true";

  const grossKrw = payableAmount * KRW_PER_CLOVER;
  const withholdingKrw = Math.floor(grossKrw * WITHHOLDING_RATE);
  const netKrwPreview = grossKrw - withholdingKrw;

  return (
    <main className="min-h-svh bg-[#FBFAF7] px-[22px] py-10" data-testid="cashout-page">
      <div className="mx-auto w-full max-w-sm">
        <p className="mb-1 text-[13px] font-extrabold" style={{ color: "#1B8A4F" }}>
          해낼게.
        </p>
        <h1
          className="mb-6 font-black leading-tight"
          style={{ fontSize: 22, letterSpacing: "-0.4px", color: "#16140F" }}
        >
          환전 전에 정직하게 보여드릴게요
        </h1>

        {!reachedThreshold && (
          <div
            className="mb-4 rounded-[14px] px-4 py-3"
            style={{ background: "#F4EFE6", border: "1px solid #E8E4DC" }}
            data-testid="cashout-below-threshold-banner"
            role="status"
          >
            <p className="text-[13.5px] font-bold" style={{ color: "#16140F" }}>
              조금만 더 모으면 환전할 수 있어요
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "#6F6A60" }}>
              지금 🍀 {totalBalance}개(웰컴 포함) · 최소 환전 {minCashoutClover}개까지{" "}
              <strong style={{ color: "#14613A" }}>{remaining}개</strong> 남았어요.
              아래에서 친구 응원분과 예상 실수령액을 미리 확인할 수 있어요.
            </p>
          </div>
        )}

        {/* 분해표 — 친구 응원분 / 웰컴(제외) */}
        <div
          className="mb-4 rounded-[16px] p-4"
          style={{ background: "#fff", border: "1px solid #E8E4DC" }}
          data-testid="cashout-breakdown-table"
        >
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px]" style={{ color: "#6F6A60" }}>
              모인 클로버 (웰컴 포함)
            </span>
            <span
              className="text-[13px] font-bold"
              style={{ color: "#16140F" }}
              data-testid="breakdown-total"
            >
              🍀 {totalBalance}개
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px]" style={{ color: "#9C968B" }}>
              − 해낼게 웰컴 클로버 (지급 대상 아님)
            </span>
            <span
              className="text-[13px] font-bold"
              style={{ color: "#9C968B" }}
              data-testid="breakdown-welcome"
            >
              − 🍀 {welcomeAmount}개
            </span>
          </div>
          <div
            className="my-2 border-t"
            style={{ borderColor: "#E8E4DC" }}
          />
          <div className="flex items-center justify-between py-2">
            <span className="text-[13px] font-bold" style={{ color: "#16140F" }}>
              친구 응원분 (지급 대상)
            </span>
            <span
              className="text-[14px] font-extrabold"
              style={{ color: "#14613A" }}
              data-testid="breakdown-payable"
            >
              🍀 {payableAmount}개
            </span>
          </div>
        </div>

        {/* 실수령 미리보기 */}
        <div
          className="mb-6 rounded-[16px] p-4"
          style={{ background: "#E7F4EC" }}
          data-testid="cashout-net-preview"
        >
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12.5px]" style={{ color: "#3d7a5a" }}>
              친구 응원분 환산 (🍀1개=1,000원)
            </span>
            <span className="text-[12.5px] font-semibold" style={{ color: "#14613A" }}>
              {formatKrw(grossKrw)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12.5px]" style={{ color: "#3d7a5a" }}>
              사업소득 원천징수 (3.3%)
            </span>
            <span className="text-[12.5px] font-semibold" style={{ color: "#14613A" }}>
              − {formatKrw(withholdingKrw)}
            </span>
          </div>
          <div
            className="my-2 border-t"
            style={{ borderColor: "rgba(20,97,58,0.18)" }}
          />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13.5px] font-bold" style={{ color: "#16140F" }}>
              예상 실수령액
            </span>
            <span
              className="text-[17px] font-extrabold"
              style={{ color: "#14613A" }}
              data-testid="cashout-net-amount"
            >
              {formatKrw(netKrwPreview)}
            </span>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed" style={{ color: "#6F6A60" }}>
            수수료(플랫폼 take-rate)는 정책 확정 전이라 위 미리보기에 반영되지 않았어요.
            실제 지급액은 신청 시점에 다시 확정해 보여드려요.
          </p>
        </div>

        {/* 확정 CTA — kill switch 게이트 */}
        {cashoutEnabled && reachedThreshold ? (
          <button
            type="button"
            className="w-full rounded-[15px] py-4 text-[15.5px] font-extrabold text-white"
            style={{ background: "#1B8A4F", boxShadow: "0 6px 16px rgba(27,138,79,.22)" }}
            data-testid="cashout-confirm-button"
          >
            {formatKrw(netKrwPreview)} 환전 신청하기
          </button>
        ) : (
          <div
            className="flex flex-col items-center rounded-[15px] py-5 text-center"
            style={{ background: "#F4EFE6" }}
            data-testid="cashout-confirm-disabled"
          >
            <Clock3 className="mb-2 text-[#1B8A4F]" size={22} aria-hidden="true" />
            <p className="text-[13.5px] font-bold" style={{ color: "#16140F" }}>
              환전 기능을 준비하고 있어요
            </p>
            <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed" style={{ color: "#6F6A60" }}>
              환전은 최소 30클로버(30,000원)부터 가능해요. 본인 확인과 안전한 지급 절차를 검증한 뒤 열겠습니다. 지금 쌓인 클로버는 그대로 보관됩니다.
            </p>
          </div>
        )}

        <Link
          href="/me"
          className="mt-4 block text-center text-[12px] font-semibold"
          style={{ color: "#9C968B" }}
        >
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
