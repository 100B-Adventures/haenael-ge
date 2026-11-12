"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { BUSINESS_INFORMATION } from "@/lib/legal/exposure";
import { latestPublicRelease } from "@/lib/release-notes";

type ReleaseRating = "like" | "dislike";

export function ReleaseFeedback() {
  const [status, setStatus] = useState<"idle" | "sent" | "blocked">("idle");
  const inquiryHref = `mailto:${BUSINESS_INFORMATION.email}?subject=${encodeURIComponent("[해낼게 업데이트 의견]")}`;

  const submitRating = (rating: ReleaseRating) => {
    const sent = trackEvent("whats_new_feedback", {
      release: latestPublicRelease.version,
      rating,
    });
    setStatus(sent ? "sent" : "blocked");
  };

  return (
    <section className="updates-feedback" id="feedback" aria-labelledby="updates-feedback-title">
      <p>의견 남기기</p>
      <h2 id="updates-feedback-title">이번 업데이트는 어떠셨나요?</h2>
      <div className="updates-feedback-actions" aria-label="업데이트 평가">
        <button type="button" onClick={() => submitRating("like")}>좋아요</button>
        <button type="button" onClick={() => submitRating("dislike")}>별로예요</button>
      </div>
      {status === "sent" ? <p role="status">의견을 보냈어요. 고맙습니다.</p> : null}
      {status === "blocked" ? (
        <p role="status">분석 동의가 꺼져 있어 전송하지 않았어요. 아래 이메일로 보내 주세요.</p>
      ) : null}
      <a href={inquiryHref}>이메일로 자세한 의견 보내기</a>
    </section>
  );
}
