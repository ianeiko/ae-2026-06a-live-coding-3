import { cn } from "@/utils/cn";
import type { UIMessage, TextUIPart } from "ai";

const getMessageText = (message: UIMessage) =>
  message.parts
    .filter((p): p is TextUIPart => p.type === "text")
    .map((p) => p.text)
    .join("");

export function ChatMessageBubble(props: {
  message: UIMessage;
  aiEmoji?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] max-w-[80%] mb-8 flex",
        props.message.role === "user"
          ? "bg-secondary text-secondary-foreground px-4 py-2 ml-auto"
          : "mr-auto",
      )}
    >
      {props.message.role !== "user" && (
        <div className="mr-4 border bg-secondary -mt-2 rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center">
          {props.aiEmoji}
        </div>
      )}
      <div className="whitespace-pre-wrap flex flex-col">
        <span>{getMessageText(props.message)}</span>
      </div>
    </div>
  );
}
