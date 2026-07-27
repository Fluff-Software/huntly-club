/**
 * Structured Explore Edge logging — no JWTs, secrets, or precise location history.
 */
export type ExploreLogFields = Record<string, string | number | boolean | null | undefined>;

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function exploreLog(
  event: string,
  fields: ExploreLogFields & { request_id?: string; function?: string } = {}
): void {
  const line = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.log(JSON.stringify(line));
}
