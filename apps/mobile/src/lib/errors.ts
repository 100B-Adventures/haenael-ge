export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false
  ) {
    super(message);
  }
}

export function userMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message.includes("channel_release_disabled")) {
    return "아직 이 결제 수단을 열지 않았어요. 다른 수단을 골라 주세요.";
  }
  return "잠시 연결이 불안정해요. 다시 시도해 주세요.";
}
