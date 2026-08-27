"use client";

import Link from "next/link";
import { useState } from "react";

export type ReceiverCheer = {
  id: number;
  display_name: string | null;
  is_anonymous: boolean;
  message: string | null;
  clover_amount: number;
  created_at: string;
};

const PREVIEW_LIMIT = 8;
const EXPANDED_LIMIT = 20;

function CheerItem({
  cheer,
  ordinal,
}: {
  cheer: ReceiverCheer;
  ordinal: number;
}) {
  const name =
    cheer.is_anonymous || !cheer.display_name
      ? "익명의 누군가"
      : cheer.display_name;
  const initial =
    cheer.is_anonymous || !cheer.display_name ? "?" : cheer.display_name[0];

  return (
    <div
      className="flex items-start gap-3 border-b border-border py-3"
      data-testid="cheer-item"
    >
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          cheer.is_anonymous || !cheer.display_name
            ? "bg-muted text-[var(--faint)]"
            : "bg-accent text-accent-foreground"
        }`}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--text-input-label)]! font-bold leading-[normal] text-foreground">
          {name}
        </p>
        {cheer.message && (
          <p
            className="mt-1 truncate text-[length:var(--text-label-small)]! leading-[normal] text-muted-foreground"
            title={cheer.message}
          >
            {cheer.message}
          </p>
        )}
      </div>
      <div
        className="flex min-w-14 shrink-0 flex-col items-end gap-0 text-right"
        role="group"
        aria-label={`클로버 ${cheer.clover_amount}개, ${ordinal}번째 응원, 나만 보임`}
      >
        <span
          className="text-[length:var(--text-label-small)]! font-bold leading-[normal] text-accent-foreground"
          data-testid="cheer-item-amount"
          aria-hidden="true"
        >
          🍀 {cheer.clover_amount}
        </span>
        <span
          className="text-[length:var(--text-meta-micro)]! leading-[normal] text-muted-foreground"
          data-testid="cheer-item-ordinal"
          aria-hidden="true"
        >
          {ordinal}번째
        </span>
      </div>
    </div>
  );
}

type CheerListProps = {
  cheers: ReceiverCheer[];
  totalCount: number;
  searchQuery?: string;
};

export function CheerList({
  cheers,
  totalCount,
  searchQuery = "",
}: CheerListProps) {
  const isSearching = searchQuery.length > 0;
  const [expanded, setExpanded] = useState(isSearching);
  const [searchOpen, setSearchOpen] = useState(isSearching);
  const visibleLimit = expanded ? EXPANDED_LIMIT : PREVIEW_LIMIT;
  const visibleCheers = cheers.slice(0, visibleLimit);
  const hiddenCount = Math.max(totalCount - visibleCheers.length, 0);

  if (totalCount === 0) return null;

  return (
    <section className="mb-4" aria-labelledby="receiver-cheer-list-title">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2
          id="receiver-cheer-list-title"
          className="text-[length:var(--text-label-small)]! font-semibold text-muted-foreground"
        >
          응원한 사람
        </h2>
        <span className="text-[length:var(--text-meta-micro)]! text-muted-foreground">
          {totalCount}명
        </span>
      </div>
      <div
        className="overflow-hidden rounded-md border border-border bg-card"
        data-testid="receiver-cheer-card"
      >
        <div
          id="receiver-cheer-list"
          className="px-4"
          data-testid="receiver-cheer-list"
          aria-live="polite"
        >
          {visibleCheers.map((cheer, index) => (
            <CheerItem key={cheer.id} cheer={cheer} ordinal={index + 1} />
          ))}
          {isSearching && visibleCheers.length === 0 && (
            <p
              className="py-8 text-center text-[length:var(--text-label-small)]! text-muted-foreground"
              role="status"
            >
              검색 결과가 없어요.
            </p>
          )}
        </div>
        {totalCount > PREVIEW_LIMIT && (
          <div
            className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"
            data-testid="cheer-overflow-summary"
          >
            {isSearching ? (
              <span className="text-[length:var(--text-label-small)]! text-muted-foreground">
                {visibleCheers.length}개 찾았어요
              </span>
            ) : expanded ? (
              <button
                type="button"
                className="text-left text-[length:var(--text-label-small)]! text-muted-foreground"
                aria-label="응원 목록 접기"
                aria-expanded="true"
                aria-controls="receiver-cheer-list"
                onClick={() => {
                  setExpanded(false);
                  setSearchOpen(false);
                }}
              >
                전체 목록도 {EXPANDED_LIMIT}개까지 보여줘요
              </button>
            ) : (
              <span className="text-[length:var(--text-label-small)]! text-muted-foreground">
                미니 목록은 {PREVIEW_LIMIT}개까지 보여줘요
              </span>
            )}

            {isSearching ? (
              <Link
                href="/me"
                className="shrink-0 text-[length:var(--text-label-small)]! font-bold text-accent-foreground"
              >
                전체 목록
              </Link>
            ) : expanded && totalCount > EXPANDED_LIMIT ? (
              <button
                type="button"
                className="shrink-0 text-[length:var(--text-label-small)]! font-bold text-accent-foreground"
                aria-expanded={searchOpen}
                aria-controls="receiver-cheer-search-form"
                onClick={() => setSearchOpen((value) => !value)}
                data-testid="cheer-search-trigger"
              >
                {totalCount - EXPANDED_LIMIT}개는 검색으로 찾기
              </button>
            ) : !expanded ? (
              <button
                type="button"
                className="shrink-0 text-[length:var(--text-label-small)]! font-bold text-accent-foreground"
                aria-label="더 보기"
                aria-expanded="false"
                aria-controls="receiver-cheer-list"
                onClick={() => setExpanded(true)}
              >
                {hiddenCount}개 더 있음
              </button>
            ) : null}
          </div>
        )}
        {(searchOpen || isSearching) && totalCount > EXPANDED_LIMIT && (
          <form
            id="receiver-cheer-search-form"
            action="/me"
            method="get"
            className="border-t border-border bg-muted px-4 py-3"
            role="search"
          >
            <label
              htmlFor="receiver-cheer-search"
              className="mb-2 block text-[length:var(--text-label-small)]! font-semibold text-muted-foreground"
            >
              지난 응원 찾기
            </label>
            <div className="flex gap-2">
              <input
                id="receiver-cheer-search"
                name="q"
                type="search"
                defaultValue={searchQuery}
                placeholder="응원자 이름이나 메시지 검색"
                minLength={1}
                maxLength={80}
                required
                className="h-12 min-w-0 flex-1 rounded-sm border border-border bg-card px-4 text-sm text-foreground outline-none placeholder:text-[var(--faint)] focus:border-primary focus:ring-2 focus:ring-accent"
                data-testid="cheer-search-input"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-sm bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                찾기
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
