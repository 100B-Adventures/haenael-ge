// idempotency.ts — order_id 기반 멱등키 조회.
// DB 레벨 UNIQUE(order_id)가 최종 중복 차단이고, 이 함수는 EF 사전 조회용이다.

/**
 * 동일한 orderId로 두 번 처리되지 않도록 차단.
 * DB 레벨: payment 테이블 UNIQUE(order_id).
 * EF 레벨: 이 함수가 선처리 가드 역할.
 */
export async function checkIdempotency(
  supabaseServiceRole: {
    from: (table: "payment") => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { id: number; status: string } | null }>;
        };
      };
    };
  },
  orderId: string,
): Promise<{ isDuplicate: boolean }> {
  const { data } = await supabaseServiceRole
    .from("payment")
    .select("id,status")
    .eq("order_id", orderId)
    .maybeSingle();
  return { isDuplicate: !!data };
}
