"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { createFriendInviteAction } from "@/app/(receiver)/social-actions";
import type { InviteCreated } from "@/lib/social/contracts";

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
        <p className="social-eyebrow">함께 응원할 친구 부르기</p>
        <h1>친구를 부르면<br />서로의 목표를 같이 응원해요</h1>
        <p>초대한 친구가 들어오면 서로의 목표가 친구 목록에 보여요.</p>
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
        <p>카카오톡으로 이렇게 전해져요</p>
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
            <h2>서연님이 해낼게에 초대했어요</h2>
            <p>“네 목표도 내가 조용히 응원할게. 같이 해낼래?”</p>
          </div>
          <strong>들어가서 내 목표 쓰기 →</strong>
        </div>
      </section>

      {goals.length === 0
        ? (
          <section className="social-empty">
            <h2>초대할 목표가 없어요</h2>
            <p>친구에게 보여줄 목표를 공개 또는 친구 공개로 바꾼 뒤 다시 시도해 주세요.</p>
            <Link href="/me" className="social-primary-action">내 해낼게 관리하기</Link>
          </section>
        )
        : (
          <section className="invite-share-row" aria-label="초대 보내기">
            <button type="button" className="is-kakao" disabled={state === "loading"} onClick={() => void share()}>
              <span className="invite-share-icon" aria-hidden="true">💬</span><span>카카오톡 초대</span>
            </button>
            <button type="button" disabled={state === "loading"} onClick={() => void copy()}>
              <span className="invite-share-icon" aria-hidden="true">🔗</span><span>{state === "loading" ? "준비 중" : "초대 링크 복사"}</span>
            </button>
            {state === "copied" && <p role="status" className="social-success">초대 링크를 복사했어요.</p>}
            {state === "shared" && <p role="status" className="social-success">친구에게 초대를 보냈어요.</p>}
            {state === "rate" && <p role="alert" className="social-error">잠시 뒤에 새 초대 링크를 만들어 주세요.</p>}
            {state === "error" && <p role="alert" className="social-error">초대 링크를 만들지 못했어요. 다시 시도해 주세요.</p>}
          </section>
        )}

      {acceptedFriend && (
        <section className="invite-accepted-panel" data-testid="invite-accepted-panel">
          <span className="invite-accepted-avatar">
            {acceptedFriend.profileImage
              ? <Image src={acceptedFriend.profileImage} alt={`${acceptedFriend.nickname} 프로필`} fill sizes="44px" unoptimized />
              : <span aria-hidden="true">{Array.from(acceptedFriend.nickname)[0]}</span>}
          </span>
          <p><strong>{acceptedFriend.nickname}</strong>님이 초대를 받고 들어왔어요. 이제 친구 목록에서 서로의 목표를 볼 수 있어요.</p>
        </section>
      )}

      <p className="invite-safe-note">
        <ShieldCheck aria-hidden="true" />
        내가 고른 사람에게만 카카오톡이나 링크로 초대해요.
      </p>
    </div>
  );
}
