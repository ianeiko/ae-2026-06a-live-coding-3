import { ChatWindow } from "@/components/ChatWindow";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";

export default function Home() {
  const InfoCard = (
    <GuideInfoBox>
      <ul>
        <li className="text-l">
          🏴‍☠️
          <span className="ml-2">
            Patchy is a pirate agent built with{" "}
            <a href="https://js.langchain.com/" target="_blank">
              LangChain.js
            </a>
            . The agent lives in <code>lib/agent.ts</code>.
          </span>
        </li>
        <li className="text-l">
          👇
          <span className="ml-2">
            Try asking e.g. <code>What&apos;s my name?</code> below!
          </span>
        </li>
      </ul>
    </GuideInfoBox>
  );
  return (
    <ChatWindow
      endpoint="api/chat"
      emoji="🏴‍☠️"
      placeholder="I'm an LLM pretending to be a pirate! Ask me about the pirate life!"
      emptyStateComponent={InfoCard}
    />
  );
}
