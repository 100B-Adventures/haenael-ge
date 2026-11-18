const WAIT_MS = 120 * 24 * 60 * 60 * 1000;

export function shouldRequestReview(args: {
  cheerCount: number;
  lastRequestedAt: string | null;
  justHadFailure: boolean;
  now?: number;
}) {
  if (args.cheerCount < 3 || args.justHadFailure) return false;
  if (!args.lastRequestedAt) return true;
  return (args.now ?? Date.now()) - new Date(args.lastRequestedAt).getTime() >= WAIT_MS;
}
