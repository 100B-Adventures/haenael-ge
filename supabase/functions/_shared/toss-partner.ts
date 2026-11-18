const TOSS_PARTNER_BASE =
  "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss";

export type TossReferrer = "DEFAULT" | "SANDBOX";

export interface TossLoginIdentity {
  userKey: string;
  accessToken: string;
}

export interface TossOrderStatus {
  orderId: string;
  sku: string;
  status: "PAYMENT_COMPLETED" | "PURCHASED" | "REFUNDED";
  purchaserMatched: true;
  statusDeterminedAt: string;
}

type FetchLike = typeof fetch;

function mtlsFetch(): FetchLike {
  const certChain = Deno.env.get("TOSS_PARTNER_MTLS_CERT");
  const privateKey = Deno.env.get("TOSS_PARTNER_MTLS_KEY");
  if (!certChain || !privateKey) throw new Error("toss_partner_credentials_missing");
  const client = Deno.createHttpClient({ cert: certChain, key: privateKey });
  return ((input: string | URL | Request, init?: RequestInit) =>
    fetch(input, { ...init, client } as RequestInit)) as FetchLike;
}

async function partnerJson(
  path: string,
  init: RequestInit,
  fetcher: FetchLike = mtlsFetch(),
): Promise<Record<string, unknown>> {
  const response = await fetcher(`${TOSS_PARTNER_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error("toss_partner_unavailable");
  const payload = await response.json() as Record<string, unknown>;
  if (payload.resultType !== "SUCCESS" || typeof payload.success !== "object" || !payload.success) {
    throw new Error("toss_partner_rejected");
  }
  return payload.success as Record<string, unknown>;
}

export async function exchangeTossLogin(
  authorizationCode: string,
  referrer: TossReferrer,
  fetcher?: FetchLike,
): Promise<TossLoginIdentity> {
  const token = await partnerJson(
    "/user/oauth2/generate-token",
    { method: "POST", body: JSON.stringify({ authorizationCode, referrer }) },
    fetcher,
  );
  if (typeof token.accessToken !== "string" || token.accessToken.length < 16) {
    throw new Error("toss_token_invalid");
  }
  const me = await partnerJson(
    "/user/oauth2/login-me",
    { method: "GET", headers: { Authorization: `Bearer ${token.accessToken}` } },
    fetcher,
  );
  if (
    (typeof me.userKey !== "string" && typeof me.userKey !== "number") ||
    String(me.userKey).length < 1
  ) {
    throw new Error("toss_identity_invalid");
  }
  return { userKey: String(me.userKey), accessToken: token.accessToken };
}

export async function getTossOrderStatus(
  orderId: string,
  userKey: string,
  fetcher?: FetchLike,
): Promise<TossOrderStatus> {
  const order = await partnerJson(
    "/order/get-order-status",
    {
      method: "POST",
      headers: { "x-toss-user-key": userKey },
      body: JSON.stringify({ orderId }),
    },
    fetcher,
  );
  const status = order.status;
  if (
    order.orderId !== orderId ||
    typeof order.sku !== "string" ||
    order.purchaserMatched !== true ||
    !["PAYMENT_COMPLETED", "PURCHASED", "REFUNDED"].includes(String(status)) ||
    typeof order.statusDeterminedAt !== "string"
  ) {
    throw new Error("toss_order_invalid");
  }
  return {
    orderId,
    sku: order.sku,
    status: status as TossOrderStatus["status"],
    purchaserMatched: true,
    statusDeterminedAt: order.statusDeterminedAt,
  };
}
