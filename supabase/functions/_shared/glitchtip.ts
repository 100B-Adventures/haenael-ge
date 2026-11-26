import * as Sentry from "npm:@sentry/deno@11.18.0";

const RELEASE = "haenael-ge@2.4.5";
const SENSITIVE_KEY = /(?:^|_)(?:authorization|cookie|cookies|header|headers|query_string|token|access_token|refresh_token|password|passwd|secret|email|phone|mobile|session|user|username|ip_address)(?:$|_)/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const KOREAN_PHONE = /(?:\+?82[- ]?0?1[016789]|01[016789])[- ]?\d{3,4}[- ]?\d{4}/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

export function resolveEdgeMonitoringEnvironment(value?: string) {
  return value?.trim().toLowerCase() === "production"
    ? "production"
    : "preview";
}

function sanitizeString(value: string) {
  return value
    .replace(/https?:\/\/[^\s?#]+(?:\?[^\s#]*)?/g, (candidate) => {
      try {
        const url = new URL(candidate);
        url.search = "";
        return url.toString();
      } catch {
        return candidate;
      }
    })
    .replace(EMAIL, "[email-redacted]")
    .replace(KOREAN_PHONE, "[phone-redacted]")
    .replace(BEARER, "Bearer [token-redacted]")
    .replace(JWT, "[token-redacted]");
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, child]) => [key, sanitizeValue(child)]),
  );
}

export function scrubEdgeMonitoringEvent<T>(event: T): T {
  return sanitizeValue(event) as T;
}

export function buildEdgeGlitchTipOptions(
  dsn: string | undefined,
  environmentSource?: string,
) {
  const normalizedDsn = dsn?.trim() || undefined;
  return {
    dsn: normalizedDsn,
    enabled: Boolean(normalizedDsn),
    environment: resolveEdgeMonitoringEnvironment(environmentSource),
    release: RELEASE,
    sampleRate: 1,
    tracesSampleRate: 0,
    autoSessionTracking: false,
    sendDefaultPii: false,
    beforeSend: scrubEdgeMonitoringEvent,
  };
}

export function shouldReportEdgeResponse(status: number) {
  return status >= 500;
}

const options = buildEdgeGlitchTipOptions(
  Deno.env.get("GLITCHTIP_DSN"),
  Deno.env.get("GLITCHTIP_ENVIRONMENT"),
);

if (options.enabled) {
  Sentry.init(options);
}

async function flushCapturedError() {
  if (options.enabled) await Sentry.flush(2_000);
}

async function captureFailure(
  functionName: string,
  request: Request,
  failure: unknown,
) {
  if (!options.enabled) return;
  const pathname = new URL(request.url).pathname;
  Sentry.withScope((scope) => {
    scope.setTag("edge_function", functionName);
    scope.setTag("request_method", request.method);
    scope.setContext("request", { method: request.method, pathname });
    if (failure instanceof Error) {
      Sentry.captureException(failure);
    } else {
      Sentry.captureMessage(sanitizeString(String(failure)), "error");
    }
  });
  await flushCapturedError();
}

export function serveWithGlitchTip(
  functionName: string,
  handler: (
    request: Request,
    info: Deno.ServeHandlerInfo,
  ) => Response | Promise<Response>,
) {
  Deno.serve(async (request, info) => {
    try {
      const response = await handler(request, info);
      if (shouldReportEdgeResponse(response.status)) {
        await captureFailure(
          functionName,
          request,
          new Error(`${functionName} returned HTTP ${response.status}`),
        );
      }
      return response;
    } catch (error) {
      await captureFailure(functionName, request, error);
      throw error;
    }
  });
}
