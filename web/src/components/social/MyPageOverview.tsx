"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  BellRing,
  ChevronRight,
  HandHeart,
  Megaphone,
  Pencil,
} from "lucide-react";
import { updateMemberPreferencesAction } from "@/app/(receiver)/social-actions";
import { createClient } from "@/lib/supabase/client";
import { ClampText } from "@/components/common/ClampText";
import { LegalLinkList } from "@/components/common/LegalFooter";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AccountWithdrawalButton } from "@/components/social/AccountWithdrawalButton";
import type { MySocialDashboard } from "@/lib/social/contracts";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-mypageoverview";

type Preferences = {
  notifyCheer: boolean;
  notifyMarketing: boolean;
};

const PROFILE_PRESETS = [
  "/images/social-viral/seoyeon.png",
  "/images/social-viral/dogyeong.png",
  "/images/social-viral/jimin.png",
  "/images/social-viral/supporter.png",
] as const;
const MAX_PROFILE_BYTES = 5 * 1024 * 1024;

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

export function MyPageOverview({
  dashboard,
  receivedCheers = [],
  initialPreferences,
}: {
  dashboard: MySocialDashboard;
  receivedCheers?: Array<{
    id: number;
    displayName: string | null;
    profileImage?: string | null;
    message: string | null;
    createdAt: string;
    isAnonymous?: boolean;
  }>;
  initialPreferences: Preferences;
}) {
  const [cheerTab, setCheerTab] = useState<"received" | "sent">("received");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const initialNickname = dashboard.profile.nickname?.trim() || "해낼게 사용자";
  const [nickname, setNickname] = useState(initialNickname);
  const [draftNickname, setDraftNickname] = useState(initialNickname);
  const [profileImage, setProfileImage] = useState(dashboard.profile.profile_image);
  const initialBio = (dashboard.profile.bio ?? "").trim();
  const [bio, setBio] = useState(initialBio);
  const [draftBio, setDraftBio] = useState(initialBio);
  const [editingNickname, setEditingNickname] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const activeGoalCount = dashboard.goals.filter((goal) =>
    goal.status === "ACTIVE"
  ).length;
  const initial = Array.from(nickname)[0] ?? "해";

  async function saveProfile(next: { nickname: string; bio: string; profileImage: string | null }) {
    const supabase = createClient();
    return supabase.functions.invoke("profile-update", {
      body: {
        action: "save",
        nickname: next.nickname,
        bio: next.bio || null,
        profile_image: next.profileImage,
      },
    });
  }

  async function saveNickname() {
    const nextNickname = draftNickname.trim();
    if (!nextNickname) {
      setProfileError("이름을 입력해 주세요.");
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    try {
      const { error } = await saveProfile({ nickname: nextNickname, bio, profileImage });
      if (error) throw error;
      setNickname(nextNickname);
      setDraftNickname(nextNickname);
      setEditingNickname(false);
    } catch {
      setProfileError("이름을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveBio() {
    const nextBio = draftBio.trim();
    setProfileSaving(true);
    setProfileError(null);
    try {
      const { error } = await saveProfile({ nickname, bio: nextBio, profileImage });
      if (error) throw error;
      setBio(nextBio);
      setDraftBio(nextBio);
      setEditingBio(false);
    } catch {
      setProfileError("한 줄 소개를 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveProfileImage(nextImage: string) {
    if (!PROFILE_PRESETS.includes(nextImage as typeof PROFILE_PRESETS[number])) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const { error } = await saveProfile({ nickname, bio, profileImage: nextImage });
      if (error) throw error;
      setProfileImage(nextImage);
      setAvatarPickerOpen(false);
    } catch {
      setProfileError("프로필 사진을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadProfileImage(file: File) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size < 1 || file.size > MAX_PROFILE_BYTES) {
      setProfileError("JPG, PNG, WEBP 형식의 5MB 이하 사진을 선택해 주세요.");
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    try {
      const contentSha256 = await sha256Hex(file);
      const supabase = createClient();
      const { data: signed, error: signError } = await supabase.functions.invoke("profile-update", {
        body: { action: "sign_avatar", file_name: file.name, mime_type: file.type, byte_size: file.size, content_sha256: contentSha256 },
      });
      if (signError || !signed?.upload_url || !signed?.asset_id) {
        setProfileError("사진 업로드를 시작하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      const response = await fetch(signed.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "false" },
        body: file,
      });
      if (!response.ok) {
        setProfileError("사진 전송이 끊겼어요. 다시 시도해 주세요.");
        return;
      }
      const { data: finalized, error: finalizeError } = await supabase.functions.invoke("profile-update", {
        body: { action: "finalize_avatar", asset_id: signed.asset_id, content_sha256: contentSha256 },
      });
      if (finalizeError || !finalized?.profile_image) {
        setProfileError("프로필 사진을 저장하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setProfileImage(finalized.profile_image);
      setAvatarPickerOpen(false);
    } catch {
      setProfileError("프로필 사진을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setProfileSaving(false);
    }
  }

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
        <button
          type="button"
          className="my-profile-avatar-button"
          aria-label="프로필 사진 바꾸기"
          aria-expanded={avatarPickerOpen}
          onClick={() => setAvatarPickerOpen((value) => !value)}
        >
          <span className="my-profile-avatar">
          {profileImage
            ? (
              <Image
                src={profileImage}
                alt={`${nickname} 프로필`}
                fill
                sizes="52px"
                className="object-cover"
                unoptimized
              />
            )
            : <span aria-hidden="true">{initial}</span>}
          </span>
          <span className="my-profile-edit-badge" aria-hidden="true"><Pencil /></span>
        </button>
        <div className={`my-profile-copy min-w-0 flex-1 ${!editingNickname && !editingBio ? "is-display" : ""}`}>
          {editingNickname
            ? (
              <div className="my-profile-name-editor">
                <label className="sr-only" htmlFor="my-profile-nickname">{PRODUCT_COPY.TEXT_001}</label>
                <input
                  id="my-profile-nickname"
                  value={draftNickname}
                  disabled={profileSaving}
                  onChange={(event) => setDraftNickname(event.target.value)}
                  autoComplete="nickname"
                />
                <button type="button" disabled={profileSaving} onClick={() => void saveNickname()}>
                  {profileSaving ? PRODUCT_COPY.TEXT_002 : PRODUCT_COPY.TEXT_003}
                </button>
                <button type="button" disabled={profileSaving} onClick={() => {
                  setDraftNickname(nickname);
                  setEditingNickname(false);
                  setProfileError(null);
                }}>{PRODUCT_COPY.TEXT_004}</button>
              </div>
            )
            : (
              <button type="button" className="my-profile-name-button" onClick={() => setEditingNickname(true)}>
                <span>{nickname}</span><Pencil aria-hidden="true" />
              </button>
            )}
          {editingBio
            ? (
              <div className="my-profile-bio-editor">
                <label className="sr-only" htmlFor="my-profile-bio">{PRODUCT_COPY.TEXT_005}</label>
                <textarea id="my-profile-bio" value={draftBio} maxLength={80} disabled={profileSaving} onChange={(event) => setDraftBio(event.target.value)} />
                <div><button type="button" disabled={profileSaving} onClick={() => void saveBio()}>{PRODUCT_COPY.TEXT_006}</button><button type="button" disabled={profileSaving} onClick={() => { setDraftBio(bio); setEditingBio(false); setProfileError(null); }}>{PRODUCT_COPY.TEXT_007}</button></div>
              </div>
            )
            : (
              <div className="my-profile-bio-row">
                <span>{bio || PRODUCT_COPY.TEXT_008}</span>
                {!editingNickname && (
                  <button
                    type="button"
                    className="my-profile-bio-button"
                    aria-label={`${bio || PRODUCT_COPY.TEXT_009} 한 줄 소개 편집`}
                    onClick={() => setEditingBio(true)}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          <small>{PRODUCT_COPY.TEXT_010}{dashboard.friend_count}{PRODUCT_COPY.TEXT_011}{activeGoalCount}{PRODUCT_COPY.TEXT_012}</small>
        </div>
      </section>
      {avatarPickerOpen && (
        <section className="my-profile-avatar-picker" aria-label={PRODUCT_COPY.TEXT_013}>
          <div>
            {PROFILE_PRESETS.map((src, index) => (
              <button
                type="button"
                key={src}
                aria-label={`프로필 사진 ${index + 1}`}
                aria-pressed={profileImage === src}
                disabled={profileSaving}
                onClick={() => void saveProfileImage(src)}
              >
                <Image src={src} alt="" width={48} height={48} />
              </button>
            ))}
            <button type="button" className="my-profile-upload-button" disabled={profileSaving} onClick={() => profileFileRef.current?.click()}>
              <span aria-hidden="true">＋</span><small>{PRODUCT_COPY.TEXT_014}</small>
            </button>
          </div>
          <input ref={profileFileRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void uploadProfileImage(file); }} />
          <p>{PRODUCT_COPY.TEXT_015}</p>
        </section>
      )}
      {profileError && <p className="social-error" role="alert">{profileError}</p>}

      <section aria-labelledby="my-activity-heading">
        <h2 className="my-section-title" id="my-activity-heading">{PRODUCT_COPY.TEXT_016}</h2>
        <div className="my-menu-card">
          <Link href="/me/achievements" className="my-menu-row">
            <span className="my-menu-icon" aria-hidden="true">🏆</span>
            <span>
              <strong>{PRODUCT_COPY.TEXT_017}</strong>
              <small>{PRODUCT_COPY.TEXT_018}{dashboard.achievements.completed_goal_count}{PRODUCT_COPY.TEXT_019}{dashboard.achievements.received_cheer_count}{PRODUCT_COPY.TEXT_020}{dashboard.achievements.connected_friend_count}{PRODUCT_COPY.TEXT_021}</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </Link>
          <Link href="/cashout/history" className="my-menu-row">
            <span className="my-menu-icon" aria-hidden="true">🧾</span>
            <span>
              <strong>{PRODUCT_COPY.TEXT_022}</strong>
              <small>{PRODUCT_COPY.TEXT_023}</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="my-cheers-heading">
        <h2 className="my-section-title" id="my-cheers-heading">{PRODUCT_COPY.TEXT_024}</h2>
        <div className="my-cheer-tabs" role="tablist" aria-label="응원 내역 구분">
          <button
            type="button"
            role="tab"
            aria-selected={cheerTab === "received"}
            className={cheerTab === "received" ? "is-active" : undefined}
            onClick={() => setCheerTab("received")}
          >{PRODUCT_COPY.TEXT_025}</button>
          <button
            type="button"
            role="tab"
            aria-selected={cheerTab === "sent"}
            className={cheerTab === "sent" ? "is-active" : undefined}
            onClick={() => setCheerTab("sent")}
          >{PRODUCT_COPY.TEXT_026}</button>
        </div>
        <div className="my-cheer-list" role="tabpanel">
          {cheerTab === "received"
            ? receivedCheers.length > 0
              ? receivedCheers.slice(0, 3).map((cheer) => {
                  const name = cheer.displayName?.trim() || PRODUCT_COPY.TEXT_027;
                  return (
                    <article key={cheer.id}>
                      <span className="my-cheer-avatar">
                        {cheer.profileImage
                          ? <Image src={cheer.profileImage} alt={`${name} 프로필`} fill sizes="44px" unoptimized />
                          : <span aria-hidden="true">{cheer.isAnonymous ? "?" : Array.from(name)[0]}</span>}
                      </span>
                      <div><strong>{name}</strong><ClampText className="my-cheer-message">{`💬 ${cheer.message || PRODUCT_COPY.TEXT_028}`}</ClampText></div>
                      <div className="my-cheer-status">
                        <strong>{PRODUCT_COPY.TEXT_029}</strong>
                        <small>{formatCheerDate(cheer.createdAt)}</small>
                      </div>
                    </article>
                  );
                })
              : (
                <div className="my-cheer-empty" data-testid="received-cheers-empty">
                  <span className="my-menu-icon"><HandHeart aria-hidden="true" /></span>
                  <div>
                    <strong>{PRODUCT_COPY.TEXT_030}</strong>
                    <p>{PRODUCT_COPY.TEXT_031}</p>
                    {dashboard.goals.length > 0
                      ? <Link href="/me">{PRODUCT_COPY.TEXT_032}</Link>
                      : <Link href="/onboarding">{PRODUCT_COPY.TEXT_033}</Link>}
                  </div>
                </div>
              )
            : (
              dashboard.sent_cheers.length > 0
                ? dashboard.sent_cheers.slice(0, 3).map((cheer) => {
                    const name = cheer.target_name?.trim() || PRODUCT_COPY.TEXT_034;
                    return (
                      <article key={cheer.id}>
                        <span className="my-cheer-avatar">
                          {cheer.profile_image
                            ? <Image src={cheer.profile_image} alt={`${name} 프로필`} fill sizes="44px" unoptimized />
                            : <span aria-hidden="true">{Array.from(name)[0]}</span>}
                        </span>
                        <div><strong>{name}{PRODUCT_COPY.TEXT_035}</strong><ClampText className="my-cheer-message">{`💬 ${cheer.message || PRODUCT_COPY.TEXT_036}`}</ClampText></div>
                        <div className="my-cheer-status"><strong>{PRODUCT_COPY.TEXT_037}</strong><small>{formatCheerDate(cheer.created_at)}</small></div>
                      </article>
                    );
                  })
                : (
                  <div className="my-cheer-empty" data-testid="sent-cheers-empty">
                    <span className="my-menu-icon"><HandHeart aria-hidden="true" /></span>
                    <div><strong>{PRODUCT_COPY.TEXT_038}</strong><p>{PRODUCT_COPY.TEXT_039}</p><Link href="/friends">{PRODUCT_COPY.TEXT_040}</Link></div>
                  </div>
                )
            )}
        </div>
      </section>

      <section aria-labelledby="my-settings-heading">
        <h2 className="my-section-title" id="my-settings-heading">{PRODUCT_COPY.TEXT_041}</h2>
        <div className="my-menu-card my-settings-group">
          <PreferenceRow
            icon={<BellRing aria-hidden="true" />}
            title={PRODUCT_COPY.TEXT_049}
            description={PRODUCT_COPY.TEXT_045}
            checked={preferences.notifyCheer}
            disabled={saving}
            onChange={(value) => void setPreference("notifyCheer", value)}
          />
          <PreferenceRow
            icon={<Megaphone aria-hidden="true" />}
            title={PRODUCT_COPY.TEXT_050}
            description={PRODUCT_COPY.TEXT_046}
            checked={preferences.notifyMarketing}
            disabled={saving}
            onChange={(value) => void setPreference("notifyMarketing", value)}
          />
        </div>
        {saveError && <p className="social-error" role="alert">{PRODUCT_COPY.TEXT_042}</p>}
        <Link href="/how" className="my-guide-link">{PRODUCT_COPY.TEXT_043}</Link>
      </section>

      <section aria-labelledby="my-account-heading">
        <h2 className="my-section-title" id="my-account-heading">{PRODUCT_COPY.TEXT_044}</h2>
        <div className="my-account-card">
          <LegalLinkList />
          <LogoutButton />
          <AccountWithdrawalButton />
        </div>
      </section>

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
