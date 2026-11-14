"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { BUSINESS_INFORMATION } from "@/lib/legal/exposure";
import { latestAnnouncedRelease, latestPublicRelease } from "@/lib/release-notes";

type ReleaseRating = "like" | "dislike";
type SendState = "idle" | "sending" | "sent" | "failed";

// 의견은 카드가 안내한 기능 버전에 붙인다. 안내 버전이 없으면 최신 기록 버전.
const RELEASE = (latestAnnouncedRelease ?? latestPublicRelease).version;

async function sendFeedback(payload: { rating?: ReleaseRating; message?: string; website?: string }) {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, release: RELEASE, path: window.location.pathname }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function ReleaseFeedback() {
  const [rating, setRating] = useState<ReleaseRating | null>(null);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<SendState>("idle");
  const inquiryHref = `mailto:${BUSINESS_INFORMATION.email}?subject=${encodeURIComponent("[해낼게 업데이트 의견]")}`;

  async function submitRating(next: ReleaseRating) {
    setRating(next);
    trackEvent("whats_new_feedback", { release: RELEASE, rating: next });
    setState("sending");
    setState((await sendFeedback({ rating: next, website: honeypot })) ? "sent" : "failed");
  }

  async function submitMessage() {
    const trimmed = message.trim();
    if (trimmed.length < 2) return;
    setState("sending");
    const ok = await sendFeedback({ rating: rating ?? undefined, message: trimmed, website: honeypot });
    setState(ok ? "sent" : "failed");
    if (ok) setMessage("");
  }

  return (
    <section className="updates-feedback" id="feedback" aria-labelledby="updates-feedback-title">
      <p>의견 남기기</p>
      <h2 id="updates-feedback-title">이번 업데이트는 어떠셨나요?</h2>
      <div className="updates-feedback-actions" aria-label="업데이트 평가">
        <button type="button" aria-pressed={rating === "like"} disabled={state === "sending"} onClick={() => void submitRating("like")}>좋아요</button>
        <button type="button" aria-pressed={rating === "dislike"} disabled={state === "sending"} onClick={() => void submitRating("dislike")}>별로예요</button>
      </div>
      <form
        className="updates-feedback-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage();
        }}
      >
        <label htmlFor="updates-feedback-message">한마디 남기기</label>
        <div>
          <input
            id="updates-feedback-message"
            value={message}
            maxLength={300}
            placeholder="좋았던 점, 불편한 점을 한 줄로 적어 주세요"
            disabled={state === "sending"}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button type="submit" disabled={state === "sending" || message.trim().length < 2}>보내기</button>
        </div>
        <input
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          name="website"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </form>
      {state === "sent" ? <p role="status">의견을 보냈어요. 고맙습니다.</p> : null}
      {state === "failed" ? <p role="status">지금은 보내지 못했어요. 아래 이메일로 보내 주세요.</p> : null}
      <a href={inquiryHref}>사진을 붙이거나 길게 쓰려면 이메일로 보내기</a>
    </section>
  );
}
