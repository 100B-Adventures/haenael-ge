import * as Sentry from "@sentry/nextjs";
import { buildGlitchTipOptions } from "./src/lib/monitoring/config";

Sentry.init(buildGlitchTipOptions(process.env.GLITCHTIP_DSN));
