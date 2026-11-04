"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { createFriendInviteAction } from "@/app/(receiver)/social-actions";
import type { InviteCreated } from "@/lib/social/contracts";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-friendinvitecard";

export function FriendInviteCard(
  { goals, acceptedFriend }: {
    goals: Array<{ id: number; title: string; visibility: string }>;
    acceptedFriend?: {
      nickname: string;
      profileImage: string | null;
    } | null;
  },
) {
  const [invite, setInvite] = useState<InviteCreated | null>(null);
  const [state, setState] = useState<
    "idle" | "loading" | "copied" | "shared" | "error" | "rate"
  >("idle");

  const goalId = goals[0]?.id ?? 0;

  async function ensureInvite() {
    if (invite) return invite;
    if (!goalId) return null;
    setState("loading");
    const result = await createFriendInviteAction(goalId);
    if (!result.ok) {
      setState(result.code === "invite_rate_limited" ? "rate" : "error");
      return null;
    }
    setInvite(result.data);
    setState("idle");
    return result.data;
  }

  function invitationUrl(created: InviteCreated) {
    return `${window.location.origin}${created.web_path}`;
  }

  async function copy() {
    const created = await ensureInvite();
    if (!created) return;
    try {
      await navigator.clipboard.writeText(invitationUrl(created));
      setState("copied");
    } catch {
      setState("error");
    }
  }

  async function share() {
    const created = await ensureInvite();
    if (!created) return;
    const selectedGoal = goals[0];
    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(invitationUrl(created));
        setState("copied");
      } catch {
        setState("error");
      }
      return;
    }
    try {
      await navigator.share({
        title: "해낼게 친구 초대",
        text: `같이 응원할래? ${selectedGoal?.title ?? "내 목표"}`,
        url: invitationUrl(created),
      });
      setState("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    }
  }

  return (
    <div className="invite-flow" data-testid="friend-invite-card">
      <section className="invite-hero-card">
        <p className="social-eyebrow">{PRODUCT_COPY.TEXT_001}</p>
        <h1>{PRODUCT_COPY.TEXT_002}<br />{PRODUCT_COPY.TEXT_003}</h1>
        <p>{PRODUCT_COPY.TEXT_004}</p>
        <Image
          className="invite-people-photo"
          src="/images/social-viral/belong.png"
          alt="함께 응원하는 친구들"
          width={1000}
          height={748}
          priority
        />
      </section>

      <section className="invite-preview" aria-label="카카오톡 초대 미리보기">
        <p>{PRODUCT_COPY.TEXT_005}</p>
        <div>
          <div className="invite-preview-top">
            <span className="invite-preview-avatar">
              <Image
                src="/images/social-viral/seoyeon.png"
                alt="서연"
                width={64}
                height={64}
              />
            </span>
          </div>
          <div className="invite-preview-body">
            <h2>{PRODUCT_COPY.TEXT_006}</h2>
            <p>{PRODUCT_COPY.TEXT_007}</p>
          </div>
          <strong>{PRODUCT_COPY.TEXT_008}</strong>
        </div>
      </section>

      {goals.length === 0
        ? (
          <section className="social-empty">
            <h2>{PRODUCT_COPY.TEXT_009}</h2>
            <p>{PRODUCT_COPY.TEXT_010}</p>
            <Link href="/me" className="social-primary-action">{PRODUCT_COPY.TEXT_011}</Link>
          </section>
        )
        : (
          <section className="invite-share-row" aria-label={PRODUCT_COPY.TEXT_012}>
            <button type="button" className="is-kakao" disabled={state === "loading"} onClick={() => void share()}>
              <span className="invite-share-icon" aria-hidden="true">💬</span><span>{PRODUCT_COPY.TEXT_013}</span>
            </button>
            <button type="button" disabled={state === "loading"} onClick={() => void copy()}>
              <span className="invite-share-icon" aria-hidden="true">🔗</span><span>{state === "loading" ? PRODUCT_COPY.TEXT_014 : PRODUCT_COPY.TEXT_015}</span>
            </button>
            {state === "copied" && <p role="status" className="social-success">{PRODUCT_COPY.TEXT_016}</p>}
            {state === "shared" && <p role="status" className="social-success">{PRODUCT_COPY.TEXT_017}</p>}
            {state === "rate" && <p role="alert" className="social-error">{PRODUCT_COPY.TEXT_018}</p>}
            {state === "error" && <p role="alert" className="social-error">{PRODUCT_COPY.TEXT_019}</p>}
          </section>
        )}

      {acceptedFriend && (
        <section className="invite-accepted-panel" data-testid="invite-accepted-panel">
          <span className="invite-accepted-avatar">
            {acceptedFriend.profileImage
              ? <Image src={acceptedFriend.profileImage} alt={`${acceptedFriend.nickname} 프로필`} fill sizes="44px" unoptimized />
              : <span aria-hidden="true">{Array.from(acceptedFriend.nickname)[0]}</span>}
          </span>
          <p><strong>{acceptedFriend.nickname}</strong>{PRODUCT_COPY.TEXT_020}</p>
        </section>
      )}

      <p className="invite-safe-note">
        <ShieldCheck aria-hidden="true" />{PRODUCT_COPY.TEXT_021}</p>
    </div>
  );
}
