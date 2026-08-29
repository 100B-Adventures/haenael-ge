import Link from "next/link";
import { redirect } from "next/navigation";
import {
  type CashoutRecord,
  cashoutBankName,
  formatCashoutKrw,
} from "@/lib/cashout";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SplitBalanceCard } from "@/components/goal/SplitBalanceCard";
import {
  BackHomeLink,
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

const stepDateTime = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

function formatStepDateTime(value: string) {
  const parts = Object.fromEntries(
    stepDateTime
      .formatToParts(new Date(value))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, partValue]),
  );

  return `${Number(parts.month)}/${Number(parts.day)} ${parts.hour}:${parts.minute}`;
}

export default async function CashoutStatusPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // FDD §12 매핑 3 갭: clover_balance 직접 조회를 clover_eligibility로 교체.
  // 총량·잠김이 같은 스냅샷에서 나와야 I1(available = total - locked)이 보장된다.
  const [
    { data: statusRaw },
    { data: eligibilityRaw, error: eligibilityError },
  ] = await Promise.all([
    supabase.rpc("my_cashout_status" as never),
    supabase.rpc("clover_eligibility", { p_member_id: user.id }),
  ]);
  const cashout = ((statusRaw ?? []) as unknown as CashoutRecord[])[0] ?? null;
  const eligibility = Array.isArray(eligibilityRaw)
    ? eligibilityRaw[0]
    : eligibilityRaw;
  // 컨트롤러 3차 리뷰 MINOR: 조회 실패를 0으로 그리면 "🍀 0개"가 정상처럼 보인다
  // (DESIGN.md §6 상태 가시성: 침묵 금지). balanceLoadFailed로 실패를 실패로 그린다.
  const balanceLoadFailed = Boolean(eligibilityError) || !eligibility;
  const totalBalance = eligibility?.total_balance ?? 0;
  const lockedAmount = eligibility?.locked_amount ?? 0;
  const availableAmount = eligibility?.available_amount ?? totalBalance;
  const minCashoutClover = eligibility?.min_cashout_clover ?? 30;

  if (!cashout) {
    return (
      <ReceiverPageShell testId="cashout-status-empty-page">
        <ReceiverTopBar variant="detail" />
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-black text-foreground">
            아직 환전 신청이 없어요
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            모인 클로버가 {minCashoutClover}개 이상이면 환전 자격을 채워요.
            신청량은 지금 지급 가능한 클로버 안에서 1개 이상 선택할 수
            있어요.
          </p>
          <Link
            href="/cashout"
            className="mt-5 block rounded-md bg-primary py-3 text-[13px] font-extrabold text-primary-foreground"
          >
            환전 화면으로
          </Link>
        </div>
      </ReceiverPageShell>
    );
  }

  const isPaid = cashout.status === "PAID";
  const isRejected = cashout.status === "REJECTED";
  const checking =
    cashout.status === "REQUESTED" &&
    Date.now() - new Date(cashout.requested_at).getTime() >= 86_400_000;
  // DESIGN.md v1.12.0 §6-(d) 필수 3단: ①이유("잠겨 있던 N개는 이 돈으로 바뀌었어요")
  // ②감소 전후 대조("모인 클로버가 A개에서 B개가 됐어요") ③회수 경로(환전 내역) 안내.
  // 컨트롤러 재검증 MAJOR1: A·B는 라이브 총량에서 역산(totalBalance + clover_amount)하지 않는다
  // 지급 후 새 응원이 도착하면 존재한 적 없는 숫자가 나온다. my_cashout_status가 실어 내리는
  // CASHOUT_SETTLED 원장 스냅샷(settled_balance_before/after)이 확정 시점 값의 유일한 진실원이다.
  const beforeBalance = cashout.settled_balance_before ?? null;
  const afterBalance = cashout.settled_balance_after ?? null;
  const banner = isPaid
    ? {
        box: "border-primary/30 bg-accent",
        title: "text-accent-foreground",
        heading: `${formatCashoutKrw(cashout.net_krw)}이 입금됐어요`,
        body:
          beforeBalance !== null && afterBalance !== null
            ? `잠겨 있던 ${cashout.clover_amount}개는 이 돈으로 바뀌었어요. 그래서 모인 클로버가 ${beforeBalance}개에서 ${afterBalance}개가 됐어요. 이 내역은 환전 내역에서 계속 확인할 수 있어요.`
            : `잠겨 있던 ${cashout.clover_amount}개는 이 돈으로 바뀌었어요. 이 내역은 환전 내역에서 계속 확인할 수 있어요.`,
      }
    : isRejected
      ? {
          box: "border-destructive/30 bg-danger-soft",
          title: "text-danger-ink",
          heading: "환전이 반려됐어요",
          body: cashout.processing_note ?? "계좌 정보를 다시 확인해 주세요.",
        }
      : {
          box: "border-amber-line bg-amber-soft",
          title: "text-amber-ink",
          heading: checking ? "계좌를 확인하고 있어요" : "신청이 접수됐어요",
          body: checking
            ? "담당자가 입금 계좌를 확인 중이에요."
            : "1~3영업일 안에 입금해 드릴게요.",
        };

  return (
    <ReceiverPageShell testId="cashout-status-page">
      <ReceiverTopBar variant="detail" />
      <h1 className="receiver-page-title mt-2 sm:text-[length:var(--text-page-title-desktop)]!">
        환전 진행 상태
      </h1>
      <p className="mt-1 text-[length:var(--text-label-small)]! text-[var(--faint)]">
        {dateTime.format(new Date(cashout.requested_at))} 신청 · 신청번호 #
        {cashout.id}
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section>
          <div
            className={`rounded-[14px] border p-4 ${banner.box}`}
            role="status"
          >
            <h2 className={`text-[15px] font-extrabold ${banner.title}`}>
              {banner.heading}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {banner.body}
            </p>
          </div>

          <div className="mt-3 rounded-md border border-border bg-card p-4">
            <ol className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
              <li className="text-accent-foreground">
                <span className="mx-auto mb-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </span>
                접수됨
                <p className="mt-1 font-normal text-muted-foreground">
                  {formatStepDateTime(cashout.requested_at)}
                </p>
              </li>
              <li
                className={
                  isRejected
                    ? "text-accent-foreground"
                    : cashout.status === "REQUESTED"
                      ? "text-amber-ink"
                      : "text-accent-foreground"
                }
              >
                <span
                  className={`mx-auto mb-2 flex size-7 items-center justify-center rounded-full ${cashout.status === "REQUESTED" ? "border-2 border-amber bg-card" : "bg-primary text-primary-foreground"}`}
                >
                  2
                </span>
                확인중
                <p className="mt-1 font-normal text-muted-foreground">
                  {cashout.status === "REQUESTED" ? "예정" : "확인됨"}
                </p>
              </li>
              <li
                className={
                  isRejected
                    ? "text-danger-ink"
                    : isPaid
                      ? "text-accent-foreground"
                      : "text-[var(--faint)]"
                }
              >
                <span
                  className={`mx-auto mb-2 flex size-7 items-center justify-center rounded-full ${isRejected ? "bg-destructive text-primary-foreground" : isPaid ? "bg-primary text-primary-foreground" : "border border-border bg-muted"}`}
                >
                  3
                </span>
                {isRejected ? "반려됨" : "입금완료"}
                <p className="mt-1 font-normal text-muted-foreground">
                  {cashout.paid_at
                    ? formatStepDateTime(cashout.paid_at)
                    : cashout.rejected_at
                      ? formatStepDateTime(cashout.rejected_at)
                      : "예정"}
                </p>
              </li>
            </ol>
            {cashout.status === "REQUESTED" && (
              <p
                className="mt-3 border-t border-border pt-3 text-center text-[length:var(--text-label-small)]! leading-relaxed text-muted-foreground"
                data-testid="cashout-step-note"
              >
                지금은{" "}
                <strong className="text-amber-ink">
                  {checking ? "확인중" : "확인 대기 중"}
                </strong>
                이에요. 따로 하실 일은 없어요.
              </p>
            )}
          </div>

          <dl className="mt-3 divide-y divide-border rounded-md border border-border bg-card px-4">
            <div className="flex justify-between gap-4 py-3 text-[13px]">
              <dt className="text-muted-foreground">
                {isPaid ? "입금된 금액" : "받으실 금액"}
              </dt>
              <dd className="font-extrabold text-accent-foreground">
                {formatCashoutKrw(cashout.net_krw)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3 text-[13px]">
              <dt className="text-muted-foreground">입금 계좌</dt>
              <dd className="text-right font-bold">
                {cashoutBankName(cashout.bank_code)} {cashout.account_masked}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3 text-[13px]">
              <dt className="text-muted-foreground">예금주</dt>
              <dd className="font-bold">{cashout.account_holder}</dd>
            </div>
            {cashout.paid_at && (
              <div className="flex justify-between gap-4 py-3 text-[13px]">
                <dt className="text-muted-foreground">입금 완료</dt>
                <dd className="font-bold">
                  {dateTime.format(new Date(cashout.paid_at))}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <aside>
          <div
            className="rounded-md border border-border bg-card p-4"
            data-testid="status-balance-card"
          >
            {/* 컨트롤러 3차 리뷰 ★1: 여기 있던 "지금 내 클로버" 라벨을 지웠다. SplitBalanceCard가
                  이미 "모인 클로버"를 헤더로 찍는데, 이 라벨은 A안에서 총량(52)을 "지금 쓸 수 있는
                  것"으로 오해시켜 DESIGN.md §6-(d)가 경계한 바로 그 혼동을 만들었다(실제 사용 가능은
                  12). 부품이 이미 헤더를 갖고 있어 페이지가 또 찍을 필요가 없다. */}
            {/* 컨트롤러 재검증 MAJOR4: 이 화면은 잠김이 반드시 존재하는(REQUESTED) 또는
                  방금 없어진(PAID/REJECTED) 상태다. DESIGN.md §6-(d)가 요구하는 분할 막대 +
                  두 줄 라벨을 /me와 같은 SplitBalanceCard로 그린다(부품 이원화 금지). */}
            {balanceLoadFailed ? (
              <p
                className="text-xs text-danger-ink"
                data-testid="status-balance-error"
              >
                🍀 잔액을 불러오지 못했어요. 새로고침 해주세요.
              </p>
            ) : (
              <>
                <SplitBalanceCard
                  total={totalBalance}
                  locked={lockedAmount}
                  available={availableAmount}
                  pendingNetKrw={
                    cashout.status === "REQUESTED" ? cashout.net_krw : null
                  }
                />
                {/* 컨트롤러 3차 리뷰 ★2: REQUESTED 분기 노트를 지웠다. SplitBalanceCard가 잠김>0일 때
                      이미 "모은 N개는 그대로예요 … 반려되면 잠금만 풀려요"를 렌더하므로 여기서 같은
                      사실을 또 말하면 중복이다. REJECTED/PAID 분기는 잠김이 0이라 부품 노트가 사라지므로
                      중복이 아니어서 그대로 둔다. */}
                {cashout.status === "REQUESTED" ? null : isRejected ? (
                  <p className="mt-3 text-[11px] leading-relaxed text-accent-foreground">
                    잠겨 있던 {cashout.clover_amount}개의 잠금이 풀렸어요. 모은
                    개수는 그대로예요.
                  </p>
                ) : (
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    잠겨 있던 {cashout.clover_amount}개는 이 돈으로 바뀌었어요.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="mt-3 rounded-sm bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
            💬 지급이 끝나면 카카오톡 알림으로 알려드릴 예정이에요. 문의할 때는
            신청번호 #{cashout.id}을 알려주세요.
          </div>
          {cashout.status === "REQUESTED" ? (
            <button
              type="button"
              disabled
              className="mt-4 block w-full cursor-not-allowed rounded-md bg-muted py-4 text-center text-[15px] font-extrabold text-muted-foreground"
            >
              새 환전 신청하기
              <span className="mt-1 block text-[length:var(--text-meta-micro)]! font-semibold">
                이 건이 끝나면 다시 신청할 수 있어요
              </span>
            </button>
          ) : (
            <Link
              href="/cashout/history"
              className="mt-4 block rounded-md border border-border bg-card py-3 text-center text-[13px] font-bold text-foreground"
            >
              환전 내역 보기
            </Link>
          )}
          {isRejected && (
            <Link
              href="/cashout"
              className="mt-2 block rounded-md bg-primary py-3 text-center text-[13px] font-extrabold text-primary-foreground"
            >
              계좌 고쳐서 다시 신청하기
            </Link>
          )}
          {cashout.status === "REQUESTED" ? (
            <Link
              href="/me"
              className="mt-3 block rounded-md border border-border bg-card py-4 text-center text-[15px] font-extrabold text-foreground"
            >
              홈으로
            </Link>
          ) : (
            <BackHomeLink label="홈으로" />
          )}
        </aside>
      </div>
    </ReceiverPageShell>
  );
}
