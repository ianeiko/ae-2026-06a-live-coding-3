import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same code, new filename).
 *
 * Public-first: nothing is protected here. The chat page must stay open to
 * anonymous visitors, and the MCP routes (`/mcp`, `/.well-known/*`) do their
 * own OAuth token check — a session cookie must never be required there.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
