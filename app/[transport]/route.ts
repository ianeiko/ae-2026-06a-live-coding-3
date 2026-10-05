import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { buildAgent } from "@/lib/agent";

const clerk = await clerkClient();

const handler = createMcpHandler((server) => {
  server.registerTool(
    "ask-the-pirate",
    {
      description:
        "Ask Patchy the pirate a question. Patchy knows the signed-in user's name.",
      inputSchema: z.object({
        question: z.string().describe("What to ask the pirate"),
      }),
    },
    async ({ question }, { http }) => {
      // Set by verifyClerkToken from the OAuth token's subject.
      const userId = http?.authInfo?.extra?.userId as string;
      const user = await clerk.users.getUser(userId);
      const answer = await buildAgent(user.firstName ?? undefined).invoke(
        question,
      );

      return { content: [{ type: "text", text: answer }] };
    },
  );
});

const authHandler = withMcpAuth(
  handler,
  async (_, token) => {
    // OAuth access token from Claude Code, not a browser session token.
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authHandler as GET, authHandler as POST };
