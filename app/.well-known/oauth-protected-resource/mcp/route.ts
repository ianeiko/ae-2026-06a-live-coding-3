import { NextResponse } from "next/server";

import { metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";
import {
  corsHeaders,
  generateClerkProtectedResourceMetadata,
} from "@clerk/mcp-tools/server";

import { requestOrigin } from "@/lib/origin";

/**
 * Tells MCP clients which authorization server to log in against.
 *
 * Clerk's own `protectedResourceHandlerClerk` reads the origin off `req.url`,
 * which ignores Vercel's proxy headers. We generate the same document but with
 * an origin derived from the actual request — see lib/origin.ts.
 */
function handler(req: Request) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  const metadata = generateClerkProtectedResourceMetadata({
    publishableKey,
    resourceUrl: requestOrigin(req),
    properties: { scopes_supported: ["profile", "email"] },
  });

  return NextResponse.json(metadata, {
    headers: { ...corsHeaders, "Cache-Control": "max-age=3600" },
  });
}

const corsOptionsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsOptionsHandler as OPTIONS };
