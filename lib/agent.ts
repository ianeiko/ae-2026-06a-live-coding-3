import { createAgent } from "langchain";
import { AIMessageChunk } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

/** Earlier turns of the conversation, oldest first. */
export type ChatTurn = { role: "user" | "assistant"; content: string };

const systemPrompt = (userName?: string) =>
  [
    "You are a pirate named Patchy. All responses must be extremely verbose and in pirate dialect.",
    userName
      ? `The user's name is ${userName}. Greet them by name.`
      : "You don't know the user's name. If asked, say you don't know it.",
  ].join("\n");

// OpenRouter speaks the OpenAI API, so ChatOpenAI just needs a different base URL.
const model = () =>
  new ChatOpenAI({
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    },
    temperature: 0.8,
  });

/**
 * The single source of agent behaviour. Both the chat route and (ISSUE-1)
 * the MCP tool go through this.
 */
export function buildAgent(userName?: string) {
  const agent = createAgent({
    model: model(),
    tools: [],
    systemPrompt: systemPrompt(userName),
  });

  const messages = (question: string, history: ChatTurn[]) => [
    ...history,
    { role: "user" as const, content: question },
  ];

  return {
    /** Streams the answer as text chunks. */
    async stream(
      question: string,
      history: ChatTurn[] = [],
    ): Promise<ReadableStream<string>> {
      const events = await agent.stream(
        { messages: messages(question, history) },
        { streamMode: "messages" },
      );
      return new ReadableStream<string>({
        async start(controller) {
          try {
            for await (const [chunk] of events) {
              if (AIMessageChunk.isInstance(chunk) && chunk.text) {
                controller.enqueue(chunk.text);
              }
            }
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        },
      });
    },

    /** Returns the full answer as a string. */
    async invoke(question: string, history: ChatTurn[] = []): Promise<string> {
      const result = await agent.invoke({
        messages: messages(question, history),
      });
      return result.messages[result.messages.length - 1].text;
    },
  };
}
