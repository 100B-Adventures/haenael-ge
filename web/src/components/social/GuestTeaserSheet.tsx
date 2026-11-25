"use client";

import { X } from "lucide-react";
import { GUEST_PREVIEW } from "@/lib/copy/guest-preview";
import { KakaoLoginLink } from "@/components/auth/KakaoLoginLink";

export function GuestTeaserSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="guest-teaser-backdrop" onClick={onClose}>
      <section
        className="guest-teaser-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-teaser-title"
        data-testid="guest-teaser-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="guest-teaser-close" aria-label="닫기" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
        <p className="social-eyebrow">{GUEST_PREVIEW.label}</p>
        <h2 id="guest-teaser-title">{GUEST_PREVIEW.title}</h2>
        <div className="guest-teaser-sample" aria-label="예시 목표">
          <span aria-hidden="true">🌱</span>
          <strong>{GUEST_PREVIEW.sampleGoal}</strong>
        </div>
        <p className="social-description">{GUEST_PREVIEW.description}</p>
        <KakaoLoginLink
          redirectPath="/me"
          resolveRedirectPath={() =>
            window.location.pathname === "/" ? "/me" : window.location.pathname}
          className="social-primary-action"
        >
          {GUEST_PREVIEW.primaryAction}
        </KakaoLoginLink>
        <button type="button" className="social-secondary-action" onClick={onClose}>
          {GUEST_PREVIEW.secondaryAction}
        </button>
      </section>
    </div>
  );
}
