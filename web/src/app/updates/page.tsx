import type { Metadata } from "next";
import Link from "next/link";
import { publicReleaseNotes } from "@/lib/release-notes";

export const metadata: Metadata = {
  title: "업데이트 — 해낼게",
  description: "해낼게의 최근 업데이트와 새로 달라진 점을 확인하세요.",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

export default function UpdatesPage() {
  return (
    <main className="updates-page" data-testid="updates-page">
      <header className="updates-page-header">
        <Link href="/" aria-label="홈으로 돌아가기">‹</Link>
        <strong>업데이트</strong>
        <span aria-hidden="true" />
      </header>

      <section className="updates-page-intro" aria-labelledby="updates-title">
        <p>해낼게의 변화</p>
        <h1 id="updates-title">새로 달라진 점을 확인하세요</h1>
        <span>최근 업데이트 3개를 쉬운 말로 정리했어요.</span>
      </section>

      <ol className="updates-list" aria-label="최근 업데이트">
        {publicReleaseNotes.map((release, index) => (
          <li className="updates-card" key={release.version}>
            <div className="updates-card-meta">
              <span>버전 {release.version}</span>
              {index === 0 ? <strong>최신</strong> : null}
            </div>
            <h2>{release.title}</h2>
            <p>{release.summary}</p>
            <time dateTime={release.date}>
              {DATE_FORMATTER.format(new Date(`${release.date}T00:00:00+09:00`))}
            </time>
          </li>
        ))}
      </ol>
    </main>
  );
}
