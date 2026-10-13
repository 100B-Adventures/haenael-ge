"use client";
// NotificationBadge — 인앱 알림 배지 (N1: notification 읽기)
// DESIGN.md §5: "은은한" — 숫자 배지 최소화, 클릭 시 목록 표시.
// notification 테이블 RLS: authenticated 본인 행만 SELECT.
// 카카오 알림톡은 백그라운드에서 발송, 인앱은 여기서 표시.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type NotificationRow = Database["public"]["Tables"]["notification"]["Row"];

interface NotificationBadgeProps {
  /** 사용하지 않을 때도 언마운트 없이 유지 (홈 헤더 등) */
  className?: string;
}

export function NotificationBadge({ className }: NotificationBadgeProps) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // 알림 목록 조회 (N1)
  async function fetchNotifications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }

  // 읽음 처리
  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notification")
      .update({ read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  useEffect(() => {
    fetchNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 알림 타입 → 한글 텍스트
  function notifText(n: NotificationRow): string {
    if (n.type === "CHEER_RECEIVED") {
      return "조용한 응원이 도착했어요 🍀";
    }
    return "새 알림이 있어요";
  }

  // 알림 타입 → 라우팅 대상. notification 테이블엔 target/link 컬럼이 없고(스키마
  // 20260705163137_init_schema.sql notification 정의 참조) 현재 유일 타입인
  // CHEER_RECEIVED는 받는사람(goal 소유자) 전용 알림 — 소유자의 활성 목표는 항상 1개
  // (goal_one_active_per_member 제약)라 goalId 없이도 /me로 결정 라우팅 가능하다.
  // 타입이 늘면 이 스위치에 분기만 추가하면 됨.
  function notifTarget(n: NotificationRow): string {
    switch (n.type) {
      case "CHEER_RECEIVED":
        return "/me";
      default:
        return "/me";
    }
  }

  // 알림 클릭: 해당 항목만 읽음 처리 후 대상 링크로 이동, 드롭다운 닫기.
  async function handleNotificationClick(n: NotificationRow) {
    if (!n.read) {
      await supabase.from("notification").update({ read: true }).eq("id", n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
      );
    }
    setOpen(false);
    router.push(notifTarget(n));
  }

  // 발송 채널 뱃지
  function channelBadge(n: NotificationRow): string {
    if (n.channel === "ALIMTALK") {
      return n.alimtalk_status === "SENT" ? "알림톡 ✓" : "앱 알림";
    }
    return "앱 알림";
  }

  if (loading) {
    return (
      <div
        className={`relative inline-flex items-center justify-center ${className ?? ""}`}
        data-testid="notification-badge-loading"
        aria-busy="true"
      >
        <span
          className="text-[22px] [color:#B5B0A6]!"
          aria-label="알림 로딩 중"
        >
          🔔
        </span>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full transition-transform active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          color: unreadCount > 0 ? "var(--accent-foreground)" : "#B5B0A6",
        }}
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) markAllRead();
        }}
        aria-label={`알림 ${unreadCount > 0 ? `${unreadCount}개 새 알림` : "없음"}`}
        data-testid="notification-badge-button"
      >
        <span className="text-[22px]" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[13px] font-bold leading-none text-white [background-color:var(--accent-foreground)]!"
            aria-hidden="true"
            data-testid="notification-unread-count"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          {/* 드롭다운 */}
          <div
            className="absolute right-0 z-50 mt-2 w-72 rounded-2xl shadow-xl [background-color:var(--background)]! [border:1px_solid_#E4E0D8]!"
            role="dialog"
            aria-label="알림 목록"
            data-testid="notification-dropdown"
          >
            <div className="flex items-center justify-between px-4 py-3 [border-bottom:1px_solid_#E4E0D8]!">
              <span className="text-[13px] font-semibold [color:var(--foreground)]!">
                알림
              </span>
              <button
                type="button"
                className="min-h-11 min-w-11 text-[13px] text-muted-foreground"
                onClick={() => setOpen(false)}
                aria-label="알림 닫기"
              >
                닫기
              </button>
            </div>

            {notifications.length === 0 ? (
              <div
                className="px-4 py-8 text-center text-[13px] text-muted-foreground"
                data-testid="notification-empty"
              >
                아직 알림이 없어요
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto" role="list">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-start gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset [border-bottom:1px_solid_#F0EDE8]!"
                    style={{ background: n.read ? "transparent" : "#F2F8F4" }}
                    data-testid="notification-item"
                    onClick={() => handleNotificationClick(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNotificationClick(n);
                      }
                    }}
                  >
                    <span className="mt-0.5 text-[18px]" aria-hidden="true">
                      🍀
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug [color:var(--foreground)]!">
                        {notifText(n)}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {channelBadge(n)} ·{" "}
                        {new Date(n.created_at).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <span
                        className="mt-1 h-2 w-2 flex-shrink-0 rounded-full [background-color:var(--accent-foreground)]!"
                        aria-label="읽지 않음"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
