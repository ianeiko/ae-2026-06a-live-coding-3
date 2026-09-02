import { auth, clerkClient } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

import { buildAgent } from "@/lib/agent";

const clerk = await clerkClient();

/**
 * MCP door onto the same agent the browser chat uses (lib/agent.ts).
 *
 * Served at /mcp (streamable HTTP) and /sse — the [transport] segment.
 */
const handler = createMcpHandler((server) => {
  server.registerTool(
    "ask-the-pirate",
    {
      description:
        "Ask Patchy the pirate a question. He answers in character and " +
        "greets the authenticated Clerk user by name.",
      inputSchema: { question: z.string().describe("The question to ask") },
    },
    async ({ question }, { http }) => {
      const userId = http?.authInfo?.extra?.userId as string;
      const user = await clerk.users.getUser(userId);
      const userName = user.firstName ?? user.username ?? undefined;

      const answer = await buildAgent(userName).invoke(question);

      return { content: [{ type: "text", text: answer }] };
    },
  );
});

const authHandler = withMcpAuth(
  handler,
  async (_, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authHandler as GET, authHandler as POST };
