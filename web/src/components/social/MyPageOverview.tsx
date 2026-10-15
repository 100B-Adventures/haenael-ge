"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  BellRing,
  ChevronRight,
  HandHeart,
  Megaphone,
  ReceiptText,
  Trophy,
  Share2,
  Target,
} from "lucide-react";
import { updateMemberPreferencesAction } from "@/app/(receiver)/social-actions";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DdayChip, StatusChip } from "@/components/goal/DdayChip";
import type { MySocialDashboard } from "@/lib/social/contracts";

type Preferences = {
  notifyCheer: boolean;
  notifyMarketing: boolean;
};

export function MyPageOverview({
  dashboard,
  receivedCheers = [],
  initialPreferences,
  goalCheerCounts = {},
  goalReasons = {},
}: {
  dashboard: MySocialDashboard;
  receivedCheers?: Array<{
    id: number;
    displayName: string | null;
    message: string | null;
    createdAt: string;
  }>;
  initialPreferences: Preferences;
  goalCheerCounts?: Record<number, number>;
  goalReasons?: Record<number, string | null>;
}) {
  const [cheerTab, setCheerTab] = useState<"received" | "sent">("received");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const activeGoalCount = dashboard.goals.filter((goal) =>
    goal.status === "ACTIVE"
  ).length;
  const nickname = dashboard.profile.nickname?.trim() || "해낼게 사용자";
  const initial = Array.from(nickname)[0] ?? "해";

  async function setPreference(key: keyof Preferences, value: boolean) {
    if (saving) return;
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSaving(true);
    setSaveError(false);
    const result = await updateMemberPreferencesAction(
      next.notifyCheer,
      next.notifyMarketing,
    );
    setSaving(false);
    if (!result.ok) {
      setPreferences(previous);
      setSaveError(true);
    }
  }

  return (
    <div className="my-page-stack" data-testid="my-page-overview">
      <section className="my-profile-card" data-testid="my-profile-summary">
        <div className="my-profile-avatar">
          {dashboard.profile.profile_image
            ? (
              <Image
                src={dashboard.profile.profile_image}
                alt={`${nickname} 프로필`}
                fill
                sizes="52px"
                className="object-cover"
                unoptimized
              />
            )
            : <span aria-hidden="true">{initial}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h2>{nickname}</h2>
          <p>한 걸음씩, 끝까지 함께해요</p>
          <small>
            친구 {dashboard.friend_count}명 · 진행 중 목표 {activeGoalCount}개
          </small>
        </div>
      </section>

      <section aria-labelledby="my-goals-heading">
        <h2 className="my-section-title" id="my-goals-heading">내 해낼게</h2>
        <div className="my-goal-grid">
          {dashboard.goals.length > 0 ? dashboard.goals.map((goal) => (
            <article className="my-goal-card" key={goal.goal_id}>
              <div className={`my-goal-cover is-${goal.cover_preset_key}`} aria-hidden="true" />
              <div className="my-goal-card-body">
                <div className="my-goal-chips"><DdayChip dueDate={goal.due_date} /><StatusChip status={goal.status} /></div>
                <h3 title={goal.title}>{goal.title}</h3>
                <p><strong>WHY</strong> {goalReasons[goal.goal_id]?.trim() || "이 목표를 시작한 이유를 아직 적지 않았어요."}</p>
                <div className="my-goal-meta"><span>{goalCheerCounts[goal.goal_id] ?? 0}명이 응원했어요</span><Link href={`/g/${goal.slug}`}><Share2 aria-hidden="true" /> 공유하기</Link></div>
              </div>
            </article>
          )) : (
            <div className="my-list-empty" data-testid="my-goals-empty">
              <span className="my-menu-icon" aria-hidden="true"><Target /></span>
              <div><strong>첫 해낼게를 만들어보세요</strong><p>목표와 WHY를 적으면 친구에게 공유할 링크가 생겨요.</p></div>
              <Link href="/onboarding" className="social-primary-action">해낼게 만들기</Link>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="my-activity-heading">
        <h2 className="my-section-title" id="my-activity-heading">나의 활동</h2>
        <div className="my-menu-card">
          <Link href="/me/achievements" className="my-menu-row">
            <span className="my-menu-icon"><Trophy aria-hidden="true" /></span>
            <span>
              <strong>업적</strong>
              <small>
                완료 목표 {dashboard.achievements.completed_goal_count}개 · 받은 응원 {dashboard.achievements.received_cheer_count}개 · 친구 {dashboard.achievements.connected_friend_count}명
              </small>
            </span>
            <ChevronRight aria-hidden="true" />
          </Link>
          <Link href="/cashout/history" className="my-menu-row">
            <span className="my-menu-icon"><ReceiptText aria-hidden="true" /></span>
            <span>
              <strong>환전 내역</strong>
              <small>지금까지 받은 금액과 진행 중 신청</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="my-cheers-heading">
        <h2 className="my-section-title" id="my-cheers-heading">응원 내역</h2>
        <div className="my-cheer-tabs" role="tablist" aria-label="응원 내역 구분">
          <button
            type="button"
            role="tab"
            aria-selected={cheerTab === "received"}
            className={cheerTab === "received" ? "is-active" : undefined}
            onClick={() => setCheerTab("received")}
          >받은 응원</button>
          <button
            type="button"
            role="tab"
            aria-selected={cheerTab === "sent"}
            className={cheerTab === "sent" ? "is-active" : undefined}
            onClick={() => setCheerTab("sent")}
          >보낸 응원</button>
        </div>
        <div className="my-cheer-list" role="tabpanel">
          {cheerTab === "received"
            ? receivedCheers.length > 0
              ? receivedCheers.slice(0, 3).map((cheer) => {
                  const name = cheer.displayName?.trim() || "익명의 누군가";
                  return (
                    <article key={cheer.id}>
                      <span className="my-cheer-avatar" aria-hidden="true">{Array.from(name)[0]}</span>
                      <div><strong>{name}</strong><p>💬 {cheer.message || "조용한 응원이 도착했어요."}</p></div>
                      <div className="my-cheer-status">
                        <strong>응원 도착</strong>
                        <small>{formatCheerDate(cheer.createdAt)}</small>
                      </div>
                    </article>
                  );
                })
              : (
                <div className="my-cheer-empty" data-testid="received-cheers-empty">
                  <span className="my-menu-icon"><HandHeart aria-hidden="true" /></span>
                  <div>
                    <strong>첫 응원을 받아볼까요?</strong>
                    <p>내 해낼게 링크를 공유하면 친구의 응원 메시지가 여기에 쌓여요.</p>
                    {dashboard.goals.length > 0
                      ? <Link href="/me">응원 링크 공유하기</Link>
                      : <Link href="/onboarding">해낼게 만들기</Link>}
                  </div>
                </div>
              )
            : (
              <div className="my-cheer-empty" data-testid="sent-cheers-empty">
                <span className="my-menu-icon"><HandHeart aria-hidden="true" /></span>
                <div><strong>내가 응원한 친구</strong><p>친구의 목표와 응원 메시지를 확인할 수 있어요.</p><Link href="/friends">친구 목표 보기</Link></div>
              </div>
            )}
        </div>
        <p className="my-quiet-note">금액도 순위도 없이, 응원 메시지와 도착 시각만 보여요.</p>
      </section>

      <section aria-labelledby="my-settings-heading">
        <h2 className="my-section-title" id="my-settings-heading">환경설정</h2>
        <div className="my-menu-card">
          <PreferenceRow
            icon={<BellRing aria-hidden="true" />}
            title="응원 도착 알림"
            description="응원이 오면 알림으로 알려드려요."
            checked={preferences.notifyCheer}
            disabled={saving}
            onChange={(value) => void setPreference("notifyCheer", value)}
          />
          <PreferenceRow
            icon={<Megaphone aria-hidden="true" />}
            title="마케팅 소식 받기"
            description="이벤트와 업데이트 소식을 받아요."
            checked={preferences.notifyMarketing}
            disabled={saving}
            onChange={(value) => void setPreference("notifyMarketing", value)}
          />
        </div>
        {saveError && <p className="social-error" role="alert">설정을 저장하지 못했어요. 다시 시도해 주세요.</p>}
        <nav className="my-policy-links" aria-label="서비스 안내">
          <Link href="/how">이용안내</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy">개인정보처리방침</Link>
        </nav>
      </section>

      <section aria-labelledby="my-account-heading">
        <h2 className="my-section-title" id="my-account-heading">계정</h2>
        <div className="my-account-card"><LogoutButton /></div>
      </section>

      <p className="my-company-foot">
        정성컴퍼니 · 대표 조성진 · 사업자등록번호 798-31-01774<br />
        haenaelge.official@gmail.com
      </p>
    </div>
  );
}

function formatCheerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "도착 시각 미상";
  const elapsed = Date.now() - date.getTime();
  if (elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.floor(elapsed / (60 * 60 * 1000)));
    return `${hours}시간 전`;
  }
  if (elapsed >= 0 && elapsed < 2 * 24 * 60 * 60 * 1000) return "어제";
  if (elapsed >= 0 && elapsed < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(elapsed / (24 * 60 * 60 * 1000))}일 전`;
  }
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function PreferenceRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="my-preference-row">
      <span className="my-menu-icon">{icon}</span>
      <span className="min-w-0 flex-1"><strong>{title}</strong><small>{description}</small></span>
      <button
        type="button"
        role="switch"
        aria-label={title}
        aria-checked={checked}
        className={`my-switch${checked ? " is-on" : ""}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      ><span /></button>
    </div>
  );
}
