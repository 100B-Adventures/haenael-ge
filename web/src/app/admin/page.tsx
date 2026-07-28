import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  getCashoutAccountEncryptionKey,
} from "@/lib/supabase/service";
import {
  CashoutQueue,
  type AdminCashout,
} from "@/components/admin/CashoutQueue";

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

type SecureAdminCashout = {
  id: number;
  member_id: string;
  nickname: string | null;
  clover_amount: number;
  gross_krw: number;
  fee_krw: number;
  withholding_krw: number;
  net_krw: number;
  bank_code: string | null;
  account_no: string | null;
  account_holder: string | null;
  status: string;
  processing_note: string | null;
  requested_at: string;
  paid_at: string | null;
  rejected_at: string | null;
};

type AdminRpcName =
  | "is_admin"
  | "admin_list_members"
  | "admin_list_ledger";

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

const ledgerTypeLabels: Record<string, string> = {
  EARN: "응원 적립",
  CASHOUT_HOLD: "환전 보류",
  CASHOUT_SETTLED: "환전 확정",
  CASHOUT_REVERSAL: "환전 복원",
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

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
        조회된 항목이 없습니다.
      </td>
    </tr>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
        {formatNumber(count)}건
      </span>
    </div>
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

  // 이 migration에서 추가한 RPC는 다음 타입 생성 시 database.types.ts에 반영된다.
  // 그 전에도 생성 파일 전체를 수동 편집하지 않도록 호출 경계에서 반환 DTO를 명시한다.
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

  const [membersResult, ledgerResult] = await Promise.all([
    callAdminRpc<AdminMember[]>("admin_list_members", { p_limit: 100 }),
    callAdminRpc<AdminLedgerEntry[]>("admin_list_ledger", { p_limit: 200 }),
  ]);

  if (membersResult.error || ledgerResult.error) {
    throw new Error("관리자 데이터를 불러오지 못했습니다.");
  }

  const members = membersResult.data ?? [];
  const ledger = ledgerResult.data ?? [];
  const serviceClient = createServiceRoleClient();
  const { data: secureCashoutsRaw, error: cashoutsError } = await serviceClient.rpc(
    "admin_list_cashouts_secure" as never,
    {
      p_actor_id: user.id,
      p_account_key: getCashoutAccountEncryptionKey(),
      p_limit: 100,
    } as never,
  );
  if (cashoutsError) {
    throw new Error("환전 요청을 불러오지 못했습니다.");
  }
  const cashouts = ((secureCashoutsRaw ?? []) as SecureAdminCashout[]).map(
    ({ account_no, ...cashout }): AdminCashout => ({
      ...cashout,
      account_masked: account_no ? `••••••${account_no.slice(-4)}` : "계좌 미등록",
    }),
  );

  return (
    <main className="min-h-svh bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="mb-10">
          <p className="text-sm font-extrabold text-primary">해낼게 운영</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            관리자 운영 대시보드
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            회원과 클로버 원장은 조회만 합니다. 환전 요청은 실제 은행 송금을 마친 뒤
            지급 완료로 표시하거나, 사유를 남기고 반려할 수 있습니다.
          </p>
        </header>

        <div className="space-y-10">
          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <SectionHeader
              title="회원"
              description="최근 가입순 · 현재 클로버 잔액 포함"
              count={members.length}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
                <caption className="sr-only">회원 목록</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="border-b px-4 py-3 font-semibold">가입일</th>
                    <th className="border-b px-4 py-3 font-semibold">닉네임</th>
                    <th className="border-b px-4 py-3 font-semibold">로그인</th>
                    <th className="border-b px-4 py-3 font-semibold">본인인증</th>
                    <th className="border-b px-4 py-3 text-right font-semibold">클로버</th>
                    <th className="border-b px-4 py-3 font-semibold">해낼게</th>
                    <th className="border-b px-4 py-3 font-semibold">회원 ID</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <EmptyRow colSpan={7} />
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/40">
                        <td className="border-b px-4 py-3 whitespace-nowrap">
                          {formatDateTime(member.created_at)}
                        </td>
                        <td className="border-b px-4 py-3 font-semibold">
                          {member.nickname || "미설정"}
                        </td>
                        <td className="border-b px-4 py-3">{member.provider || "—"}</td>
                        <td className="border-b px-4 py-3">
                          <span
                            className={
                              member.kyc_status === "VERIFIED"
                                ? "rounded-full bg-accent px-2 py-1 text-xs font-bold text-accent-foreground"
                                : "rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
                            }
                          >
                            {member.kyc_status === "VERIFIED" ? "완료" : "미완료"}
                          </span>
                        </td>
                        <td className="border-b px-4 py-3 text-right font-bold text-primary">
                          {formatNumber(member.clover_count)}
                        </td>
                        <td className="border-b px-4 py-3">
                          {member.goal_slug ? (
                            <a
                              href={`/g/${member.goal_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-primary underline"
                            >
                              보기
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className="border-b px-4 py-3 font-mono text-xs text-muted-foreground"
                          title={member.id}
                        >
                          {shortId(member.id)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <SectionHeader
              title="클로버 원장"
              description="적립·환전·환불·웰컴 기록 · 최근순"
              count={ledger.length}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                <caption className="sr-only">클로버 원장 목록</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="border-b px-4 py-3 font-semibold">일시</th>
                    <th className="border-b px-4 py-3 font-semibold">회원</th>
                    <th className="border-b px-4 py-3 font-semibold">구분</th>
                    <th className="border-b px-4 py-3 text-right font-semibold">변동</th>
                    <th className="border-b px-4 py-3 text-right font-semibold">잔액</th>
                    <th className="border-b px-4 py-3 font-semibold">참조</th>
                    <th className="border-b px-4 py-3 font-semibold">원장 ID</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <EmptyRow colSpan={7} />
                  ) : (
                    ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/40">
                        <td className="border-b px-4 py-3 whitespace-nowrap">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="border-b px-4 py-3">
                          <p className="font-semibold">{entry.nickname || "미설정"}</p>
                          <p
                            className="mt-0.5 font-mono text-xs text-muted-foreground"
                            title={entry.member_id}
                          >
                            {shortId(entry.member_id)}
                          </p>
                        </td>
                        <td className="border-b px-4 py-3 whitespace-nowrap">
                          {ledgerTypeLabels[entry.entry_type] ?? entry.entry_type}
                        </td>
                        <td
                          className={`border-b px-4 py-3 text-right font-bold ${
                            entry.clover_delta > 0
                              ? "text-primary"
                              : entry.clover_delta < 0
                                ? "text-destructive"
                                : ""
                          }`}
                        >
                          {entry.clover_delta > 0 ? "+" : ""}
                          {formatNumber(entry.clover_delta)}
                        </td>
                        <td className="border-b px-4 py-3 text-right font-semibold">
                          {formatNumber(entry.balance_after)}
                        </td>
                        <td className="border-b px-4 py-3 font-mono text-xs text-muted-foreground">
                          {entry.ref_type
                            ? `${entry.ref_type}${entry.ref_id !== null ? ` #${entry.ref_id}` : ""}`
                            : "—"}
                        </td>
                        <td className="border-b px-4 py-3 font-mono text-xs text-muted-foreground">
                          #{entry.id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <SectionHeader
              title="환전 요청 큐"
              description="계좌는 기본 마스킹 · 실제 송금 후 지급 완료 · 반려 시 클로버 자동 복원"
              count={cashouts.length}
            />
            <CashoutQueue cashouts={cashouts} />
          </section>
        </div>
      </div>
    </main>
  );
}
