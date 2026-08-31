// components/goal/SplitBalanceCard.tsx: 환전 잠금(A안) 분할 잔액 카드.
// DESIGN.md v1.12.0 §6-(d) 정본 · §4 SplitBalanceCard.
// 프로토타입: docs/prototype/core-cashout-full-journey-v3.8-opus5.html v3.6.
//
// 규칙(§6-(d), 임의 재해석 금지):
//   - 잠김이 0이면 분할 블록은 통째로 사라진다(평시 화면에 상시 두 값을 두지 않는다).
//   - 잠김이 있으면 총량 아래에 분할 막대 + 두 줄 라벨을 반드시 붙인다:
//     "지금 쓸 수 있어요 🍀 N개" / "🔒 환전으로 잠김 🍀 N개".
//   - 잠김이 있을 때 총량 옆 원화 등가는 감춘다(등가·실수령이 같은 카드에 섞이지 않게).
//   - available은 컴포넌트가 직접 계산하지 않고 호출부가 넘긴 값을 그대로 그린다
//     (단일 스냅샷 원칙, clover_eligibility 한 함수에서 계산. test-plan V3).

import { krwFromClover } from "@/lib/clover";
import { formatCashoutKrw } from "@/lib/cashout";

export interface SplitBalanceCardProps {
  /** 총 클로버(총량). clover_eligibility.total_balance */
  total: number;
  /** 잠긴 클로버. clover_eligibility.locked_amount */
  locked: number;
  /** 사용 가능 클로버. clover_eligibility.available_amount (total - locked를 여기서 다시 계산하지 않는다) */
  available: number;
  /** 잠긴 분의 확정 실지급액(원). 진행 중 신청이 있을 때만 표시 */
  pendingNetKrw?: number | null;
}

export function SplitBalanceCard({
  total,
  locked,
  available,
  pendingNetKrw,
}: SplitBalanceCardProps) {
  const hasLock = locked > 0;
  const progressMax = Math.max(total, 1);
  const progressValue = Math.min(Math.max(available, 0), progressMax);

  return (
    <div data-testid="split-balance-card">
      <div className="flex items-baseline justify-between">
        <p className="text-[length:var(--text-meta-micro)]! text-[var(--faint)]">
          모인 클로버
        </p>
      </div>
      <p
        className="text-xl font-extrabold text-accent-foreground"
        data-testid="split-balance-total"
      >
        🍀 {total}
        <small className="ml-0.5 text-[11px] font-semibold text-muted-foreground">
          개
        </small>
      </p>

      {/* 잠김이 있을 때만 등가 은닉. 없을 때는 기존 원화 등가 보조표기 유지 */}
      {!hasLock && (
        <p
          className="mt-0.5 text-[length:var(--text-meta-micro)]! text-[var(--faint)]"
          data-testid="clover-krw-equivalent"
        >
          ≈{krwFromClover(total).toLocaleString("ko-KR")}원 상당
        </p>
      )}

      {hasLock && (
        <div className="mt-3" data-testid="split-balance-block">
          <progress
            className="split-balance-progress block h-2 w-full overflow-hidden rounded-full"
            value={progressValue}
            max={progressMax}
            aria-label={`사용 가능 ${available}개, 잠김 ${locked}개`}
            data-testid="split-balance-progress"
          />

          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="pt-0.5 text-[length:var(--text-label-small)]! font-bold text-foreground">
              지금 쓸 수 있어요
            </p>
            <div className="shrink-0 text-right tabular-nums">
              <strong
                className="block whitespace-nowrap text-[13px] text-accent-foreground"
                data-testid="split-balance-available"
              >
                🍀 {available}개
              </strong>
              <p
                className="mt-0.5 text-[length:var(--text-meta-micro)]! text-[var(--faint)]"
                data-testid="split-balance-available-krw"
              >
                ≈{krwFromClover(available).toLocaleString("ko-KR")}원 상당
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3 border-t border-border pt-2">
            <p className="pt-0.5 text-[length:var(--text-label-small)]! font-bold text-amber-ink">
              🔒 환전으로 잠김
            </p>
            <div className="shrink-0 text-right tabular-nums">
              <strong
                className="block whitespace-nowrap text-[13px] text-amber-ink"
                data-testid="split-balance-locked"
              >
                🍀 {locked}개
              </strong>
              {typeof pendingNetKrw === "number" && (
                <p
                  className="mt-0.5 text-[length:var(--text-meta-micro)]! text-[var(--faint)]"
                  data-testid="split-balance-locked-krw"
                >
                  {formatCashoutKrw(pendingNetKrw)} 입금 예정
                </p>
              )}
            </div>
          </div>

          <p
            className="mt-2 text-[11px] leading-relaxed text-muted-foreground"
            data-testid="split-balance-note"
          >
            모은 <b>{total}개는 그대로</b>예요. 그중 {locked}개에 잠금이 걸려
            있어요. 입금이 끝나면 그때 {locked}개가 총량에서 빠지고, 반려되면
            잠금만 풀려요.
          </p>
        </div>
      )}
    </div>
  );
}
