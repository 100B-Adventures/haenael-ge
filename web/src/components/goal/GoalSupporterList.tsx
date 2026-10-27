"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ClampText } from "@/components/common/ClampText";
import { Collapsible } from "@/components/common/Collapsible";

export type GoalSupporter = {
  supporter_key: string;
  display_name: string | null;
  is_anonymous: boolean;
  profile_image: string | null;
  message: string | null;
  cheer_count: number;
  latest_at: string;
};

const PREVIEW_LIMIT = 8;
const EXPANDED_LIMIT = 20;

function relativeDate(value: string, renderedAt: string) {
  const date = new Date(value);
  const reference = new Date(renderedAt);
  if (Number.isNaN(date.getTime()) || Number.isNaN(reference.getTime())) return "최근";
  const elapsed = reference.getTime() - date.getTime();
  if (elapsed >= 0 && elapsed < 60 * 60 * 1000) return "방금";
  if (elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / (60 * 60 * 1000))}시간 전`;
  if (elapsed >= 0 && elapsed < 2 * 24 * 60 * 60 * 1000) return "어제";
  if (elapsed >= 0 && elapsed < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / (24 * 60 * 60 * 1000))}일 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function SupporterRow({ supporter, renderedAt }: { supporter: GoalSupporter; renderedAt: string }) {
  const name = supporter.is_anonymous || !supporter.display_name ? "익명의 누군가" : supporter.display_name;
  const image = supporter.is_anonymous ? null : supporter.profile_image;
  return (
    <article className="goal-supporter-row" data-testid="goal-supporter-item">
      <span className="goal-supporter-avatar">
        {image
          ? <Image src={image} alt={`${name} 프로필`} fill sizes="44px" unoptimized />
          : <span aria-hidden="true">{supporter.is_anonymous ? "?" : Array.from(name)[0]}</span>}
      </span>
      <div>
        <strong>{name}</strong>
        {supporter.message && <ClampText className="goal-supporter-message">{supporter.message}</ClampText>}
      </div>
      <div className="goal-supporter-meta">
        <strong data-testid="goal-supporter-cheer-count">🍀 {supporter.cheer_count}번</strong>
        <small>{relativeDate(supporter.latest_at, renderedAt)}</small>
      </div>
    </article>
  );
}

export function GoalSupporterList({
  goalId,
  slug,
  supporters,
  totalCount,
  renderedAt,
  searchQuery = "",
}: {
  goalId: number;
  slug: string;
  supporters: GoalSupporter[];
  totalCount: number;
  renderedAt: string;
  searchQuery?: string;
}) {
  const isSearching = searchQuery.length > 0;
  const [searchOpen, setSearchOpen] = useState(isSearching);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyLink() {
    const value = `${window.location.origin}/g/${slug}`;
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (!document.execCommand("copy")) throw new Error("copy_failed");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
        setCopyFailed(true);
      } finally {
        textarea.remove();
      }
    }
  }

  if (totalCount === 0 && !isSearching) {
    return (
      <div className="goal-supporter-empty" data-testid="goal-supporter-empty">
        <span aria-hidden="true">🍀</span>
        <h3>아직 응원이 없어요</h3>
        <p>응원 링크를 친구에게 보내면 여기에 응원한 사람이 한 명씩 쌓여요.</p>
        <button type="button" onClick={() => void copyLink()}>{copied ? "응원 링크 복사됨" : "응원 링크 복사하기"}</button>
        {copyFailed && <p className="social-error" role="alert">링크를 복사하지 못했어요. 다시 시도해 주세요.</p>}
      </div>
    );
  }

  return (
    <div className="goal-supporter-card" data-testid="goal-supporter-card">
      <Collapsible
        policy={{ auxiliary: true, exceedsLimit: totalCount > PREVIEW_LIMIT, hasCollapsedContext: true }}
        controlsId="goal-supporter-list"
        toggleLabel="응원 목록"
        onExpandedChange={(expanded) => { if (!expanded) setSearchOpen(false); }}
      >
        {(expanded) => {
          const visible = supporters.slice(0, expanded ? EXPANDED_LIMIT : PREVIEW_LIMIT);
          return <>
            <div id="goal-supporter-list" data-testid="goal-supporter-list">
              {visible.map((supporter) => (
                <SupporterRow
                  key={supporter.supporter_key}
                  supporter={supporter}
                  renderedAt={renderedAt}
                />
              ))}
              {isSearching && visible.length === 0 && <p className="goal-supporter-search-empty" role="status">검색 결과가 없어요.</p>}
            </div>
            {!isSearching && !expanded && totalCount > PREVIEW_LIMIT && <p className="goal-supporter-summary">목록은 8명까지 보여요</p>}
            {isSearching && <Link href={`/me/goal/${goalId}`} className="goal-supporter-reset">전체 목록</Link>}
            {!isSearching && expanded && totalCount > EXPANDED_LIMIT && (
              <button type="button" className="goal-supporter-search-trigger" onClick={() => setSearchOpen((value) => !value)} aria-expanded={searchOpen} aria-controls="goal-supporter-search-form">
                지난 응원 찾기
              </button>
            )}
          </>;
        }}
      </Collapsible>
      {(searchOpen || isSearching) && totalCount > EXPANDED_LIMIT && (
        <form id="goal-supporter-search-form" action={`/me/goal/${goalId}`} method="get" role="search" className="goal-supporter-search-form">
          <label htmlFor="goal-supporter-search">지난 응원 찾기</label>
          <div><input id="goal-supporter-search" name="q" type="search" defaultValue={searchQuery} placeholder="응원자 이름이나 메시지 검색" minLength={1} maxLength={80} required /><button type="submit">찾기</button></div>
        </form>
      )}
    </div>
  );
}
