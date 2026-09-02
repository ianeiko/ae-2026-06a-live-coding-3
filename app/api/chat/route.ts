import { NextRequest, NextResponse } from "next/server";
import { createTextStreamResponse } from "ai";
import type { UIMessage, TextUIPart } from "ai";

import { buildAgent } from "@/lib/agent";

/**
 * Browser chat endpoint. Streams the agent's answer back to <ChatWindow />.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: UIMessage[] = body.messages ?? [];
    const last = messages[messages.length - 1];

    const question = (last?.parts ?? [])
      .filter((p): p is TextUIPart => p.type === "text")
      .map((p) => p.text)
      .join("");

    if (!question) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    // ISSUE-1: pass the signed-in Clerk user's name in here.
    const stream = await buildAgent().stream(question);

    return createTextStreamResponse({ stream });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
