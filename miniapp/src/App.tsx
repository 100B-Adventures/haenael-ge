import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { Button } from "./components/Button";
import { CoverPicker } from "./components/CoverPicker";
import { GoalList } from "./components/GoalCard";
import { PageShell } from "./components/PageShell";
import type { AppGateway, CoverPreset, GoalSummary, MemberPreferences, SessionMember } from "./domain";
import { createGateway } from "./gateway";

interface PageProps {
  gateway: AppGateway;
  navigate: (path: string) => void;
}

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function HomePage({ navigate }: PageProps) {
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState<CoverPreset>("c1");
  const canContinue = title.trim().length >= 3;

  return (
    <PageShell activePath="/" onNavigate={navigate}>
      <section className="hero">
        <div className={`hero__visual cover-${cover}`} aria-hidden="true"><span>♣</span></div>
        <p className="eyebrow">오늘의 작은 선언</p>
        <h1>이번에는 무엇을<br />해내고 싶나요?</h1>
        <p className="hero__copy">완벽한 계획보다, 친구에게 보여 줄 한 문장이 먼저예요.</p>
      </section>
      <section className="form-card" aria-label="목표 시작하기">
        <label htmlFor="goal-title">내가 해낼 일</label>
        <textarea id="goal-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 이번 달엔 주 3회 달릴게" maxLength={60} />
        <div className="character-count">{title.length}/60</div>
        <CoverPicker value={cover} onChange={setCover} />
        <Button fullWidth disabled={!canContinue} onClick={() => navigate("/login?next=/friends")}>토스로 시작하기</Button>
        <p className="privacy-note">로그인 전에는 목표를 서버에 저장하지 않아요.</p>
      </section>
    </PageShell>
  );
}

function LoginPage({ gateway, navigate }: PageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const member: SessionMember = await gateway.signInWithToss();
      sessionStorage.setItem("haenael-member", member.memberId);
      const next = new URLSearchParams(window.location.search).get("next");
      navigate(next?.startsWith("/") ? next : "/friends");
    } catch (cause) {
      setError(errorMessage(cause, "토스 로그인을 마치지 못했어요."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell withTabs={false} onNavigate={navigate}>
      <section className="login-page">
        <div className="login-symbol" aria-hidden="true">♣</div>
        <p className="eyebrow">해낼게</p>
        <h1>친구와 같이하면<br />조금 더 오래가요</h1>
        <p>토스 계정으로 안전하게 시작하고, 친구의 목표를 응원해 보세요.</p>
        {error ? <div className="inline-error" role="alert">{error}</div> : null}
        <Button fullWidth loading={loading} onClick={login} data-testid="toss-login-button">토스로 계속하기</Button>
        <Button fullWidth variant="quiet" onClick={() => navigate("/")}>돌아가기</Button>
        <p className="privacy-note">일회성 인증 코드는 서버에서 교환하며 화면에 저장하지 않아요.</p>
      </section>
    </PageShell>
  );
}

function FriendsPage({ gateway, navigate }: PageProps) {
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    gateway.listFriendGoals()
      .then((groups) => { if (alive) setGoals(groups.flatMap((group) => group.goals)); })
      .catch((cause: unknown) => { if (alive) setError(errorMessage(cause, "친구 목표를 불러오지 못했어요.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [gateway]);

  return (
    <PageShell activePath="/friends" title="친구들이 해내는 중" subtitle="금액이나 순위 없이, 서로의 과정만 보여요." onNavigate={navigate}>
      <GoalList goals={goals} loading={loading} error={error} onOpen={(goal) => navigate(`/goals/${goal.slug}`)} />
      <Button variant="secondary" fullWidth onClick={() => navigate("/invite")}>친구 한 명 더 초대하기</Button>
    </PageShell>
  );
}

function GoalPage({ gateway, navigate }: PageProps) {
  const slug = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) ?? "");
  const [goal, setGoal] = useState<GoalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    gateway.getFriendGoal(slug)
      .then((value) => { if (alive) setGoal(value); })
      .catch((cause: unknown) => { if (alive) setError(errorMessage(cause, "목표를 불러오지 못했어요.")); });
    return () => { alive = false; };
  }, [gateway, slug]);

  return (
    <PageShell activePath="/friends" withTabs={false} onNavigate={navigate}>
      {error ? <div className="state-card state-card--error" role="alert">{error}</div> : null}
      {!goal && !error ? <div className="state-card" role="status">목표를 불러오는 중이에요.</div> : null}
      {goal ? (
        <article className="goal-detail" data-testid="support-flow">
          <div className={`goal-detail__cover cover-${goal.coverPreset}`}>
            {goal.coverUrl ? <img src={goal.coverUrl} alt="" /> : <span aria-hidden="true">♣</span>}
          </div>
          <p className="eyebrow">{goal.ownerName}의 선언</p>
          <h1>{goal.title}</h1>
          <p className="goal-detail__message">“{goal.message}”</p>
          <div className="support-count"><strong>♣ {goal.cheerCount}</strong><span>명이 조용히 함께하고 있어요</span></div>
          <section className="word-cloud" aria-label="친구들이 남긴 응원 단어">
            <h2>친구들이 건넨 말</h2>
            <div>{goal.words.length > 0 ? goal.words.map((word) => <span key={word}>{word}</span>) : <p>첫 응원 단어를 기다리고 있어요.</p>}</div>
          </section>
          <Button fullWidth onClick={() => navigate("/login?next=/friends")}>나도 목표를 선언하고 함께하기</Button>
          <p className="privacy-note">공개 화면에는 응원 횟수와 메시지만 보여요.</p>
        </article>
      ) : null}
    </PageShell>
  );
}

function InvitePage({ gateway, navigate }: PageProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const shareInvite = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const invite = await gateway.createInvite(null);
      if (invite.token === "demo-invite") {
        setStatus("초대 링크를 만들었어요. 실제 토스 환경에서는 공유 창이 열려요.");
      } else {
        const { Share } = await import("@apps-in-toss/web-framework");
        const link = await Share.createLink({ path: invite.intossPath });
        await Share.sendMessage({ message: `나랑 같이 하나씩 해낼래? ${link}` });
        setStatus("초대 메시지를 보냈어요.");
      }
    } catch (cause) {
      setStatus(errorMessage(cause, "초대 링크를 만들지 못했어요."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell activePath="/invite" title="같이 해낼 친구 초대" subtitle="부탁보다 선언이 먼저 보이는 초대장을 만들어요." onNavigate={navigate}>
      <section className="invite-card">
        <div className="invite-avatars" aria-hidden="true"><img src="/avatars/seoyeon.png" alt="" /><img src="/avatars/supporter.png" alt="" /></div>
        <p className="eyebrow">둘이 시작하는 작은 약속</p>
        <h2>“나 이번엔 해볼게.”</h2>
        <p>초대받은 친구는 목표 문장과 응원 횟수만 볼 수 있어요.</p>
        <Button fullWidth loading={loading} onClick={shareInvite}>토스로 친구 초대하기</Button>
        {status ? <div className="status-message" role="status">{status}</div> : null}
      </section>
    </PageShell>
  );
}

function MyPage({ gateway, navigate }: PageProps) {
  const [preferences, setPreferences] = useState<MemberPreferences>({ notifyCheer: true, notifyMarketing: false });
  const [status, setStatus] = useState<string | null>(null);

  const save = async (next: MemberPreferences) => {
    setPreferences(next);
    try {
      const stored = await gateway.updatePreferences(next);
      setPreferences(stored);
      setStatus("알림 설정을 저장했어요.");
    } catch (cause) {
      setStatus(errorMessage(cause, "알림 설정을 저장하지 못했어요."));
    }
  };

  return (
    <PageShell activePath="/my" title="내 설정" subtitle="필요한 소식만 받을 수 있어요." onNavigate={navigate}>
      <section className="settings-card">
        <label className="toggle-row"><span><strong>응원 소식</strong><small>친구가 응원을 남기면 알려드려요.</small></span><input type="checkbox" checked={preferences.notifyCheer} onChange={(event) => void save({ ...preferences, notifyCheer: event.target.checked })} /></label>
        <label className="toggle-row"><span><strong>새로운 소식</strong><small>해낼게의 업데이트를 선택해서 받아요.</small></span><input type="checkbox" checked={preferences.notifyMarketing} onChange={(event) => void save({ ...preferences, notifyMarketing: event.target.checked })} /></label>
        {status ? <div className="status-message" role="status">{status}</div> : null}
      </section>
    </PageShell>
  );
}

function App() {
  const gateway = useMemo(() => createGateway(), []);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (next: string) => {
    window.history.pushState({}, "", next);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (path === "/login") return <LoginPage gateway={gateway} navigate={navigate} />;
  if (path === "/friends") return <FriendsPage gateway={gateway} navigate={navigate} />;
  if (path.startsWith("/goals/")) return <GoalPage gateway={gateway} navigate={navigate} />;
  if (path === "/invite") return <InvitePage gateway={gateway} navigate={navigate} />;
  if (path === "/my") return <MyPage gateway={gateway} navigate={navigate} />;
  return <HomePage gateway={gateway} navigate={navigate} />;
}

export default App;
