import { ChatWindow } from "@/components/ChatWindow";

export default function Home() {
  return (
    <ChatWindow
      endpoint="api/chat"
      emoji="🏴‍☠️"
      placeholder="Ask the pirate anything..."
      emptyStateComponent={
        <div className="p-4 md:p-8 max-w-[768px] mx-auto flex flex-col gap-4">
          <h1 className="text-2xl">🏴‍☠️ LangChain agent + Clerk MCP</h1>
          <p>
            One LangChain agent, two front doors: this chat window, and an MCP
            server that Claude Code can call on your behalf once Clerk has
            authenticated you.
          </p>
          <p className="text-muted-foreground">
            Work through <code>ISSUE-1.md</code> to build the second door.
          </p>
        </div>
      }
    />
  );
}
