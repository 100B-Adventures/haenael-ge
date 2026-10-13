// Loaded only by the cashout E2E Next process.
// Auth remains on the real local Supabase stack while PostgREST data calls are
// redirected to the isolated in-spec fixture server. This keeps the production
// bundle's build-time NEXT_PUBLIC_* contract intact and prevents cashout writes.

const sourceValue = process.env.CASHOUT_E2E_SUPABASE_SOURCE_URL;
const targetValue = process.env.CASHOUT_E2E_SUPABASE_TARGET_URL;

if (!sourceValue || !targetValue) {
  throw new Error("cashout E2E fetch redirect requires source and target URLs");
}

const sourceOrigin = new URL(sourceValue).origin;
const targetOrigin = new URL(targetValue).origin;
const originalFetch = globalThis.fetch;

globalThis.fetch = function cashoutFixtureFetch(input, init) {
  const requestUrl = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  if (requestUrl.origin !== sourceOrigin || !requestUrl.pathname.startsWith("/rest/v1/")) {
    return originalFetch(input, init);
  }

  const redirectedUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, targetOrigin);
  if (typeof input === "string" || input instanceof URL) {
    return originalFetch(redirectedUrl, init);
  }
  return originalFetch(new Request(redirectedUrl, input), init);
};
