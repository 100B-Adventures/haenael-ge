import { scrubMonitoringEvent } from "./privacy";

export const MONITORING_RELEASE = `haenael-ge@${
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "2.4.5"
}`;

export function resolveMonitoringEnvironment(value?: string) {
  return value?.trim().toLowerCase() === "production"
    ? "production"
    : "preview";
}

export function buildGlitchTipOptions(
  dsn: string | undefined,
  environmentSource =
    process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT
    || process.env.VERCEL_ENV
    || process.env.NODE_ENV,
) {
  const normalizedDsn = dsn?.trim() || undefined;

  return {
    dsn: normalizedDsn,
    enabled: Boolean(normalizedDsn),
    environment: resolveMonitoringEnvironment(environmentSource),
    release: MONITORING_RELEASE,
    sampleRate: 1,
    tracesSampleRate: 0,
    autoSessionTracking: false,
    sendDefaultPii: false,
    beforeSend: scrubMonitoringEvent,
  };
}
