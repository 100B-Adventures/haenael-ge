export type CleanupClaim = {
  id: number;
  bucket_id: string;
  object_path: string;
  lock_token: string;
};

export type RemovedObject = { name?: string | null };

export function groupCleanupClaims(
  claims: CleanupClaim[],
): Map<string, CleanupClaim[]> {
  const grouped = new Map<string, CleanupClaim[]>();
  for (const claim of claims) {
    const rows = grouped.get(claim.bucket_id) ?? [];
    rows.push(claim);
    grouped.set(claim.bucket_id, rows);
  }
  return grouped;
}

export function returnedObjectPaths(
  removed: RemovedObject[] | null,
): Set<string> {
  return new Set(
    (removed ?? []).flatMap((object) =>
      typeof object.name === "string" && object.name.length > 0
        ? [object.name]
        : []
    ),
  );
}

export async function classifyRemovalResults(
  claims: CleanupClaim[],
  removedPaths: Set<string>,
  objectIsAbsent: (claim: CleanupClaim) => Promise<boolean>,
): Promise<Map<number, boolean>> {
  const outcomes = new Map<number, boolean>();
  for (const claim of claims) {
    outcomes.set(
      claim.id,
      removedPaths.has(claim.object_path) || await objectIsAbsent(claim),
    );
  }
  return outcomes;
}

export async function removeCleanupClaims(
  claims: CleanupClaim[],
  remove: (paths: string[]) => Promise<{ data: RemovedObject[] | null; error: unknown | null }>,
  objectIsAbsent: (claim: CleanupClaim) => Promise<boolean>,
): Promise<Map<number, boolean>> {
  const bulk = await remove(claims.map((claim) => claim.object_path));
  if (!bulk.error) {
    return classifyRemovalResults(claims, returnedObjectPaths(bulk.data), objectIsAbsent);
  }

  // Storage가 배치 전체를 오류로 반환하면 한 건씩 격리해 정상 객체까지
  // attempts가 오르는 것을 막는다. 포이즌 객체만 실패로 남는다.
  const outcomes = new Map<number, boolean>();
  for (const claim of claims) {
    const single = await remove([claim.object_path]);
    outcomes.set(
      claim.id,
      single.error
        ? await objectIsAbsent(claim)
        : returnedObjectPaths(single.data).has(claim.object_path) || await objectIsAbsent(claim),
    );
  }
  return outcomes;
}

export function splitStoragePath(path: string): { folder: string; name: string } {
  const separator = path.lastIndexOf("/");
  return separator < 0
    ? { folder: "", name: path }
    : { folder: path.slice(0, separator), name: path.slice(separator + 1) };
}
