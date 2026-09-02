/**
 * The absolute origin a request actually arrived on.
 *
 * OAuth metadata advertises absolute URLs, so getting this wrong sends every
 * deployed client back to whoever's laptop the code was written on. Vercel
 * terminates TLS at the edge, so trust its forwarded headers first, fall back
 * to the project's production URL, and only then to the request URL — which is
 * the correct answer under `next dev`.
 */
export function requestOrigin(req: Request): string {
  const forwarded =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  if (forwarded) {
    const host = forwarded.split(",")[0].trim();
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;

  return new URL(req.url).origin;
}
