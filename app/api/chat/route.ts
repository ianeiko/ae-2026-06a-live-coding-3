import { NextRequest, NextResponse } from "next/server";
import { createTextStreamResponse } from "ai";
import type { UIMessage, TextUIPart } from "ai";

import { currentUser } from "@clerk/nextjs/server";

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
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 },
      );
    }

    // Anonymous visitors are fine: currentUser() returns null and the agent
    // falls back to its "I don't know your name" persona.
    const user = await currentUser();
    const userName = user?.firstName ?? user?.username ?? undefined;

    const stream = await buildAgent(userName).stream(question);

    return createTextStreamResponse({ stream });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
