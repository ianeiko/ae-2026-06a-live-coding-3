import { clerkMiddleware } from "@clerk/nextjs/server";

// Public-first: nothing is protected here. The chat page, /mcp and the
// /.well-known OAuth metadata must all be reachable without a session cookie;
// /mcp checks its own OAuth bearer token in app/[transport]/route.ts.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
