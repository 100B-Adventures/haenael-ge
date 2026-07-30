"use client";

// ManualCashoutForm — 지급대행 승인 전 임시 수동 정산 환전 신청.
// 도달(30클로버) 사용자에게 노출. 계좌는 저장 안 하고, 연락처만 받아 회장이 오프라인 지급.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ManualCashoutFormProps {
  netKrwPreview: number;
}

export function ManualCashoutForm({ netKrwPreview }: ManualCashoutFormProps) {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!contact.trim()) {
      setError("연락받을 수단(전화번호·카톡 등)을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    // 신규 RPC — 생성 타입 미반영이라 admin 페이지와 동일하게 캐스트.
    const { error: rpcError } = await supabase.rpc(
      "request_manual_cashout" as never,
      { p_contact: contact.trim() } as never,
    );
    setSubmitting(false);
    if (rpcError) {
      console.error("[ManualCashoutForm] request error:", rpcError);
      setError(
        rpcError.message?.includes("이미 처리 중")
          ? "이미 처리 중인 환전 신청이 있어요."
          : "신청하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div
        className="rounded-[15px] px-4 py-5 text-center"
        style={{ background: "#E7F4EC", border: "1px solid #1B8A4F" }}
        data-testid="cashout-request-done"
      >
        <p className="text-[14px] font-extrabold" style={{ color: "#14613A" }}>
          환전 신청이 접수됐어요 🍀
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "#3d7a5a" }}>
          입력하신 연락처로 안내드리고, 확인 후 계좌로 지급해 드릴게요(영업일 기준 며칠 소요).
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[15px] p-4"
      style={{ background: "#fff", border: "1px solid #1B8A4F" }}
      data-testid="manual-cashout-form"
    >
      <p className="text-[13.5px] font-extrabold" style={{ color: "#16140F" }}>
        환전 신청 (예상 실수령 {netKrwPreview.toLocaleString("ko-KR")}원)
      </p>
      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#6F6A60" }}>
        지금은 담당자가 직접 확인 후 계좌로 지급해 드려요. 계좌번호는 안전하게 따로
        여쭤볼게요 — 연락받을 수단만 남겨 주세요.
      </p>
      <label className="mt-3 block text-[12px] font-bold" style={{ color: "#4a4640" }}>
        연락처 (전화번호 또는 카카오 ID)
        <input
          type="text"
          className="mt-1 w-full rounded-[12px] border px-3 py-3 text-[14px] outline-none"
          style={{ borderColor: error ? "#D9483B" : "#E8E4DC", color: "#16140F" }}
          maxLength={60}
          value={contact}
          placeholder="예: 010-1234-5678"
          onChange={(e) => setContact(e.target.value)}
          data-testid="cashout-contact-input"
        />
      </label>
      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#D9483B" }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-3 w-full rounded-[14px] py-4 text-[15px] font-extrabold text-white"
        style={{ background: "#1B8A4F", opacity: submitting ? 0.7 : 1 }}
        data-testid="cashout-request-submit"
      >
        {submitting ? "신청 중…" : "환전 신청하기"}
      </button>
    </div>
  );
}
