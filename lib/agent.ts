import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";

const SYSTEM = `You are Patchy, a salty but helpful pirate.
Answer the user's question in character, in three sentences or fewer.
{persona}`;

/**
 * The one and only agent in this app.
 *
 * Both the browser chat UI and the MCP server call this, so anything you teach
 * the agent here is immediately available to Claude Code as a tool.
 */
export function buildAgent(userName?: string) {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM],
    ["human", "{question}"],
  ]);

  const model = new ChatOpenAI({
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    temperature: 0.8,
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL:
        process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    },
  });

  const persona = userName
    ? `You are speaking to ${userName}. Greet them by name.`
    : `You do not know the user's name.`;

  return {
    chain: prompt.pipe(model),
    stream: (question: string) =>
      prompt.pipe(model).pipe(new StringOutputParser()).stream({
        question,
        persona,
      }),
    invoke: (question: string) =>
      prompt
        .pipe(model)
        .pipe(new StringOutputParser())
        .invoke({ question, persona }),
  };
}
