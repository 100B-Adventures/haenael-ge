"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="min-h-svh px-6 py-16 text-center">
          <h1 className="text-xl font-bold">잠시 문제가 생겼어요</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            새로고침한 뒤에도 계속되면 잠시 후 다시 시도해주세요.
          </p>
        </main>
      </body>
    </html>
  );
}
