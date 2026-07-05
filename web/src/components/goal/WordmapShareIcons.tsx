"use client";

// components/goal/WordmapShareIcons.tsx — 워드맵 공유 아이콘 바 (슬라이스 #9)
// 아이콘 3종: 이미지 저장(primary) / 인스타 공유 / 링크 복사
// DESIGN.md: 텍스트 버튼 X, 아이콘만. §1 Discreet.
// S1: 공유 시 share_event INSERT (확산 analytics).

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface WordmapShareIconsProps {
  goalId: number;
  goalSlug: string;
  goalTitle: string;
}

// ─── SVG → PNG 변환 (Canvas API) ─────────────────────────────────────────────

async function svgUrlToPngBlob(svgUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(svgUrl);
    if (!res.ok) return null;
    const svgText = await res.text();

    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(svgBlob);

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#F4EFE6";
    ctx.fillRect(0, 0, 800, 500);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 800, 500);
        resolve();
      };
      img.onerror = () => reject(new Error("SVG image load failed"));
      img.src = objectUrl;
    });

    URL.revokeObjectURL(objectUrl);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png", 0.95);
    });
  } catch {
    return null;
  }
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function WordmapShareIcons({
  goalId,
  goalSlug,
  goalTitle,
}: WordmapShareIconsProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState<"image" | "instagram" | null>(null);

  const supabase = createClient();

  // ── 공유 이미지 URL 획득 (EF wordmap-render 호출) ─────────────────────────
  const fetchImageUrl = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wordmap-render`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ goal_id: goalId }),
        },
      );
      if (!res.ok) return null;
      const { imageUrl } = await res.json();
      return imageUrl as string;
    } catch {
      return null;
    }
  }, [goalId, supabase]);

  // ── share_event INSERT (S1, 확산 analytics) ───────────────────────────────
  const recordShare = useCallback(
    async (channel: "IMAGE" | "STORY" | "LINK") => {
      await supabase
        .from("share_event")
        .insert({ goal_id: goalId, channel });
    },
    [goalId, supabase],
  );

  // ── 토스트 표시 ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, []);

  // ── 이미지 저장 ───────────────────────────────────────────────────────────
  const handleSaveImage = useCallback(async () => {
    setLoading("image");
    try {
      const imageUrl = await fetchImageUrl();
      if (!imageUrl) {
        showToast("이미지 생성에 실패했어요.");
        return;
      }

      const pngBlob = await svgUrlToPngBlob(imageUrl);
      if (!pngBlob) {
        showToast("이미지 변환에 실패했어요.");
        return;
      }

      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wordmap-${goalSlug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await recordShare("IMAGE");
      showToast("이미지를 저장했어요. 스토리에 올려보세요.");
    } finally {
      setLoading(null);
    }
  }, [fetchImageUrl, goalSlug, recordShare, showToast]);

  // ── 인스타 공유 ───────────────────────────────────────────────────────────
  const handleInstagram = useCallback(async () => {
    setLoading("instagram");
    try {
      const imageUrl = await fetchImageUrl();
      let shared = false;

      if (imageUrl) {
        const pngBlob = await svgUrlToPngBlob(imageUrl);
        if (pngBlob && typeof navigator.canShare === "function") {
          const file = new File([pngBlob], "wordmap.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: goalTitle,
                text: `${window.location.origin}/g/${goalSlug}`,
              });
              shared = true;
            } catch {
              // 사용자 취소 등 무시
            }
          }
        }

        if (!shared && pngBlob) {
          // 폴백: 이미지 다운로드 후 안내
          const url = URL.createObjectURL(pngBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `wordmap-${goalSlug}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast(
            "이미지를 저장했어요. 인스타 스토리에 올리고 링크 스티커를 추가해보세요.",
          );
        }
      } else {
        showToast("이미지 생성에 실패했어요.");
      }

      await recordShare("STORY");
    } finally {
      setLoading(null);
    }
  }, [fetchImageUrl, goalSlug, goalTitle, recordShare, showToast]);

  // ── 링크 복사 ─────────────────────────────────────────────────────────────
  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/g/${goalSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      await recordShare("LINK");
      showToast("링크가 복사됐어요.");
    } catch {
      showToast("복사에 실패했어요. URL을 직접 복사해주세요.");
    }
  }, [goalSlug, recordShare, showToast]);

  return (
    <div className="relative" data-testid="wordmap-share-icons">
      {/* 아이콘 바 */}
      <div className="flex justify-center gap-5 items-end">
        {/* 이미지 저장 — primary (clover green) */}
        <button
          type="button"
          onClick={handleSaveImage}
          disabled={loading === "image"}
          aria-label="이미지 저장"
          data-testid="share-save-image"
          className="flex flex-col items-center gap-[6px] cursor-pointer disabled:opacity-60"
        >
          <div
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
            style={{ background: "#1B8A4F" }}
          >
            {loading === "image" ? (
              <SpinnerIcon />
            ) : (
              <DownloadIcon />
            )}
          </div>
          <span className="text-[10.5px] font-semibold" style={{ color: "#6F6A60" }}>
            이미지 저장
          </span>
        </button>

        {/* 인스타 공유 */}
        <button
          type="button"
          onClick={handleInstagram}
          disabled={loading === "instagram"}
          aria-label="인스타 공유"
          data-testid="share-instagram"
          className="flex flex-col items-center gap-[6px] cursor-pointer disabled:opacity-60"
        >
          <div
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center border"
            style={{ background: "#fff", borderColor: "#E8E4DC" }}
          >
            {loading === "instagram" ? <SpinnerIcon dark /> : <InstagramIcon />}
          </div>
          <span className="text-[10.5px] font-semibold" style={{ color: "#6F6A60" }}>
            인스타 공유
          </span>
        </button>

        {/* 링크 복사 */}
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label="링크 복사"
          data-testid="share-copy-link"
          className="flex flex-col items-center gap-[6px] cursor-pointer"
        >
          <div
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center border"
            style={{ background: "#fff", borderColor: "#E8E4DC" }}
          >
            <LinkIcon />
          </div>
          <span className="text-[10.5px] font-semibold" style={{ color: "#6F6A60" }}>
            링크 복사
          </span>
        </button>
      </div>

      {/* 토스트 (이미지 저장 완료·링크 복사 완료 등) */}
      {toast && (
        <div
          className="absolute left-0 right-0 -top-14 flex items-center gap-3 rounded-[12px] px-4 py-3"
          style={{ background: "#16140F", color: "#fff" }}
          role="status"
          aria-live="polite"
          data-testid="share-toast"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
            style={{ background: "#1F9E5A" }}
          >
            ✓
          </div>
          <span className="text-[12px] leading-snug">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ─── 아이콘 컴포넌트 ──────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#16140F"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#16140F" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#16140F"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

function SpinnerIcon({ dark }: { dark?: boolean }) {
  const stroke = dark ? "#16140F" : "#fff";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity={0.3} />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}
