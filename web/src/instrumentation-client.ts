import * as Sentry from "@sentry/nextjs";
import { buildGlitchTipOptions } from "@/lib/monitoring/config";

Sentry.init(
  buildGlitchTipOptions(process.env.NEXT_PUBLIC_GLITCHTIP_DSN),
);
