/**
 * Structured Explore API errors.
 */
export type ExploreErrorBody = {
  error: string;
  code?: string;
  message?: string;
  retry_after_seconds?: number;
  details?: Record<string, unknown>;
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  status: number,
  body: ExploreErrorBody,
  extraHeaders: Record<string, string> = {}
): Response {
  return jsonResponse(body, status, extraHeaders);
}

export function mapDataPreparingResponse(retryAfterSeconds = 10): Response {
  return jsonResponse(
    {
      code: "map_data_preparing",
      error: "map_data_preparing",
      message: "Explore is preparing this area.",
      retry_after_seconds: retryAfterSeconds,
    },
    202,
    { "Retry-After": String(retryAfterSeconds) }
  );
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, headers });
}
