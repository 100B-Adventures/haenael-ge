import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  CashoutQueue,
  type AdminCashout,
} from "@/components/admin/CashoutQueue";
import {
  GoalCoverReviewQueue,
  type CoverReviewItem,
} from "@/components/admin/GoalCoverReviewQueue";

export const dynamic = "force-dynamic";

type RpcError = { message: string };
type RpcResult<T> = { data: T | null; error: RpcError | null };

type AdminMember = {
  id: string;
  nickname: string | null;
  provider: string | null;
  kyc_status: string;
  created_at: string;
  clover_count: number;
  goal_slug: string | null;
};

type AdminLedgerEntry = {
  id: number;
  member_id: string;
  nickname: string | null;
  entry_type: string;
  clover_delta: number;
  ref_type: string | null;
  ref_id: number | null;
  balance_after: number;
  created_at: string;
};

type AdminOpsAlert = {
  id: number;
  event_type: string;
  severity: string;
  details: Record<string, unknown>;
  created_at: string;
};

type AdminRpcName =
  | "is_admin"
  | "admin_list_members"
  | "admin_list_ledger"
  | "admin_list_cashouts_v2"
  | "admin_list_goal_covers";

type AdminRpcArgs = { p_limit: number } | undefined;

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const numberFormatter = new Intl.NumberFormat("ko-KR");

// DESIGN.md §8.2 용어 사전: A안에서 "보류·복원"은 폐기어다(2026-08-21 확정).
// CASHOUT_HOLD = 잠금(총량 불변) · CASHOUT_SETTLED = 확정 차감(총량 감소 유일 지점) ·
// CASHOUT_REVERSAL = 잠금 해제(되돌릴 잔액 없음). 관리자 화면도 같은 단어를 쓴다.
const ledgerTypeLabels: Record<string, string> = {
  EARN: "응원 적립",
  CASHOUT_HOLD: "환전 잠금",
  CASHOUT_SETTLED: "환전 확정 차감",
  CASHOUT_REVERSAL: "환전 잠금 해제",
  REFUND_REVERSAL: "환불 차감",
  WELCOME_GRANT: "웰컴 적립",
  WELCOME_REVERSAL: "웰컴 회수",
};

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function SectionHeader({
  title,
  description,
  countLabel,
}: {
  title: string;
  description: string;
  countLabel: string;
}) {
  return (
    <div className="admin-section-head" aria-label={`${title}. ${description}`}>
      <div>
        <h2>{title}</h2>
      </div>
      <span>{countLabel}</span>
    </div>
  );
}

function MemberCard({ member }: { member: AdminMember }) {
  return (
    <li className="admin-member-card">
      <div className="admin-record-row">
        <div>
          <strong>{member.nickname || "미설정"}</strong>
          <small>가입 {formatDateTime(member.created_at)}</small>
        </div>
        <div>
          <strong>🍀 {formatNumber(member.clover_count)}</strong>
          <small>보유 클로버</small>
        </div>
      </div>
      <div
        className="admin-member-details"
        role="group"
        aria-label={`${member.nickname || "미설정"} 회원 상세`}
      >
        <p>로그인 {member.provider || "미확인"}</p>
        <p>본인인증 {member.kyc_status === "VERIFIED" ? "완료" : "미완료"}</p>
        <p>회원 ID {shortId(member.id)}</p>
        {member.goal_slug && (
          <a
            href={`/g/${member.goal_slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            목표 보기
          </a>
        )}
      </div>
    </li>
  );
}

function LedgerRow({ entry }: { entry: AdminLedgerEntry }) {
  return (
    <li className="admin-record-row">
      <div>
        <strong>
          {ledgerTypeLabels[entry.entry_type] ?? entry.entry_type} (
          {entry.nickname || "미설정"})
        </strong>
        <small>
          {formatDateTime(entry.created_at)} ·{" "}
          {entry.ref_type
            ? `${entry.ref_type}${entry.ref_id !== null ? ` #${entry.ref_id}` : ""}`
            : `원장 #${entry.id}`}
        </small>
      </div>
      <div>
        <strong className={entry.clover_delta < 0 ? "is-negative" : ""}>
          {entry.clover_delta > 0 ? "+" : ""}
          {formatNumber(entry.clover_delta)}
        </strong>
        <small>{formatNumber(entry.balance_after)} 잔액</small>
      </div>
    </li>
  );
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  async function callAdminRpc<T>(
    name: AdminRpcName,
    args?: AdminRpcArgs,
  ): Promise<RpcResult<T>> {
    const result = await supabase.rpc(name as never, args as never);
    return result as unknown as RpcResult<T>;
  }

  const { data: isAdmin, error: adminCheckError } =
    await callAdminRpc<boolean>("is_admin");

  if (adminCheckError || !isAdmin) {
    notFound();
  }

  const serviceClient = createServiceRoleClient();
  const [
    membersResult,
    ledgerResult,
    cashoutsResult,
    coversResult,
    alertsResult,
  ] = await Promise.all([
    callAdminRpc<AdminMember[]>("admin_list_members", { p_limit: 100 }),
    callAdminRpc<AdminLedgerEntry[]>("admin_list_ledger", { p_limit: 200 }),
    callAdminRpc<AdminCashout[]>("admin_list_cashouts_v2", { p_limit: 100 }),
    callAdminRpc<CoverReviewItem[]>("admin_list_goal_covers", { p_limit: 100 }),
    serviceClient
      .from("ops_event")
      .select("id,event_type,severity,details,created_at")
      .in("severity", ["ERROR", "WARN"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (
    membersResult.error ||
    ledgerResult.error ||
    cashoutsResult.error ||
    coversResult.error ||
    alertsResult.error
  ) {
    throw new Error("관리자 데이터를 불러오지 못했습니다.");
  }

  const members = membersResult.data ?? [];
  const ledger = ledgerResult.data ?? [];
  // W-8: 목록은 authenticated RPC로 마스킹 필드만 읽는다. 복호화는 행별 액션에서만 한다.
  const cashouts = cashoutsResult.data ?? [];
  const covers = coversResult.data ?? [];
  const alerts = (alertsResult.data ?? []) as unknown as AdminOpsAlert[];

  return (
    <main className="admin-dashboard">
      <div className="admin-dashboard-inner">
        <header className="admin-dashboard-head">
          <p>해낼게 운영</p>
          <h1>관리자 운영 대시보드</h1>
          <p>
            회원과 클로버 원장은 조회만 합니다. 환전 요청은 실제 은행 송금을
            마친 뒤 지급 완료로 표시하거나, 사유를 남기고 반려할 수 있습니다.
          </p>
        </header>

        <div className="admin-dashboard-stack">
          <section
            className="admin-dashboard-section"
            data-testid="admin-cashout-section"
          >
            <SectionHeader
              title="환전 요청 큐"
              description="계좌는 기본 마스킹 · 실제 송금 후 지급 완료 · 반려 시 클로버 잠금 해제(총량은 그대로)"
              countLabel={`${formatNumber(cashouts.filter((item) => item.status === "REQUESTED").length)}건 대기`}
            />
            <CashoutQueue cashouts={cashouts} />
          </section>
          <section
            className="admin-dashboard-section"
            data-testid="admin-members-section"
          >
            <SectionHeader
              title="회원"
              description="최근 가입순 · 현재 클로버 잔액 포함"
              countLabel={`최근 ${formatNumber(members.length)}명`}
            />
            <ul className="admin-record-list" aria-label="회원 목록">
              {members.length === 0 ? (
                <li className="admin-record-empty">조회된 회원이 없습니다.</li>
              ) : (
                members.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))
              )}
            </ul>
          </section>

          <section
            className="admin-dashboard-section"
            data-testid="admin-ledger-section"
          >
            <SectionHeader
              title="클로버 원장"
              description="적립·환전·환불·웰컴 기록 · 최근순"
              countLabel={`최근 ${formatNumber(ledger.length)}건`}
            />
            <ul className="admin-record-list" aria-label="클로버 원장 목록">
              {ledger.length === 0 ? (
                <li className="admin-record-empty">
                  조회된 원장 기록이 없습니다.
                </li>
              ) : (
                ledger.map((entry) => (
                  <LedgerRow key={entry.id} entry={entry} />
                ))
              )}
            </ul>
          </section>

          <GoalCoverReviewQueue initialItems={covers} />

          <section
            className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
            data-testid="admin-ops-alerts"
          >
            <div className="min-h-11">
              <SectionHeader
                title="운영 경보"
                description="Storage cleanup 정체와 스케줄 실패를 표시합니다."
                countLabel={`${formatNumber(alerts.length)}건`}
              />
            </div>
            {alerts.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                현재 수신된 운영 경보가 없습니다.
              </p>
            ) : (
              <ul className="divide-y" aria-label="운영 경보 목록">
                {alerts.map((alert) => (
                  <li
                    className="grid gap-1 py-3 text-sm sm:grid-cols-[10rem_1fr_auto] sm:items-center sm:gap-4"
                    key={alert.id}
                  >
                    <strong className="text-destructive">
                      {alert.severity}
                    </strong>
                    <span className="font-semibold">{alert.event_type}</span>
                    <time
                      className="text-muted-foreground"
                      dateTime={alert.created_at}
                    >
                      {formatDateTime(alert.created_at)}
                    </time>
                    <code className="break-all text-xs text-muted-foreground sm:col-span-3">
                      {JSON.stringify(alert.details)}
                    </code>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
