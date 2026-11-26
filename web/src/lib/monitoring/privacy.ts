const SENSITIVE_KEY = /(?:^|_)(?:authorization|cookie|cookies|header|headers|query_string|token|access_token|refresh_token|password|passwd|secret|email|phone|mobile|session|user|username|ip_address)(?:$|_)/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const KOREAN_PHONE = /(?:\+?82[- ]?0?1[016789]|01[016789])[- ]?\d{3,4}[- ]?\d{4}/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

function stripUrlQuery(value: string) {
  return value.replace(/https?:\/\/[^\s?#]+(?:\?[^\s#]*)?/g, (candidate) => {
    try {
      const url = new URL(candidate);
      url.search = "";
      return url.toString();
    } catch {
      return candidate;
    }
  });
}

export function sanitizeMonitoringString(value: string) {
  return stripUrlQuery(value)
    .replace(EMAIL, "[email-redacted]")
    .replace(KOREAN_PHONE, "[phone-redacted]")
    .replace(BEARER, "Bearer [token-redacted]")
    .replace(JWT, "[token-redacted]");
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeMonitoringString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, child]) => [key, sanitizeValue(child)]),
  );
}

export function scrubMonitoringEvent<T>(event: T): T {
  return sanitizeValue(event) as T;
}
