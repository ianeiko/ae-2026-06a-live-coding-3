import { NextRequest, NextResponse } from "next/server";
import { type UIMessage, type TextUIPart, createTextStreamResponse } from "ai";
import { currentUser } from "@clerk/nextjs/server";

import { buildAgent, type ChatTurn } from "@/lib/agent";

const getMessageText = (message: UIMessage) =>
  message.parts
    .filter((p): p is TextUIPart => p.type === "text")
    .map((p) => p.text)
    .join("");

const toChatTurn = (message: UIMessage): ChatTurn => ({
  role: message.role === "user" ? "user" : "assistant",
  content: getMessageText(message),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: UIMessage[] = body.messages ?? [];
    const history = messages.slice(0, -1).map(toChatTurn);
    const question = getMessageText(messages[messages.length - 1]);

    // null when signed out, so the pirate stays anonymous.
    const user = await currentUser();
    const stream = await buildAgent(user?.firstName ?? undefined).stream(
      question,
      history,
    );

    return createTextStreamResponse({ stream });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
